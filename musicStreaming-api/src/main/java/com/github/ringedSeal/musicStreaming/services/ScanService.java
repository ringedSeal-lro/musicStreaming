package com.github.ringedSeal.musicStreaming.services;

import com.github.ringedSeal.musicStreaming.config.EvictCaches;
import com.github.ringedSeal.musicStreaming.dto.ScanResultDTO;
import com.github.ringedSeal.musicStreaming.models.*;
import com.github.ringedSeal.musicStreaming.repositories.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;
import java.util.stream.Stream;

/**
 * Escaneia music.root e atualiza o banco.
 * <ul>
 *   <li>Pastas viram {@link Folder}; arquivos de áudio viram {@link Song} + {@link SongLocation}.</li>
 *   <li>No primeiro scan cria a biblioteca padrão, com uma playlist por pasta.</li>
 *   <li>Scans seguintes só acrescentam: pastas novas viram playlists novas e arquivos novos entram na
 *       playlist da pasta deles. Edições do usuário nunca são desfeitas.</li>
 * </ul>
 */
@Service
public class ScanService {

    public static final String DEFAULT_LIBRARY_NAME = "Biblioteca padrão";

    private final MusicRoot musicRoot;
    private final ContentHasher hasher;
    private final AudioMetadataReader metadataReader;
    private final FolderRepository folderRepository;
    private final SongRepository songRepository;
    private final SongLocationRepository locationRepository;
    private final LibraryRepository libraryRepository;
    private final PlaylistRepository playlistRepository;
    private final SettingsService settingsService;
    private final FilesystemLock fsLock;
    private final TransactionTemplate tx;

    public ScanService(MusicRoot musicRoot, ContentHasher hasher, AudioMetadataReader metadataReader,
                       FolderRepository folderRepository, SongRepository songRepository,
                       SongLocationRepository locationRepository, LibraryRepository libraryRepository,
                       PlaylistRepository playlistRepository, SettingsService settingsService,
                       FilesystemLock fsLock, TransactionTemplate tx) {
        this.musicRoot = musicRoot;
        this.hasher = hasher;
        this.metadataReader = metadataReader;
        this.folderRepository = folderRepository;
        this.songRepository = songRepository;
        this.locationRepository = locationRepository;
        this.libraryRepository = libraryRepository;
        this.playlistRepository = playlistRepository;
        this.settingsService = settingsService;
        this.fsLock = fsLock;
        this.tx = tx;
    }

    /** Scan completo, organizando novidades na biblioteca padrão. */
    @EvictCaches
    public ScanResultDTO scan() {
        fsLock.lock();
        try {
            return scanLocked(true);
        } finally {
            fsLock.unlock();
        }
    }

    /**
     * Scan usado pelo sync (que já segura o lock): atualiza pastas e arquivos sem criar playlists,
     * já que as pastas novas vieram da própria biblioteca sincronizada.
     */
    ScanResultDTO scanLocked(boolean organizeIntoDefaultLibrary) {
        Path root = musicRoot.requireRoot();
        DiskSnapshot disk = readDisk(root);
        return tx.execute(status -> apply(disk, organizeIntoDefaultLibrary));
    }

    // ------------------------------------------------------------------

    private record DiskFile(Path absolute, String relative, long size, long lastModified) {}

    private record DiskSnapshot(List<String> directories, List<DiskFile> files) {}

