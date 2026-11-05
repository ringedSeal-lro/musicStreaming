package com.github.ringedSeal.musicStreaming.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;

/** Referência a uma tag existente ({@code tagId}) ou pelo nome (criada se não existir). */
public record TagRefRequest(Long tagId, @Size(max = 100) String name) {

    @AssertTrue(message = "informe tagId ou name")
    public boolean isValid() {
        return tagId != null || (name != null && !name.isBlank());
    }
}
