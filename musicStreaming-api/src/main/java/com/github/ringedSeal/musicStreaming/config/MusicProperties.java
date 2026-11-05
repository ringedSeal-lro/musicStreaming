package com.github.ringedSeal.musicStreaming.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Configurações da aplicação ({@code music.*}).
 *
 * @param root          pasta raiz com as músicas
 * @param scanOnStartup faz um scan incremental ao iniciar
 * @param corsOrigins   origens liberadas no CORS
 */
@ConfigurationProperties("music")
public record MusicProperties(
        @DefaultValue("/app/streaming") String root,
        @DefaultValue("true") boolean scanOnStartup,
        @DefaultValue("http://localhost:5173") String[] corsOrigins
) {}
