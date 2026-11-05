package com.github.ringedSeal.musicStreaming.services;

import com.github.ringedSeal.musicStreaming.config.EvictCaches;
import com.github.ringedSeal.musicStreaming.dto.ScanResultDTO;
import com.github.ringedSeal.musicStreaming.dto.SyncOperationDTO;
import com.github.ringedSeal.musicStreaming.dto.SyncOperationDTO.Type;
import com.github.ringedSeal.musicStreaming.dto.SyncResultDTO;
import com.github.ringedSeal.musicStreaming.models.Library;
import com.github.ringedSeal.musicStreaming.models.Playlist;
import com.github.ringedSeal.musicStreaming.models.PlaylistSong;
import com.github.ringedSeal.musicStreaming.models.Song;
import com.github.ringedSeal.musicStreaming.models.SongLocation;
import com.github.ringedSeal.musicStreaming.repositories.FolderRepository;
import com.github.ringedSeal.musicStreaming.repositories.PlaylistRepository;
import com.github.ringedSeal.musicStreaming.repositories.PlaylistSongRepository;
import com.github.ringedSeal.musicStreaming.repositories.SongRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import java.util.stream.Stream;

/**
 * Faz a pasta real ficar igual a uma biblioteca.
 * <ul>
 *   <li>Playlist raiz → pasta na raiz; sub-playlist → subpasta.</li>
 *   <li>Música em uma playlist → arquivo na pasta dela (movido).</li>
 *   <li>Música em N playlists → um arquivo por pasta (hardlink, ou cópia se não der).</li>
 *   <li>Música fora de playlists → raiz.</li>
 *   <li>Nenhum arquivo é apagado: cópias sobrando vão para {@value #DUPLICATES_DIR}.</li>
 *   <li>Pastas que ficarem vazias são removidas.</li>
 * </ul>
 */
@Service
public class SyncService {

    public static final String DUPLICATES_DIR = ".musicstreaming/duplicates";

    private static final Logger log = LoggerFactory.getLogger(SyncService.class);

    private final MusicRoot musicRoot;
    private final LibraryService libraryService;
    private final PlaylistRepository playlistRepository;
    private final PlaylistSongRepository playlistSongRepository;
    private final SongRepository songRepository;
    private final FolderRepository folderRepository;
    private final ScanService scanService;
    private final SettingsService settingsService;
    private final FilesystemLock fsLock;
    private final TransactionTemplate tx;

    public SyncService(MusicRoot musicRoot, LibraryService libraryService, PlaylistRepository playlistRepository,
                       PlaylistSongRepository playlistSongRepository, SongRepository songRepository,
                       FolderRepository folderRepository, ScanService scanService, SettingsService settingsService,
                       FilesystemLock fsLock, TransactionTemplate tx) {
        this.musicRoot = musicRoot;
        this.libraryService = libraryService;
        this.playlistRepository = playlistRepository;
        this.playlistSongRepository = playlistSongRepository;
        this.songRepository = songRepository;
        this.folderRepository = folderRepository;
        this.scanService = scanService;
        this.settingsService = settingsService;
        this.fsLock = fsLock;
        this.tx = tx;
    }

    private record Plan(List<SyncOperationDTO> operations, Map<Long, String> playlistDirs, boolean defaultLibrary) {}

    @EvictCaches
    public SyncResultDTO sync(Long libraryId, boolean dryRun) {
        fsLock.lock();
        try {
            Path root = musicRoot.requireRoot();
            // sincroniza o banco com o disco antes de planejar
            scanService.scanLocked(false);
            Plan plan = tx.execute(status -> buildPlan(libraryId, root));
            if (dryRun) {
                return new SyncResultDTO(libraryId, true, plan.operations(), 0, null, null);
            }

            int applied = 0;
            String error = null;
            for (SyncOperationDTO op : plan.operations()) {
                try {
                    execute(op);
                    applied++;
                } catch (IOException | RuntimeException e) {
                    error = op.type() + " " + op.source() + " -> " + op.target() + ": " + e.getMessage();
                    log.error("Sync interrompido em {}", error, e);
                    break;
                }
            }

            ScanResultDTO scan = scanService.scanLocked(false);
            if (plan.defaultLibrary()) {
                tx.executeWithoutResult(status -> bindSourceFolders(plan.playlistDirs()));
            }
            settingsService.put(SettingsService.LAST_SYNC_AT, Instant.now().toString());
            return new SyncResultDTO(libraryId, false, plan.operations(), applied, error, scan);
        } finally {
            fsLock.unlock();
        }
    }

