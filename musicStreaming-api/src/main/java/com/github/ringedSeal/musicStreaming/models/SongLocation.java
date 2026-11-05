package com.github.ringedSeal.musicStreaming.models;

import jakarta.persistence.*;

/** Um arquivo físico de uma música. A mesma música pode ter várias cópias. */
@Entity
@Table(name = "song_location")
public class SongLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "song_id")
    private Song song;

    /** Pasta que contém o arquivo; null quando está na raiz. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    private Folder folder;

    /** Caminho relativo à raiz, separado por '/'. */
    @Column(nullable = false, unique = true, length = 2048)
    private String path;

    @Column(nullable = false)
    private String filename;

    private long sizeBytes;
    private long lastModified;

    protected SongLocation() {}

    public SongLocation(Song song, Folder folder, String path, String filename, long sizeBytes, long lastModified) {
        this.song = song;
        this.folder = folder;
        this.path = path;
        this.filename = filename;
        this.sizeBytes = sizeBytes;
        this.lastModified = lastModified;
    }

    /** Pasta relativa ("" para a raiz). */
    public String directory() {
        int i = path.lastIndexOf('/');
        return i < 0 ? "" : path.substring(0, i);
    }

    public Long getId() { return id; }
    public Song getSong() { return song; }
    public void setSong(Song song) { this.song = song; }
    public Folder getFolder() { return folder; }
    public String getPath() { return path; }
    public String getFilename() { return filename; }
    public long getSizeBytes() { return sizeBytes; }
    public long getLastModified() { return lastModified; }

    public void updateFileInfo(long sizeBytes, long lastModified) {
        this.sizeBytes = sizeBytes;
        this.lastModified = lastModified;
    }
}
