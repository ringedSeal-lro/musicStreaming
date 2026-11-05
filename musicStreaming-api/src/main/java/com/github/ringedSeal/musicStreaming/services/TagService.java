package com.github.ringedSeal.musicStreaming.services;

import com.github.ringedSeal.musicStreaming.config.EvictCaches;
import com.github.ringedSeal.musicStreaming.dto.TagDTO;
import com.github.ringedSeal.musicStreaming.dto.TagRefRequest;
import com.github.ringedSeal.musicStreaming.exceptions.BadRequestException;
import com.github.ringedSeal.musicStreaming.exceptions.ConflictException;
import com.github.ringedSeal.musicStreaming.exceptions.NotFoundException;
import com.github.ringedSeal.musicStreaming.models.Tag;
import com.github.ringedSeal.musicStreaming.repositories.PlaylistRepository;
import com.github.ringedSeal.musicStreaming.repositories.SongRepository;
import com.github.ringedSeal.musicStreaming.repositories.TagRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TagService {

    private final TagRepository tagRepository;
    private final SongRepository songRepository;
    private final PlaylistRepository playlistRepository;
    private final DtoMapper mapper;

    public TagService(TagRepository tagRepository, SongRepository songRepository,
                      PlaylistRepository playlistRepository, DtoMapper mapper) {
        this.tagRepository = tagRepository;
        this.songRepository = songRepository;
        this.playlistRepository = playlistRepository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<TagDTO> list() {
        return tagRepository.findAllByOrderByName().stream().map(mapper::tag).toList();
    }

    @EvictCaches
    @Transactional
    public TagDTO create(String name) {
        String clean = requireName(name);
        if (tagRepository.findByName(clean).isPresent()) {
            throw new ConflictException("Tag já existe: " + clean);
        }
        return mapper.tag(tagRepository.save(new Tag(clean)));
    }

    @EvictCaches
    @Transactional
    public void delete(Long id) {
        Tag tag = get(id);
        songRepository.findByTagId(id).forEach(s -> s.getTags().remove(tag));
        playlistRepository.findByTagId(id).forEach(p -> p.getTags().remove(tag));
        tagRepository.delete(tag);
    }

    public Tag get(Long id) {
        return tagRepository.findById(id).orElseThrow(() -> new NotFoundException("Tag não encontrada: " + id));
    }

    /** Resolve uma tag pelo id ou pelo nome, criando quando só o nome for informado. */
    @Transactional
    public Tag resolve(TagRefRequest ref) {
        if (ref.tagId() != null) {
            return get(ref.tagId());
        }
        String clean = requireName(ref.name());
        return tagRepository.findByName(clean).orElseGet(() -> tagRepository.save(new Tag(clean)));
    }

    private static String requireName(String name) {
        String clean = Tag.cleanName(name);
        if (clean.isEmpty()) {
            throw new BadRequestException("Nome da tag é obrigatório");
        }
        return clean;
    }
}
