package com.github.ringedSeal.musicStreaming.services;

import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** Identifica uma música pelo conteúdo: SHA-256 do primeiro MB + tamanho. */
@Component
public class ContentHasher {

    private static final int SAMPLE_BYTES = 1024 * 1024;

    public String hash(Path file) {
        try (InputStream in = Files.newInputStream(file)) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[64 * 1024];
            int total = 0;
            int read;
            while (total < SAMPLE_BYTES
                    && (read = in.read(buffer, 0, Math.min(buffer.length, SAMPLE_BYTES - total))) != -1) {
                digest.update(buffer, 0, read);
                total += read;
            }
            return HexFormat.of().formatHex(digest.digest()) + ":" + Files.size(file);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
