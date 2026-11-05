package com.github.ringedSeal.musicStreaming.repositories;

import com.github.ringedSeal.musicStreaming.models.PlaylistSong;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PlaylistSongRepository extends JpaRepository<PlaylistSong, Long> {

    /** Todos os itens das playlists de uma biblioteca, já com a música carregada. */
    @Query("""
            select ps from PlaylistSong ps join fetch ps.song
            where ps.playlist.library.id = :libraryId
            order by ps.position
            """)
    List<PlaylistSong> findAllInLibrary(@Param("libraryId") Long libraryId);
}
