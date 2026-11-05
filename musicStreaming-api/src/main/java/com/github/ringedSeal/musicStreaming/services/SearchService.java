package com.github.ringedSeal.musicStreaming.services;

import com.github.ringedSeal.musicStreaming.config.CacheConfig;
import com.github.ringedSeal.musicStreaming.dto.PlaylistSummaryDTO;
import com.github.ringedSeal.musicStreaming.dto.SearchResultDTO;
import com.github.ringedSeal.musicStreaming.dto.SongDTO;
import com.github.ringedSeal.musicStreaming.models.Playlist;
import com.github.ringedSeal.musicStreaming.models.Song;
import com.github.ringedSeal.musicStreaming.repositories.PlaylistRepository;
import com.github.ringedSeal.musicStreaming.repositories.SongRepository;
import com.github.ringedSeal.musicStreaming.util.Text;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Busca com prioridade: primeiro o que tem o termo no nome (título/artista/álbum),
 * depois o que só tem uma tag correspondente.
 */
@Service
public class SearchService {

    private static final int LIMIT = 50;

    private final SongRepository songRepository;
    private final PlaylistRepository playlistRepository;
    private final DtoMapper mapper;

    public SearchService(SongRepository songRepository, PlaylistRepository playlistRepository, DtoMapper mapper) {
        this.songRepository = songRepository;
        this.playlistRepository = playlistRepository;
        this.mapper = mapper;
    }

    @Cacheable(cacheNames = CacheConfig.SEARCH, key = "#query + '|' + #libraryId")
    @Transactional(readOnly = true)
    public SearchResultDTO search(String query, Long libraryId) {
        String term = Text.normalize(query);
        if (term.isEmpty()) {
            return new SearchResultDTO(query, List.of(), List.of());
        }
        String escaped = Text.escapeLike(term);
        String starts = escaped + "%";
        String contains = "%" + escaped + "%";
        Pageable limit = PageRequest.of(0, LIMIT);

        Map<Long, Song> songs = new LinkedHashMap<>();
        songRepository.searchByText(term, starts, contains, limit).forEach(s -> songs.put(s.getId(), s));
        songRepository.searchByTag(contains, limit).forEach(s -> songs.putIfAbsent(s.getId(), s));

        Map<Long, Playlist> playlists = new LinkedHashMap<>();
        playlistRepository.searchByName(term, starts, contains, libraryId, limit)
                .forEach(p -> playlists.put(p.getId(), p));
        playlistRepository.searchByTag(contains, libraryId, limit)
                .forEach(p -> playlists.putIfAbsent(p.getId(), p));

        List<SongDTO> songDtos = songs.values().stream().map(mapper::song).toList();
        List<PlaylistSummaryDTO> playlistDtos = playlists.values().stream().map(mapper::playlistSummary).toList();
        return new SearchResultDTO(query, songDtos, playlistDtos);
    }
}
