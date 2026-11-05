package com.github.ringedSeal.musicStreaming.dto;

import java.util.List;

public record PlaylistTreeDTO(
        Long id,
        Long parentId,
        String name,
        int position,
        List<TagDTO> tags,
        List<SongDTO> songs,
        List<PlaylistTreeDTO> children
) {}
