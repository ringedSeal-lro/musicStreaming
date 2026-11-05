package com.github.ringedSeal.musicStreaming.services;

import org.jaudiotagger.audio.AudioFile;
import org.jaudiotagger.audio.AudioFileIO;
import org.jaudiotagger.tag.FieldKey;
import org.jaudiotagger.tag.Tag;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.util.logging.Level;
import java.util.logging.Logger;

/** Lê título, artista, álbum e duração com jaudiotagger; se falhar usa o nome do arquivo. */
@Component
public class AudioMetadataReader {

    public record Metadata(String title, String artist, String album, String albumArtist, Integer durationSec) {}

    static {
        Logger.getLogger("org.jaudiotagger").setLevel(Level.OFF);
    }

    public Metadata read(Path file) {
        String fallbackTitle = stripExtension(file.getFileName().toString());
        try {
            AudioFile audio = AudioFileIO.read(file.toFile());
            Tag tag = audio.getTag();
            Integer duration = audio.getAudioHeader() == null ? null : audio.getAudioHeader().getTrackLength();
            if (tag == null) {
                return new Metadata(fallbackTitle, null, null, null, duration);
            }
            String title = blankToNull(tag.getFirst(FieldKey.TITLE));
            return new Metadata(
                    title == null ? fallbackTitle : title,
                    blankToNull(tag.getFirst(FieldKey.ARTIST)),
                    blankToNull(tag.getFirst(FieldKey.ALBUM)),
                    blankToNull(tag.getFirst(FieldKey.ALBUM_ARTIST)),
                    duration);
        } catch (Exception | LinkageError e) {
            return new Metadata(fallbackTitle, null, null, null, null);
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String stripExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot <= 0 ? filename : filename.substring(0, dot);
    }
}
