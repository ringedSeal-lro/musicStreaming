package com.github.ringedSeal.musicStreaming.services;

import com.github.ringedSeal.musicStreaming.config.MusicProperties;
import com.github.ringedSeal.musicStreaming.exceptions.BadRequestException;
import com.github.ringedSeal.musicStreaming.exceptions.ConflictException;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;

/** Resolve caminhos relativos garantindo que nunca saiam de music.root. */
@Component
public class MusicRoot {

    public static final Set<String> AUDIO_EXTENSIONS = Set.of("mp3", "flac", "ogg", "m4a", "wav");

    private final Path root;

    public MusicRoot(MusicProperties properties) {
        this.root = Path.of(properties.root()).toAbsolutePath().normalize();
    }

    public Path root() {
        return root;
    }

    /** Raiz existente, ou 409 se a pasta não existir. */
    public Path requireRoot() {
        if (!Files.isDirectory(root)) {
            throw new ConflictException("Pasta raiz não encontrada: " + root);
        }
        return root;
    }

    public Path resolve(String relative) {
        Path resolved = root.resolve(relative == null ? "" : relative).normalize();
        if (!resolved.startsWith(root)) {
            throw new BadRequestException("Caminho fora da pasta raiz: " + relative);
        }
        return resolved;
    }

    public String relativize(Path absolute) {
        Path rel = root.relativize(absolute.toAbsolutePath().normalize());
        return rel.toString().replace('\\', '/');
    }

    public static boolean isAudio(Path file) {
        return AUDIO_EXTENSIONS.contains(extension(file.getFileName().toString()));
    }

    public static String extension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    public static String parentOf(String relative) {
        int i = relative.lastIndexOf('/');
        return i < 0 ? "" : relative.substring(0, i);
    }

    public static String join(String dir, String name) {
        return dir.isEmpty() ? name : dir + "/" + name;
    }
}
