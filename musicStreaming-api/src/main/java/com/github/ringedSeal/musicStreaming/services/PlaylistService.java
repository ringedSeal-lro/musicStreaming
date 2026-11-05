package com.github.ringedSeal.musicStreaming.services;

import com.github.ringedSeal.musicStreaming.config.EvictCaches;
import com.github.ringedSeal.musicStreaming.dto.*;
import com.github.ringedSeal.musicStreaming.exceptions.BadRequestException;
import com.github.ringedSeal.musicStreaming.exceptions.ConflictException;
import com.github.ringedSeal.musicStreaming.exceptions.NotFoundException;
import com.github.ringedSeal.musicStreaming.models.Library;
import com.github.ringedSeal.musicStreaming.models.Playlist;
import com.github.ringedSeal.musicStreaming.models.PlaylistSong;
import com.github.ringedSeal.musicStreaming.models.Song;
import com.github.ringedSeal.musicStreaming.repositories.PlaylistRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class PlaylistService {

    private final PlaylistRepository playlistRepository;
    private final LibraryService libraryService;
    private final SongService songService;
    private final TagService tagService;
    private final DtoMapper mapper;

    public PlaylistService(PlaylistRepository playlistRepository, LibraryService libraryService,
                           SongService songService, TagService tagService, DtoMapper mapper) {
        this.playlistRepository = playlistRepository;
        this.libraryService = libraryService;
        this.songService = songService;
        this.tagService = tagService;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public PlaylistDTO find(Long id) {
        return mapper.playlist(get(id));
    }

    @EvictCaches
    @Transactional
    public PlaylistDTO create(Long libraryId, CreatePlaylistRequest request) {
        Library library = libraryService.get(libraryId);
        Playlist parent = null;
        if (request.parentId() != null) {
            parent = get(request.parentId());
            requireSameLibrary(parent, libraryId);
        }
        Playlist playlist = new Playlist(request.name().trim(), library, parent, nextPosition(libraryId, parent));
        if (parent != null) {
            parent.getChildren().add(playlist);
        }
        return mapper.playlist(playlistRepository.save(playlist));
    }

    /** Renomear e/ou mover. */
    @EvictCaches
    @Transactional
    public PlaylistDTO update(Long id, UpdatePlaylistRequest request) {
        Playlist playlist = get(id);
        if (request.getName() != null) {
            playlist.setName(request.getName().trim());
        }
        if (request.isParentIdPresent()) {
            move(playlist, request.getParentId());
        }
        playlistRepository.flush();
        return mapper.playlist(playlist);
    }

    private void move(Playlist playlist, Long newParentId) {
        Long currentId = playlist.getParent() == null ? null : playlist.getParent().getId();
        if (Objects.equals(currentId, newParentId)) {
            return;
        }

        Playlist newParent = null;
        if (newParentId != null) {
            newParent = get(newParentId);
            requireSameLibrary(newParent, playlist.getLibrary().getId());
            for (Playlist p = newParent; p != null; p = p.getParent()) {
                if (p.getId().equals(playlist.getId())) {
                    throw new ConflictException("Uma playlist não pode ficar dentro dela mesma ou de uma sub-playlist sua");
                }
            }
        }

        int position = nextPosition(playlist.getLibrary().getId(), newParent);
        // Só troca a FK. A coleção children do pai antigo não é tocada de propósito:
        // removê-la de lá dispararia o orphanRemoval e apagaria a playlist.
        playlist.setParent(newParent);
        playlist.setPosition(position);
        if (newParent != null) {
            newParent.getChildren().add(playlist);
        }
    }

    @EvictCaches
    @Transactional
    public void delete(Long id) {
        Playlist playlist = get(id);
        Playlist parent = playlist.getParent();
        if (parent != null) {
            parent.getChildren().remove(playlist); // orphanRemoval apaga em cascata
        } else {
            playlistRepository.delete(playlist);
        }
    }

    @Transactional(readOnly = true)
    public List<SongDTO> songs(Long id) {
        return get(id).getItems().stream().map(i -> mapper.song(i.getSong())).toList();
    }

    @EvictCaches
    @Transactional
    public List<SongDTO> addSongs(Long id, SongIdsRequest request) {
        Playlist playlist = get(id);
        for (Long songId : new LinkedHashSet<>(request.songIds())) {
            Song song = songService.get(songId);
            if (!playlist.contains(song)) {
                playlist.addSong(song);
            }
        }
        return playlist.getItems().stream().map(i -> mapper.song(i.getSong())).toList();
    }

    @EvictCaches
    @Transactional
    public void removeSong(Long id, Long songId) {
        Playlist playlist = get(id);
        boolean removed = playlist.getItems().removeIf(i -> i.getSong().getId().equals(songId));
        if (!removed) {
            throw new NotFoundException("Música " + songId + " não está na playlist " + id);
        }
        playlist.renumberItems();
    }

    /** Recebe todos os ids da playlist na nova ordem. */
    @EvictCaches
    @Transactional
    public List<SongDTO> reorder(Long id, SongIdsRequest request) {
        Playlist playlist = get(id);
        Map<Long, PlaylistSong> bySong = playlist.getItems().stream()
                .collect(Collectors.toMap(i -> i.getSong().getId(), Function.identity()));
        List<Long> order = request.songIds();
        if (order.size() != bySong.size() || !bySong.keySet().equals(new HashSet<>(order))) {
            throw new BadRequestException("songIds deve conter exatamente as músicas da playlist, sem repetir");
        }
        for (int i = 0; i < order.size(); i++) {
            bySong.get(order.get(i)).setPosition(i);
        }
        playlist.getItems().sort(Comparator.comparingInt(PlaylistSong::getPosition));
        return playlist.getItems().stream().map(i -> mapper.song(i.getSong())).toList();
    }

    @EvictCaches
    @Transactional
    public PlaylistDTO addTag(Long id, TagRefRequest request) {
        Playlist playlist = get(id);
        playlist.getTags().add(tagService.resolve(request));
        playlistRepository.flush();
        return mapper.playlist(playlist);
    }

    @EvictCaches
    @Transactional
    public void removeTag(Long id, Long tagId) {
        Playlist playlist = get(id);
        if (!playlist.getTags().removeIf(t -> t.getId().equals(tagId))) {
            throw new NotFoundException("Tag " + tagId + " não está na playlist " + id);
        }
    }

    public Playlist get(Long id) {
        return playlistRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Playlist não encontrada: " + id));
    }

    private int nextPosition(Long libraryId, Playlist parent) {
        return parent == null
                ? playlistRepository.nextRootPosition(libraryId)
                : parent.getChildren().stream().mapToInt(Playlist::getPosition).max().orElse(-1) + 1;
    }

    private static void requireSameLibrary(Playlist playlist, Long libraryId) {
        if (!playlist.getLibrary().getId().equals(libraryId)) {
            throw new ConflictException("A playlist " + playlist.getId() + " pertence a outra biblioteca");
        }
    }
}
