package com.github.ringedSeal.musicStreaming;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class MusicStreamingApplication {

    public static void main(String[] args) {
        SpringApplication.run(MusicStreamingApplication.class, args);
    }
}
