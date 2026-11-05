package com.github.ringedSeal.musicStreaming.models;

import jakarta.persistence.*;

@Entity
@Table(name = "playlist_song",
        uniqueConstraints = @UniqueConstraint(columnNames = {"playlist_id", "song_id"}))
public class PlaylistSong {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "playlist_id")
    private Playlist playlist;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "song_id")
    private Song song;

    private int position;

    protected PlaylistSong() {}

    public PlaylistSong(Playlist playlist, Song song, int position) {
        this.playlist = playlist;
        this.song = song;
        this.position = position;
    }

    public Long getId() { return id; }
    public Playlist getPlaylist() { return playlist; }
    public Song getSong() { return song; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
}
