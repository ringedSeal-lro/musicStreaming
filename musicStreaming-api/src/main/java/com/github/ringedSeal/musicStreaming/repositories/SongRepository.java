package com.github.ringedSeal.musicStreaming.repositories;

import com.github.ringedSeal.musicStreaming.models.Song;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SongRepository extends JpaRepository<Song, Long> {

    Optional<Song> findByContentHash(String contentHash);

    @Query(value = """
            select s from Song s
            where (:favorite is null or s.favorite = :favorite)
              and (:tag is null or exists (select 1 from s.tags t where t.name = :tag))
            order by s.titleNorm, s.id
            """,
            countQuery = """
            select count(s) from Song s
            where (:favorite is null or s.favorite = :favorite)
              and (:tag is null or exists (select 1 from s.tags t where t.name = :tag))
            """)
    Page<Song> search(@Param("favorite") Boolean favorite, @Param("tag") String tag, Pageable pageable);

    /** Músicas disponíveis que não estão em nenhuma playlist da biblioteca. */
    @Query("""
            select s from Song s
            where s.available = true
              and not exists (
                select 1 from PlaylistSong ps
                where ps.song = s and ps.playlist.library.id = :libraryId)
            order by s.titleNorm, s.id
            """)
    List<Song> findUnorganized(@Param("libraryId") Long libraryId);

    @Query("select s from Song s join s.tags t where t.id = :tagId")
    List<Song> findByTagId(@Param("tagId") Long tagId);

    // ---- busca ----

    @Query("""
            select s from Song s
            where s.titleNorm like :contains escape '\\'
               or s.artistNorm like :contains escape '\\'
               or s.albumNorm like :contains escape '\\'
            order by case
                when s.titleNorm = :term then 0
                when s.titleNorm like :starts escape '\\' then 1
                when s.titleNorm like :contains escape '\\' then 2
                else 3 end,
              s.titleNorm, s.id
            """)
    List<Song> searchByText(@Param("term") String term,
                            @Param("starts") String starts,
                            @Param("contains") String contains,
                            Pageable pageable);

    @Query("""
            select s from Song s
            where exists (select 1 from s.tags t where t.normalized like :contains escape '\\')
            order by s.titleNorm, s.id
            """)
    List<Song> searchByTag(@Param("contains") String contains, Pageable pageable);
}