    // ------------------------------------------------------------------ plano

    private Plan buildPlan(Long libraryId, Path root) {
        Library library = libraryService.get(libraryId);

        // 1. pasta de cada playlist
        Map<Long, List<Playlist>> childrenByParent = new HashMap<>();
        for (Playlist p : playlistRepository.findByLibraryIdOrderByPosition(libraryId)) {
            Long parentId = p.getParent() == null ? null : p.getParent().getId();
            childrenByParent.computeIfAbsent(parentId, k -> new ArrayList<>()).add(p);
        }
        Map<Long, String> playlistDirs = new LinkedHashMap<>();
        assignDirectories(null, "", childrenByParent, playlistDirs);
        Set<String> desiredDirs = new HashSet<>(playlistDirs.values());

        // 2. pastas de destino de cada música
        Map<Long, LinkedHashSet<String>> targets = new HashMap<>();
        for (PlaylistSong item : playlistSongRepository.findAllInLibrary(libraryId)) {
            targets.computeIfAbsent(item.getSong().getId(), k -> new LinkedHashSet<>())
                    .add(playlistDirs.get(item.getPlaylist().getId()));
        }

        // 3. estado atual do disco
        DiskState disk = readDisk(root);
        Set<String> occupied = new HashSet<>(disk.files());
        List<SyncOperationDTO> ops = new ArrayList<>();

        desiredDirs.stream()
                .filter(d -> !disk.directories().contains(d))
                .sorted(Comparator.comparingInt(SyncService::depth).thenComparing(Comparator.naturalOrder()))
                .forEach(d -> ops.add(new SyncOperationDTO(Type.MKDIR, null, d)));

        // 4. arquivos
        List<Song> songs = songRepository.findAll(org.springframework.data.domain.Sort.by("id"));
        for (Song song : songs) {
            if (!song.isAvailable() || song.getLocations().isEmpty()) {
                continue;
            }
            Set<String> wanted = targets.getOrDefault(song.getId(), new LinkedHashSet<>(List.of("")));
            planSong(song, wanted, occupied, ops);
        }

        // 5. pastas que ficarem vazias
        Set<String> remainingDirs = new HashSet<>(disk.directories());
        remainingDirs.addAll(desiredDirs);
        disk.directories().stream()
                .filter(d -> !desiredDirs.contains(d))
                .sorted(Comparator.comparingInt(SyncService::depth).reversed().thenComparing(Comparator.naturalOrder()))
                .forEach(dir -> {
                    String prefix = dir + "/";
                    boolean hasFiles = occupied.stream().anyMatch(f -> f.startsWith(prefix));
                    boolean hasDirs = remainingDirs.stream().anyMatch(d -> d.startsWith(prefix));
                    if (!hasFiles && !hasDirs) {
                        ops.add(new SyncOperationDTO(Type.RMDIR, null, dir));
                        remainingDirs.remove(dir);
                    }
                });

        return new Plan(ops, playlistDirs, library.isDefaultLibrary());
    }

    private void planSong(Song song, Set<String> wanted, Set<String> occupied, List<SyncOperationDTO> ops) {
        Set<String> satisfied = new HashSet<>();
        List<String> kept = new ArrayList<>();
        Deque<SongLocation> spares = new ArrayDeque<>();

        for (SongLocation location : song.getLocations()) {
            String dir = location.directory();
            if (wanted.contains(dir) && satisfied.add(dir)) {
                kept.add(location.getPath());
            } else {
                spares.add(location);
            }
        }

        String copySource = kept.isEmpty() ? null : kept.get(0);
        for (String dir : wanted) {
            if (satisfied.contains(dir)) {
                continue;
            }
            if (!spares.isEmpty()) {
                SongLocation spare = spares.poll();
                String target = freePath(dir, spare.getFilename(), occupied);
                move(spare.getPath(), target, occupied, ops);
                if (copySource == null) {
                    copySource = target;
                }
            } else {
                String target = freePath(dir, fileName(copySource), occupied);
                ops.add(new SyncOperationDTO(Type.LINK, copySource, target));
                occupied.add(target);
            }
        }

        // cópias que sobraram não são apagadas: vão para a pasta oculta de duplicadas
        for (SongLocation spare : spares) {
            move(spare.getPath(), freePath(DUPLICATES_DIR, spare.getFilename(), occupied), occupied, ops);
        }
    }

