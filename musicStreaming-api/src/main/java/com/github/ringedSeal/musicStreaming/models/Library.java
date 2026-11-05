package com.github.ringedSeal.musicStreaming.models;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "library")
public class Library {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /** Biblioteca criada pelo scan; não pode ser apagada. */
    @Column(name = "default_library", nullable = false)
    private boolean defaultLibrary;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected Library() {}

    public Library(String name, boolean defaultLibrary) {
        this.name = name;
        this.defaultLibrary = defaultLibrary;
    }

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public boolean isDefaultLibrary() { return defaultLibrary; }
    public Instant getCreatedAt() { return createdAt; }
}
