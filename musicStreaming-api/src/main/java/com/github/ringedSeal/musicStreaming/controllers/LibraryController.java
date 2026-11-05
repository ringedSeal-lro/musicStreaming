package com.github.ringedSeal.musicStreaming.controllers;

import com.github.ringedSeal.musicStreaming.dto.*;
import com.github.ringedSeal.musicStreaming.services.LibraryService;
import com.github.ringedSeal.musicStreaming.services.PlaylistService;
import com.github.ringedSeal.musicStreaming.services.SyncService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/libraries")
public class LibraryController {

    private final LibraryService libraryService;
    private final PlaylistService playlistService;
    private final SyncService syncService;

    public LibraryController(LibraryService libraryService, PlaylistService playlistService, SyncService syncService) {
        this.libraryService = libraryService;
        this.playlistService = playlistService;
        this.syncService = syncService;
    }

    @GetMapping
    public List<LibraryDTO> list() {
        return libraryService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LibraryDTO create(@Valid @RequestBody NameRequest request) {
        return libraryService.create(request.name());
    }

    @GetMapping("/{id}")
    public LibraryDTO get(@PathVariable Long id) {
        return libraryService.find(id);
    }

    @PatchMapping("/{id}")
    public LibraryDTO rename(@PathVariable Long id, @Valid @RequestBody NameRequest request) {
        return libraryService.rename(id, request.name());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        libraryService.delete(id);
    }

    @GetMapping("/{id}/tree")
    public LibraryTreeDTO tree(@PathVariable Long id) {
        return libraryService.tree(id);
    }

    @GetMapping("/{id}/playlists")
    public List<PlaylistSummaryDTO> playlists(@PathVariable Long id) {
        return libraryService.rootPlaylists(id);
    }

    @PostMapping("/{id}/playlists")
    @ResponseStatus(HttpStatus.CREATED)
    public PlaylistDTO createPlaylist(@PathVariable Long id, @Valid @RequestBody CreatePlaylistRequest request) {
        return playlistService.create(id, request);
    }

    @PostMapping("/{id}/sync")
    public SyncResultDTO sync(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean dryRun) {
        return syncService.sync(id, dryRun);
    }
}
