package com.github.ringedSeal.musicStreaming.controllers;

import com.github.ringedSeal.musicStreaming.dto.ScanResultDTO;
import com.github.ringedSeal.musicStreaming.services.ScanService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/scan")
public class ScanController {

    private final ScanService scanService;

    public ScanController(ScanService scanService) {
        this.scanService = scanService;
    }

    @PostMapping
    public ScanResultDTO scan() {
        return scanService.scan();
    }
}
