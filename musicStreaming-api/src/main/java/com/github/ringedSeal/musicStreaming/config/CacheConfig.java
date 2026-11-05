package com.github.ringedSeal.musicStreaming.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableCaching
public class CacheConfig {
    public static final String LIBRARY_TREE = "libraryTree";
    public static final String SEARCH = "search";
}
