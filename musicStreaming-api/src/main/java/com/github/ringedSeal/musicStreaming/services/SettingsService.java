package com.github.ringedSeal.musicStreaming.services;

import com.github.ringedSeal.musicStreaming.models.Setting;
import com.github.ringedSeal.musicStreaming.repositories.SettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.TreeMap;

@Service
public class SettingsService {

    public static final String LAST_SCAN_AT = "lastScanAt";
    public static final String LAST_SYNC_AT = "lastSyncAt";

    private final SettingRepository repository;
    private final MusicRoot musicRoot;

    public SettingsService(SettingRepository repository, MusicRoot musicRoot) {
        this.repository = repository;
        this.musicRoot = musicRoot;
    }

    @Transactional
    public void put(String key, String value) {
        repository.findById(key).ifPresentOrElse(
                s -> s.setValue(value),
                () -> repository.save(new Setting(key, value)));
    }

    @Transactional(readOnly = true)
    public Map<String, String> all() {
        Map<String, String> result = new TreeMap<>();
        repository.findAll().forEach(s -> result.put(s.getKey(), s.getValue()));
        result.put("musicRoot", musicRoot.root().toString());
        return result;
    }
}
