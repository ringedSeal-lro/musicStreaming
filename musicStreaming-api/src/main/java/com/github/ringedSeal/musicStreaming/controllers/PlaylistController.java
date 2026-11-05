package com.github.ringedSeal.musicStreaming.controllers;

import com.github.ringedSeal.musicStreaming.dto.*;
import com.github.ringedSeal.musicStreaming.services.PlaylistService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/playlists")
public class PlaylistController {

    private final PlaylistService playlistService;

    public PlaylistController(PlaylistService playlistService) {
        this.playlistService = playlistService;
    }

    @GetMapping("/{id}")
    public PlaylistDTO get(@PathVariable Long id) {
        return playlistService.find(id);
    }

    /** Renomear ({@code name}) e/ou mover ({@code parentId}; null = raiz). */
    @PatchMapping("/{id}")
    public PlaylistDTO update(@PathVariable Long id, @Valid @RequestBody UpdatePlaylistRequest request) {
        return playlistService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        playlistService.delete(id);
    }

    @GetMapping("/{id}/songs")
    public List<SongDTO> songs(@PathVariable Long id) {
        return playlistService.songs(id);
    }

    @PostMapping("/{id}/songs")
    public List<SongDTO> addSongs(@PathVariable Long id, @Valid @RequestBody SongIdsRequest request) {
        return playlistService.addSongs(id, request);
    }

    @DeleteMapping("/{id}/songs/{songId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeSong(@PathVariable Long id, @PathVariable Long songId) {
        playlistService.removeSong(id, songId);
    }

    @PutMapping("/{id}/songs/order")
    public List<SongDTO> reorder(@PathVariable Long id, @Valid @RequestBody SongIdsRequest request) {
        return playlistService.reorder(id, request);
    }

    @PostMapping("/{id}/tags")
    public PlaylistDTO addTag(@PathVariable Long id, @Valid @RequestBody TagRefRequest request) {
        return playlistService.addTag(id, request);
    }

    @DeleteMapping("/{id}/tags/{tagId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeTag(@PathVariable Long id, @PathVariable Long tagId) {
        playlistService.removeTag(id, tagId);
    }
}
