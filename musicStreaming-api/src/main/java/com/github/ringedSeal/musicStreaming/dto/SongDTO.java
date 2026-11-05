package com.github.ringedSeal.musicStreaming.dto;

import java.time.Instant;
import java.util.List;

public record SongDTO(
        Long id,
        String title,
        String artist,
        String album,
        String albumArtist,
        Integer durationSec,
        boolean favorite,
        boolean available,
        Instant addedAt,
        List<TagDTO> tags,
        List<String> paths
) {}
