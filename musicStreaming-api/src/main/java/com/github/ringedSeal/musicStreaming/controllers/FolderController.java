package com.github.ringedSeal.musicStreaming.controllers;

import com.github.ringedSeal.musicStreaming.dto.FolderDTO;
import com.github.ringedSeal.musicStreaming.dto.FolderTreeDTO;
import com.github.ringedSeal.musicStreaming.services.FolderService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Somente leitura: as pastas reais só mudam via scan/sync. */
@RestController
@RequestMapping("/api/folders")
public class FolderController {

    private final FolderService folderService;

    public FolderController(FolderService folderService) {
        this.folderService = folderService;
    }

    @GetMapping
    public List<FolderDTO> roots() {
        return folderService.roots();
    }

    @GetMapping("/{id}")
    public FolderDTO get(@PathVariable Long id) {
        return folderService.find(id);
    }

    @GetMapping("/{id}/tree")
    public FolderTreeDTO tree(@PathVariable Long id) {
        return folderService.tree(id);
    }
}
