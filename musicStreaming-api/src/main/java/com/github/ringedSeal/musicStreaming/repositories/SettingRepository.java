package com.github.ringedSeal.musicStreaming.repositories;

import com.github.ringedSeal.musicStreaming.models.Setting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettingRepository extends JpaRepository<Setting, String> {
}
