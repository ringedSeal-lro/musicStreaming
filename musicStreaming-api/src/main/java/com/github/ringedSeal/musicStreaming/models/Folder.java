package com.github.ringedSeal.musicStreaming.models;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

/** Espelho de uma pasta real dentro de music.root. */
@Entity
@Table(name = "folder")
public class Folder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /** Caminho relativo à raiz, separado por '/'. */
    @Column(nullable = false, unique = true, length = 2048)
    private String path;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Folder parent;

    @OneToMany(mappedBy = "parent")
    @OrderBy("name")
    private List<Folder> children = new ArrayList<>();

    @OneToMany(mappedBy = "folder")
    @OrderBy("filename")
    private List<SongLocation> locations = new ArrayList<>();

    protected Folder() {}

    public Folder(String name, String path, Folder parent) {
        this.name = name;
        this.path = path;
        this.parent = parent;
    }

    public int depth() {
        return (int) path.chars().filter(c -> c == '/').count();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getPath() { return path; }
    public Folder getParent() { return parent; }
    public List<Folder> getChildren() { return children; }
    public List<SongLocation> getLocations() { return locations; }
}
