package com.github.ringedSeal.musicStreaming.dto;

import java.util.List;

public record SearchResultDTO(String query, List<SongDTO> songs, List<PlaylistSummaryDTO> playlists) {}
