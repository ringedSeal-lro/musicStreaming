package com.github.ringedSeal.musicStreaming.config;

import com.github.ringedSeal.musicStreaming.services.ScanService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class StartupScan implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StartupScan.class);

    private final MusicProperties properties;
    private final ScanService scanService;

    public StartupScan(MusicProperties properties, ScanService scanService) {
        this.properties = properties;
        this.scanService = scanService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!properties.scanOnStartup()) {
            return;
        }
        try {
            log.info("Scan inicial: {}", scanService.scan());
        } catch (RuntimeException e) {
            log.warn("Scan inicial falhou: {}", e.getMessage());
        }
    }
}
