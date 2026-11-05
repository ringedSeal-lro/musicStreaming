package com.github.ringedSeal.musicStreaming.dto;

import java.util.List;

public record FolderTreeDTO(Long id, String name, String path, List<SongDTO> songs, List<FolderTreeDTO> children) {}
