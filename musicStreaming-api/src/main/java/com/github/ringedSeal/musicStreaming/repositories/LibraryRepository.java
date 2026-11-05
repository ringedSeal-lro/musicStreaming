package com.github.ringedSeal.musicStreaming.repositories;

import com.github.ringedSeal.musicStreaming.models.Library;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LibraryRepository extends JpaRepository<Library, Long> {
    Optional<Library> findFirstByDefaultLibraryTrue();
    List<Library> findAllByOrderByDefaultLibraryDescNameAsc();
}
