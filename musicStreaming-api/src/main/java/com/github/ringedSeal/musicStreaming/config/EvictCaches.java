package com.github.ringedSeal.musicStreaming.config;

import org.springframework.cache.annotation.CacheEvict;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Invalida os caches de leitura (árvore e busca) depois de qualquer escrita. */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@CacheEvict(cacheNames = {CacheConfig.LIBRARY_TREE, CacheConfig.SEARCH}, allEntries = true)
public @interface EvictCaches {}
