package com.github.ringedSeal.musicStreaming.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public record PageDTO<T>(List<T> content, int page, int size, long totalElements, int totalPages) {
    public static <T> PageDTO<T> of(Page<T> page) {
        return new PageDTO<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