    private DiskSnapshot readDisk(Path root) {
        List<String> dirs = new ArrayList<>();
        List<DiskFile> files = new ArrayList<>();
        try (Stream<Path> walk = Files.walk(root)) {
            for (Path p : (Iterable<Path>) walk::iterator) {
                if (p.equals(root) || isHidden(root, p)) {
                    continue;
                }
                String rel = musicRoot.relativize(p);
                if (Files.isDirectory(p)) {
                    dirs.add(rel);
                } else if (Files.isRegularFile(p) && MusicRoot.isAudio(p)) {
                    files.add(new DiskFile(p, rel, Files.size(p), Files.getLastModifiedTime(p).toMillis()));
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao ler a pasta raiz", e);
        }
        dirs.sort(Comparator.comparingInt(ScanService::depth).thenComparing(Comparator.naturalOrder()));
        files.sort(Comparator.comparing(DiskFile::relative));
        return new DiskSnapshot(dirs, files);
    }

    /** Ignora tudo dentro de pastas/arquivos que começam com '.' (ex.: .musicstreaming). */
    private static boolean isHidden(Path root, Path p) {
        for (Path part : root.relativize(p)) {
            if (part.toString().startsWith(".")) {
                return true;
            }
        }
        return false;
    }

    private static int depth(String rel) {
        return (int) rel.chars().filter(c -> c == '/').count();
    }

    private ScanResultDTO apply(DiskSnapshot disk, boolean organize) {
        int added = 0, updated = 0, missing = 0, foldersCreated = 0, foldersRemoved = 0, playlistsCreated = 0;

        // ---- pastas ----
        Map<String, Folder> folders = new HashMap<>();
        folderRepository.findAll().forEach(f -> folders.put(f.getPath(), f));
        List<Folder> newFolders = new ArrayList<>();
        Set<String> seenDirs = new HashSet<>(disk.directories());

        for (String rel : disk.directories()) {
            if (folders.containsKey(rel)) {
                continue;
            }
            Folder parent = folders.get(MusicRoot.parentOf(rel));
            String name = rel.substring(rel.lastIndexOf('/') + 1);
            Folder folder = folderRepository.save(new Folder(name, rel, parent));
            folders.put(rel, folder);
            newFolders.add(folder);
            foldersCreated++;
        }

        // ---- arquivos ----
        Map<String, SongLocation> locations = new HashMap<>();
        locationRepository.findAll().forEach(l -> locations.put(l.getPath(), l));
        Map<String, Song> songsByHash = new HashMap<>();
        Set<String> seenFiles = new HashSet<>();
        List<SongLocation> newLocations = new ArrayList<>();
        Set<Song> touched = new HashSet<>();

        for (DiskFile file : disk.files()) {
            seenFiles.add(file.relative());
            SongLocation location = locations.get(file.relative());

            if (location != null
                    && location.getSizeBytes() == file.size()
                    && location.getLastModified() == file.lastModified()) {
                if (!location.getSong().isAvailable()) {
                    location.getSong().setAvailable(true);
                    updated++;
                }
                continue;
            }

            String hash = hasher.hash(file.absolute());
            Song song = songsByHash.computeIfAbsent(hash, h -> songRepository.findByContentHash(h).orElse(null));
            if (song == null) {
                AudioMetadataReader.Metadata meta = metadataReader.read(file.absolute());
                song = songRepository.save(new Song(hash, meta.title(), meta.artist(), meta.album(),
                        meta.albumArtist(), meta.durationSec()));
                songsByHash.put(hash, song);
                added++;
            } else if (!song.isAvailable()) {
                song.setAvailable(true);
                updated++;
            }

            if (location != null && location.getSong().getId().equals(song.getId())) {
                location.updateFileInfo(file.size(), file.lastModified());
                updated++;
                continue;
            }
            if (location != null) {
                // mesmo caminho, conteúdo diferente: o arquivo antigo "sumiu" e um novo apareceu
                Song previous = location.getSong();
                previous.getLocations().remove(location);
                locationRepository.delete(location);
                locationRepository.flush();
                locations.remove(file.relative());
                touched.add(previous);
                updated++;
            }
            Folder folder = folders.get(MusicRoot.parentOf(file.relative()));
            String filename = file.absolute().getFileName().toString();
            SongLocation created = new SongLocation(song, folder, file.relative(), filename,
                    file.size(), file.lastModified());
            song.getLocations().add(created);
            locationRepository.save(created);
            newLocations.add(created);
        }

        // ---- arquivos que sumiram ----
        for (SongLocation location : locations.values()) {
            if (!seenFiles.contains(location.getPath())) {
                Song song = location.getSong();
                song.getLocations().remove(location);
                locationRepository.delete(location);
                touched.add(song);
            }
        }
        for (Song song : touched) {
            if (song.getLocations().isEmpty() && song.isAvailable()) {
                song.setAvailable(false);
                missing++;
            }
        }

        // ---- pastas que sumiram (mais profundas primeiro) ----
        List<Folder> gone = folders.values().stream()
                .filter(f -> !seenDirs.contains(f.getPath()))
                .sorted(Comparator.comparingInt(Folder::depth).reversed())
                .toList();
        for (Folder folder : gone) {
            playlistRepository.clearSourceFolder(folder);
            folderRepository.delete(folder);
            foldersRemoved++;
        }
        locationRepository.flush();

        // ---- biblioteca padrão ----
        Optional<Library> existingDefault = libraryRepository.findFirstByDefaultLibraryTrue();
        Library library = existingDefault.orElseGet(
                () -> libraryRepository.save(new Library(DEFAULT_LIBRARY_NAME, true)));

        if (organize || existingDefault.isEmpty()) {
            playlistsCreated = organize(library, existingDefault.isEmpty()
                    ? folders.values().stream().filter(f -> seenDirs.contains(f.getPath())).toList()
                    : newFolders, newLocations);
        }

        settingsService.put(SettingsService.LAST_SCAN_AT, Instant.now().toString());
        return new ScanResultDTO(added, updated, missing, foldersCreated, foldersRemoved, playlistsCreated);
    }

    /** Cria playlists para as pastas novas e coloca os arquivos novos na playlist da pasta deles. */
    private int organize(Library library, List<Folder> foldersToCreate, List<SongLocation> newLocations) {
        Map<Long, Playlist> byFolderId = new HashMap<>();
        int created = 0;

        List<Folder> ordered = foldersToCreate.stream()
                .sorted(Comparator.comparingInt(Folder::depth).thenComparing(Folder::getPath))
                .toList();
        for (Folder folder : ordered) {
            if (playlistFor(library, folder, byFolderId) != null) {
                continue;
            }
            Playlist parent = folder.getParent() == null ? null : playlistFor(library, folder.getParent(), byFolderId);
            int position = parent == null
                    ? playlistRepository.nextRootPosition(library.getId())
                    : parent.getChildren().size();
            Playlist playlist = new Playlist(folder.getName(), library, parent, position);
            playlist.setSourceFolder(folder);
            if (parent != null) {
                parent.getChildren().add(playlist);
            }
            playlistRepository.saveAndFlush(playlist);
            byFolderId.put(folder.getId(), playlist);
            created++;
        }

        for (SongLocation location : newLocations) {
            if (location.getFolder() == null) {
                continue; // arquivos na raiz ficam "sem playlist"
            }
            Playlist playlist = playlistFor(library, location.getFolder(), byFolderId);
            if (playlist != null && !playlist.contains(location.getSong())) {
                playlist.addSong(location.getSong());
            }
        }
        return created;
    }

    private Playlist playlistFor(Library library, Folder folder, Map<Long, Playlist> cache) {
        return cache.computeIfAbsent(folder.getId(),
                id -> playlistRepository.findFirstByLibraryAndSourceFolder(library, folder).orElse(null));
    }
}
