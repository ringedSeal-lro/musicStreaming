package com.github.ringedSeal.musicStreaming.models;

import com.github.ringedSeal.musicStreaming.util.Text;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "song")
public class Song {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** SHA-256 do primeiro MB + tamanho do arquivo: identifica a música mesmo se ela mudar de lugar. */
    @Column(nullable = false, unique = true, length = 80)
    private String contentHash;

    @Column(nullable = false)
    private String title;
    private String artist;
    private String album;
    private String albumArtist;
    private Integer durationSec;

    private boolean favorite;

    /** false quando nenhum arquivo da música existe mais no disco. */
    private boolean available = true;

    @Column(nullable = false, updatable = false)
    private Instant addedAt;

    // Colunas normalizadas (minúsculas, sem acento) para a busca
    @Column(nullable = false)
    private String titleNorm;
    private String artistNorm;
    private String albumNorm;

    @OneToMany(mappedBy = "song", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("path")
    private List<SongLocation> locations = new ArrayList<>();

    @ManyToMany
    @JoinTable(name = "song_tag",
            joinColumns = @JoinColumn(name = "song_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @OrderBy("name")
    private Set<Tag> tags = new LinkedHashSet<>();

    protected Song() {}

    public Song(String contentHash, String title, String artist, String album, String albumArtist, Integer durationSec) {
        this.contentHash = contentHash;
        this.title = title;
        this.artist = artist;
        this.album = album;
        this.albumArtist = albumArtist;
        this.durationSec = durationSec;
    }

    @PrePersist
    @PreUpdate
    void normalize() {
        if (addedAt == null) {
            addedAt = Instant.now();
        }
        titleNorm = Text.normalize(title);
        artistNorm = Text.normalize(artist);
        albumNorm = Text.normalize(album);
    }

    public Long getId() { return id; }
    public String getContentHash() { return contentHash; }
    public String getTitle() { return title; }
    public String getArtist() { return artist; }
    public String getAlbum() { return album; }
    public String getAlbumArtist() { return albumArtist; }
    public Integer getDurationSec() { return durationSec; }
    public boolean isFavorite() { return favorite; }
    public void setFavorite(boolean favorite) { this.favorite = favorite; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
    public Instant getAddedAt() { return addedAt; }
    public List<SongLocation> getLocations() { return locations; }
    public Set<Tag> getTags() { return tags; }
}
