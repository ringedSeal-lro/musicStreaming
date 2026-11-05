package com.github.ringedSeal.musicStreaming.controllers;

import com.github.ringedSeal.musicStreaming.dto.PageDTO;
import com.github.ringedSeal.musicStreaming.dto.SongDTO;
import com.github.ringedSeal.musicStreaming.dto.TagRefRequest;
import com.github.ringedSeal.musicStreaming.services.SongService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/songs")
public class SongController {

    private final SongService songService;

    public SongController(SongService songService) {
        this.songService = songService;
    }

    @GetMapping
    public PageDTO<SongDTO> list(@RequestParam(required = false) Boolean favorite,
                                 @RequestParam(required = false) String tag,
                                 @RequestParam(defaultValue = "0") @Min(0) int page,
                                 @RequestParam(defaultValue = "50") @Min(1) @Max(500) int size) {
        return songService.list(favorite, tag, page, size);
    }

    @GetMapping("/{id}")
    public SongDTO get(@PathVariable Long id) {
        return songService.find(id);
    }

    /**
     * Streaming do arquivo. O Spring MVC trata o header Range sozinho quando o corpo é um Resource
     * (responde 206 Partial Content com Content-Range).
     */
    @GetMapping("/{id}/stream")
    public ResponseEntity<Resource> stream(@PathVariable Long id) {
        SongService.AudioFile file = songService.audioFile(id);
        return ResponseEntity.ok()
                .contentType(file.mediaType())
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .body(new FileSystemResource(file.path()));
    }

    @PutMapping("/{id}/favorite")
    public SongDTO favorite(@PathVariable Long id) {
        return songService.setFavorite(id, true);
    }

    @DeleteMapping("/{id}/favorite")
    public SongDTO unfavorite(@PathVariable Long id) {
        return songService.setFavorite(id, false);
    }

    @PostMapping("/{id}/tags")
    public SongDTO addTag(@PathVariable Long id, @Valid @RequestBody TagRefRequest request) {
        return songService.addTag(id, request);
    }

    @DeleteMapping("/{id}/tags/{tagId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeTag(@PathVariable Long id, @PathVariable Long tagId) {
        songService.removeTag(id, tagId);
    }
}
