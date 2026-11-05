package com.github.ringedSeal.musicStreaming.dto;

import java.util.List;

public record SyncResultDTO(
        Long libraryId,
        boolean dryRun,
        List<SyncOperationDTO> operations,
        int applied,
        String error,
        ScanResultDTO scan
) {}
