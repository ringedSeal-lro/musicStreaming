package com.github.ringedSeal.musicStreaming.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Corpo com apenas um nome (criar/renomear biblioteca, criar tag). */
public record NameRequest(@NotBlank @Size(max = 200) String name) {}
