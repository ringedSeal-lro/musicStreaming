package com.github.ringedSeal.musicStreaming.repositories;

import com.github.ringedSeal.musicStreaming.models.Folder;
import com.github.ringedSeal.musicStreaming.models.Library;
import com.github.ringedSeal.musicStreaming.models.Playlist;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PlaylistRepository extends JpaRepository<Playlist, Long> {

    List<Playlist> findByLibraryIdOrderByPosition(Long libraryId);

    List<Playlist> findByLibraryIdAndParentIsNullOrderByPosition(Long libraryId);

    Optional<Playlist> findFirstByLibraryAndSourceFolder(Library library, Folder sourceFolder);

    List<Playlist> findBySourceFolder(Folder folder);

    long countByLibraryId(Long libraryId);

    @Query("select coalesce(max(p.position) + 1, 0) from Playlist p where p.library.id = :libraryId and p.parent is null")
    int nextRootPosition(@Param("libraryId") Long libraryId);

    @Query("select coalesce(max(p.position) + 1, 0) from Playlist p where p.parent.id = :parentId")
    int nextChildPosition(@Param("parentId") Long parentId);

    @Query("select p from Playlist p join p.tags t where t.id = :tagId")
    List<Playlist> findByTagId(@Param("tagId") Long tagId);

    @Modifying
    @Query("update Playlist p set p.sourceFolder = null where p.sourceFolder = :folder")
    void clearSourceFolder(@Param("folder") Folder folder);

    // ---- busca ----

    @Query("""
            select p from Playlist p
            where p.nameNorm like :contains escape '\\'
              and (:libraryId is null or p.library.id = :libraryId)
            order by case
                when p.nameNorm = :term then 0
                when p.nameNorm like :starts escape '\\' then 1
                else 2 end,
              p.nameNorm, p.id
            """)
    List<Playlist> searchByName(@Param("term") String term,
                                @Param("starts") String starts,
                                @Param("contains") String contains,
                                @Param("libraryId") Long libraryId,
                                Pageable pageable);

    @Query("""
            select p from Playlist p
            where exists (select 1 from p.tags t where t.normalized like :contains escape '\\')
              and (:libraryId is null or p.library.id = :libraryId)
            order by p.nameNorm, p.id
            """)
    List<Playlist> searchByTag(@Param("contains") String contains,
                               @Param("libraryId") Long libraryId,
                               Pageable pageable);
}
