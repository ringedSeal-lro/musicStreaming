package com.github.ringedSeal.musicStreaming.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreatePlaylistRequest(@NotBlank @Size(max = 200) String name, Long parentId) {}
