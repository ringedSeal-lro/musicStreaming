package com.github.ringedSeal.musicStreaming.services;

import com.github.ringedSeal.musicStreaming.config.CacheConfig;
import com.github.ringedSeal.musicStreaming.config.EvictCaches;
import com.github.ringedSeal.musicStreaming.dto.*;
import com.github.ringedSeal.musicStreaming.exceptions.ConflictException;
import com.github.ringedSeal.musicStreaming.exceptions.NotFoundException;
import com.github.ringedSeal.musicStreaming.models.Library;
import com.github.ringedSeal.musicStreaming.models.Playlist;
import com.github.ringedSeal.musicStreaming.models.PlaylistSong;
import com.github.ringedSeal.musicStreaming.repositories.LibraryRepository;
import com.github.ringedSeal.musicStreaming.repositories.PlaylistRepository;
import com.github.ringedSeal.musicStreaming.repositories.PlaylistSongRepository;
import com.github.ringedSeal.musicStreaming.repositories.SongRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class LibraryService {

    private final LibraryRepository libraryRepository;
    private final PlaylistRepository playlistRepository;
    private final PlaylistSongRepository playlistSongRepository;
    private final SongRepository songRepository;
    private final DtoMapper mapper;

    public LibraryService(LibraryRepository libraryRepository, PlaylistRepository playlistRepository,
                          PlaylistSongRepository playlistSongRepository, SongRepository songRepository,
                          DtoMapper mapper) {
        this.libraryRepository = libraryRepository;
        this.playlistRepository = playlistRepository;
        this.playlistSongRepository = playlistSongRepository;
        this.songRepository = songRepository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<LibraryDTO> list() {
        return libraryRepository.findAllByOrderByDefaultLibraryDescNameAsc().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public LibraryDTO find(Long id) {
        return toDto(get(id));
    }

    @EvictCaches
    @Transactional
    public LibraryDTO create(String name) {
        return toDto(libraryRepository.save(new Library(name.trim(), false)));
    }

    @EvictCaches
    @Transactional
    public LibraryDTO rename(Long id, String name) {
        Library library = get(id);
        library.setName(name.trim());
        return toDto(library);
    }

    @EvictCaches
    @Transactional
    public void delete(Long id) {
        Library library = get(id);
        if (library.isDefaultLibrary()) {
            throw new ConflictException("A biblioteca padrão não pode ser apagada");
        }
        // remove as raízes; filhos, itens e tags caem em cascata
        playlistRepository.deleteAll(playlistRepository.findByLibraryIdAndParentIsNullOrderByPosition(id));
        playlistRepository.flush();
        libraryRepository.delete(library);
    }

    @Transactional(readOnly = true)
    public List<PlaylistSummaryDTO> rootPlaylists(Long id) {
        get(id);
        return playlistRepository.findByLibraryIdAndParentIsNullOrderByPosition(id).stream()
                .map(mapper::playlistSummary).toList();
    }

    /** Árvore completa: playlists aninhadas com suas músicas + músicas sem playlist. */
    @Cacheable(cacheNames = CacheConfig.LIBRARY_TREE, key = "#id")
    @Transactional(readOnly = true)
    public LibraryTreeDTO tree(Long id) {
        Library library = get(id);
        List<Playlist> playlists = playlistRepository.findByLibraryIdOrderByPosition(id);

        Map<Long, List<SongDTO>> songsByPlaylist = new HashMap<>();
        Map<Long, SongDTO> songCache = new HashMap<>();
        for (PlaylistSong item : playlistSongRepository.findAllInLibrary(id)) {
            SongDTO dto = songCache.computeIfAbsent(item.getSong().getId(), k -> mapper.song(item.getSong()));
            songsByPlaylist.computeIfAbsent(item.getPlaylist().getId(), k -> new ArrayList<>()).add(dto);
        }

        Map<Long, List<Playlist>> childrenByParent = new HashMap<>();
        for (Playlist p : playlists) {
            Long parentId = p.getParent() == null ? null : p.getParent().getId();
            childrenByParent.computeIfAbsent(parentId, k -> new ArrayList<>()).add(p);
        }

        List<PlaylistTreeDTO> roots = buildLevel(null, childrenByParent, songsByPlaylist);
        List<SongDTO> unorganized = songRepository.findUnorganized(id).stream().map(mapper::song).toList();
        return new LibraryTreeDTO(library.getId(), library.getName(), library.isDefaultLibrary(), roots, unorganized);
    }

    private List<PlaylistTreeDTO> buildLevel(Long parentId, Map<Long, List<Playlist>> childrenByParent,
                                             Map<Long, List<SongDTO>> songsByPlaylist) {
        return childrenByParent.getOrDefault(parentId, List.of()).stream()
                .map(p -> new PlaylistTreeDTO(
                        p.getId(),
                        parentId,
                        p.getName(),
                        p.getPosition(),
                        mapper.tags(p.getTags()),
                        songsByPlaylist.getOrDefault(p.getId(), List.of()),
                        buildLevel(p.getId(), childrenByParent, songsByPlaylist)))
                .toList();
    }

    public Library get(Long id) {
        return libraryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Biblioteca não encontrada: " + id));
    }

    private LibraryDTO toDto(Library library) {
        return mapper.library(library, playlistRepository.countByLibraryId(library.getId()));
    }
}
