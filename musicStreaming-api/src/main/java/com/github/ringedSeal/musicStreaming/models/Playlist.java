package com.github.ringedSeal.musicStreaming.models;

import com.github.ringedSeal.musicStreaming.util.Text;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "playlist")
public class Playlist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String nameNorm;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "library_id")
    private Library library;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Playlist parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<Playlist> children = new ArrayList<>();

    @OneToMany(mappedBy = "playlist", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<PlaylistSong> items = new ArrayList<>();

    @ManyToMany
    @JoinTable(name = "playlist_tag",
            joinColumns = @JoinColumn(name = "playlist_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @OrderBy("name")
    private Set<Tag> tags = new LinkedHashSet<>();

    /** Pasta de onde a playlist veio (só na biblioteca padrão). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_folder_id")
    private Folder sourceFolder;

    private int position;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected Playlist() {}

    public Playlist(String name, Library library, Playlist parent, int position) {
        this.name = name;
        this.library = library;
        this.parent = parent;
        this.position = position;
    }

    @PrePersist
    @PreUpdate
    void touch() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        nameNorm = Text.normalize(name);
    }

    public boolean contains(Song song) {
        return items.stream().anyMatch(i -> i.getSong().getId().equals(song.getId()));
    }

    public void addSong(Song song) {
        items.add(new PlaylistSong(this, song, items.size()));
    }

    public void renumberItems() {
        for (int i = 0; i < items.size(); i++) {
            items.get(i).setPosition(i);
        }
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Library getLibrary() { return library; }
    public Playlist getParent() { return parent; }
    public void setParent(Playlist parent) { this.parent = parent; }
    public List<Playlist> getChildren() { return children; }
    public List<PlaylistSong> getItems() { return items; }
    public Set<Tag> getTags() { return tags; }
    public Folder getSourceFolder() { return sourceFolder; }
    public void setSourceFolder(Folder sourceFolder) { this.sourceFolder = sourceFolder; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
