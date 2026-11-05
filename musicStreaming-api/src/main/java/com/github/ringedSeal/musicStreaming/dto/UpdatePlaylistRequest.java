package com.github.ringedSeal.musicStreaming.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * PATCH de playlist. Campos ausentes não mudam nada.
 * {@code "parentId": null} explícito move a playlist para a raiz da biblioteca.
 */
public class UpdatePlaylistRequest {

    @Size(min = 1, max = 200)
    @Pattern(regexp = ".*\\S.*", message = "não pode ser vazio")
    private String name;

    private Long parentId;
    private boolean parentIdPresent;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Long getParentId() { return parentId; }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
        this.parentIdPresent = true;
    }

    public boolean isParentIdPresent() { return parentIdPresent; }
}
