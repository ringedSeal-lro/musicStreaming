package com.github.ringedSeal.musicStreaming.dto;

public record ScanResultDTO(
        int added,
        int updated,
        int missing,
        int foldersCreated,
        int foldersRemoved,
        int playlistsCreated
) {}
