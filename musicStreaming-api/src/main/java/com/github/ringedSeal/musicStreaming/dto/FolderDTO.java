package com.github.ringedSeal.musicStreaming.dto;

public record FolderDTO(Long id, Long parentId, String name, String path, int childCount, int songCount) {}
