package com.github.ringedSeal.musicStreaming.repositories;

import com.github.ringedSeal.musicStreaming.models.SongLocation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SongLocationRepository extends JpaRepository<SongLocation, Long> {
}
