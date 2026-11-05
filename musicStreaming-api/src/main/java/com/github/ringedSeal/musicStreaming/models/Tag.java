package com.github.ringedSeal.musicStreaming.models;

import com.github.ringedSeal.musicStreaming.util.Text;
import jakarta.persistence.*;

import java.util.Locale;

@Entity
@Table(name = "tag")
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nome em minúsculas, sem espaços nas pontas. */
    @Column(nullable = false, unique = true)
    private String name;

    /** Nome sem acento, usado na busca. */
    @Column(nullable = false)
    private String normalized;

    protected Tag() {}

    public Tag(String name) {
        this.name = cleanName(name);
        this.normalized = Text.normalize(this.name);
    }

    public static String cleanName(String name) {
        return name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getNormalized() { return normalized; }
}
