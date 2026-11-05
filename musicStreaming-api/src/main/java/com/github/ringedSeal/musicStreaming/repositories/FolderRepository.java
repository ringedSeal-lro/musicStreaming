package com.github.ringedSeal.musicStreaming.repositories;

import com.github.ringedSeal.musicStreaming.models.Folder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FolderRepository extends JpaRepository<Folder, Long> {
    List<Folder> findByParentIsNullOrderByName();
    Optional<Folder> findByPath(String path);
}
