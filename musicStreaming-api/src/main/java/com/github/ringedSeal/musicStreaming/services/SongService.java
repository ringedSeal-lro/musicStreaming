package com.github.ringedSeal.musicStreaming.services;

import com.github.ringedSeal.musicStreaming.config.EvictCaches;
import com.github.ringedSeal.musicStreaming.dto.PageDTO;
import com.github.ringedSeal.musicStreaming.dto.SongDTO;
import com.github.ringedSeal.musicStreaming.dto.TagRefRequest;
import com.github.ringedSeal.musicStreaming.exceptions.NotFoundException;
import com.github.ringedSeal.musicStreaming.models.Song;
import com.github.ringedSeal.musicStreaming.models.SongLocation;
import com.github.ringedSeal.musicStreaming.models.Tag;
import com.github.ringedSeal.musicStreaming.repositories.SongRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

@Service
public class SongService {

    private static final Map<String, MediaType> AUDIO_TYPES = Map.of(
            "mp3", MediaType.parseMediaType("audio/mpeg"),
            "flac", MediaType.parseMediaType("audio/flac"),
            "ogg", MediaType.parseMediaType("audio/ogg"),
            "m4a", MediaType.parseMediaType("audio/mp4"),
            "wav", MediaType.parseMediaType("audio/wav"));

    public record AudioFile(Path path, MediaType mediaType) {}

    private final SongRepository songRepository;
    private final TagService tagService;
    private final MusicRoot musicRoot;
    private final DtoMapper mapper;

    public SongService(SongRepository songRepository, TagService tagService, MusicRoot musicRoot, DtoMapper mapper) {
        this.songRepository = songRepository;
        this.tagService = tagService;
        this.musicRoot = musicRoot;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public PageDTO<SongDTO> list(Boolean favorite, String tag, int page, int size) {
        String tagName = tag == null || tag.isBlank() ? null : Tag.cleanName(tag);
        return PageDTO.of(songRepository.search(favorite, tagName, PageRequest.of(page, size)).map(mapper::song));
    }

    @Transactional(readOnly = true)
    public SongDTO find(Long id) {
        return mapper.song(get(id));
    }

    @EvictCaches
    @Transactional
    public SongDTO setFavorite(Long id, boolean favorite) {
        Song song = get(id);
        song.setFavorite(favorite);
        return mapper.song(song);
    }

    @EvictCaches
    @Transactional
    public SongDTO addTag(Long id, TagRefRequest request) {
        Song song = get(id);
        song.getTags().add(tagService.resolve(request));
        songRepository.flush();
        return mapper.song(song);
    }

    @EvictCaches
    @Transactional
    public void removeTag(Long id, Long tagId) {
        Song song = get(id);
        if (!song.getTags().removeIf(t -> t.getId().equals(tagId))) {
            throw new NotFoundException("Tag " + tagId + " não está na música " + id);
        }
    }

    /** Primeiro arquivo existente da música, para o streaming. */
    @Transactional(readOnly = true)
    public AudioFile audioFile(Long id) {
        Song song = get(id);
        for (SongLocation location : song.getLocations()) {
            Path path = musicRoot.resolve(location.getPath());
            if (Files.isRegularFile(path)) {
                MediaType type = AUDIO_TYPES.getOrDefault(
                        MusicRoot.extension(location.getFilename()), MediaType.APPLICATION_OCTET_STREAM);
                return new AudioFile(path, type);
            }
        }
        throw new NotFoundException("Arquivo da música " + id + " não encontrado no disco");
    }

    public Song get(Long id) {
        return songRepository.findById(id).orElseThrow(() -> new NotFoundException("Música não encontrada: " + id));
    }
}