    private static void move(String source, String target, Set<String> occupied, List<SyncOperationDTO> ops) {
        ops.add(new SyncOperationDTO(Type.MOVE, source, target));
        occupied.remove(source);
        occupied.add(target);
    }

    /** "dir/nome.mp3", ou "dir/nome (2).mp3" etc. se já estiver ocupado. */
    private static String freePath(String dir, String filename, Set<String> occupied) {
        String candidate = MusicRoot.join(dir, filename);
        int dot = filename.lastIndexOf('.');
        String base = dot <= 0 ? filename : filename.substring(0, dot);
        String ext = dot <= 0 ? "" : filename.substring(dot);
        for (int n = 2; occupied.contains(candidate); n++) {
            candidate = MusicRoot.join(dir, base + " (" + n + ")" + ext);
        }
        return candidate;
    }

    private void assignDirectories(Long parentId, String parentDir, Map<Long, List<Playlist>> childrenByParent,
                                   Map<Long, String> result) {
        Set<String> used = new HashSet<>();
        List<Playlist> siblings = new ArrayList<>(childrenByParent.getOrDefault(parentId, List.of()));
        siblings.sort(Comparator.comparingInt(Playlist::getPosition).thenComparing(Playlist::getId));
        for (Playlist p : siblings) {
            String base = sanitize(p.getName());
            String name = base;
            for (int n = 2; !used.add(name.toLowerCase(Locale.ROOT)); n++) {
                name = base + " (" + n + ")";
            }
            String dir = MusicRoot.join(parentDir, name);
            result.put(p.getId(), dir);
            assignDirectories(p.getId(), dir, childrenByParent, result);
        }
    }

    static String sanitize(String name) {
        String clean = name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        clean = clean.replaceAll("^\\.+", "").replaceAll("[. ]+$", "").trim();
        if (clean.length() > 120) {
            clean = clean.substring(0, 120).trim();
        }
        return clean.isEmpty() ? "playlist" : clean;
    }

    private static String fileName(String relative) {
        return relative.substring(relative.lastIndexOf('/') + 1);
    }

    private static int depth(String rel) {
        return (int) rel.chars().filter(c -> c == '/').count();
    }

    private record DiskState(Set<String> directories, Set<String> files) {}

    private DiskState readDisk(Path root) {
        Set<String> dirs = new HashSet<>();
        Set<String> files = new HashSet<>();
        try (Stream<Path> walk = Files.walk(root)) {
            for (Path p : (Iterable<Path>) walk::iterator) {
                if (p.equals(root)) {
                    continue;
                }
                String rel = musicRoot.relativize(p);
                if (rel.startsWith(".") || rel.contains("/.")) {
                    if (Files.isRegularFile(p)) {
                        files.add(rel); // conta como ocupado (ex.: duplicadas), mas pasta oculta nunca é removida
                    }
                    continue;
                }
                if (Files.isDirectory(p)) {
                    dirs.add(rel);
                } else {
                    files.add(rel);
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao ler a pasta raiz", e);
        }
        return new DiskState(dirs, files);
    }

    // ------------------------------------------------------------------ execução

    private void execute(SyncOperationDTO op) throws IOException {
        Path target = musicRoot.resolve(op.target());
        switch (op.type()) {
            case MKDIR -> Files.createDirectories(target);
            case MOVE -> {
                Files.createDirectories(target.getParent());
                Files.move(musicRoot.resolve(op.source()), target);
            }
            case LINK -> {
                Files.createDirectories(target.getParent());
                Path source = musicRoot.resolve(op.source());
                try {
                    Files.createLink(target, source);
                } catch (UnsupportedOperationException | IOException e) {
                    Files.copy(source, target, StandardCopyOption.COPY_ATTRIBUTES);
                }
            }
            case RMDIR -> {
                if (Files.isDirectory(target)) {
                    try (Stream<Path> entries = Files.list(target)) {
                        if (entries.findAny().isEmpty()) {
                            Files.delete(target);
                        }
                    }
                }
            }
        }
    }

    /** Na biblioteca padrão, liga cada playlist à pasta que acabou de representar. */
    private void bindSourceFolders(Map<Long, String> playlistDirs) {
        playlistDirs.forEach((playlistId, dir) -> playlistRepository.findById(playlistId).ifPresent(
                p -> p.setSourceFolder(folderRepository.findByPath(dir).orElse(null))));
    }
}
