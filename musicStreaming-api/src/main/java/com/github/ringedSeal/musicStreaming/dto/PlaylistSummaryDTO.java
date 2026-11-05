package com.github.ringedSeal.musicStreaming.dto;

import java.util.List;

public record PlaylistSummaryDTO(
        Long id,
        Long libraryId,
        Long parentId,
        String name,
        int position,
        int songCount,
        int childCount,
        List<TagDTO> tags
) {}
