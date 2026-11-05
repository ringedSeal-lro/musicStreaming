package com.github.ringedSeal.musicStreaming.dto;

import java.time.Instant;
import java.util.List;

public record PlaylistDTO(
        Long id,
        Long libraryId,
        Long parentId,
        String name,
        int position,
        int songCount,
        List<TagDTO> tags,
        List<PlaylistSummaryDTO> children,
        Instant createdAt,
        Instant updatedAt
) {}
