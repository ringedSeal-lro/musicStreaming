package com.github.ringedSeal.musicStreaming.dto;

import java.util.List;

public record LibraryTreeDTO(
        Long id,
        String name,
        boolean isDefault,
        List<PlaylistTreeDTO> playlists,
        List<SongDTO> unorganizedSongs
) {}
