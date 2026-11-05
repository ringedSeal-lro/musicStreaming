package com.github.ringedSeal.musicStreaming.dto;

import java.time.Instant;

public record LibraryDTO(Long id, String name, boolean isDefault, long playlistCount, Instant createdAt) {}
