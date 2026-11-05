package com.github.ringedSeal.musicStreaming.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SongIdsRequest(@NotEmpty List<@NotNull Long> songIds) {}
