package com.github.ringedSeal.musicStreaming.controllers;

import com.github.ringedSeal.musicStreaming.services.SettingsService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public Map<String, String> all() {
        return settingsService.all();
    }
}
