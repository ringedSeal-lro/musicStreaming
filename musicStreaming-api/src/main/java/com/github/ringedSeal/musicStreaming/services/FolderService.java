package com.github.ringedSeal.musicStreaming.services;

import com.github.ringedSeal.musicStreaming.dto.FolderDTO;
import com.github.ringedSeal.musicStreaming.dto.FolderTreeDTO;
import com.github.ringedSeal.musicStreaming.exceptions.NotFoundException;
import com.github.ringedSeal.musicStreaming.models.Folder;
import com.github.ringedSeal.musicStreaming.repositories.FolderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Leitura do espelho das pastas reais. Pastas só mudam via scan/sync. */
@Service
@Transactional(readOnly = true)
public class FolderService {

    private final FolderRepository folderRepository;
    private final DtoMapper mapper;

    public FolderService(FolderRepository folderRepository, DtoMapper mapper) {
        this.folderRepository = folderRepository;
        this.mapper = mapper;
    }

    public List<FolderDTO> roots() {
        return folderRepository.findByParentIsNullOrderByName().stream().map(mapper::folder).toList();
    }

    public FolderDTO find(Long id) {
        return mapper.folder(get(id));
    }

    public FolderTreeDTO tree(Long id) {
        return mapper.folderTree(get(id));
    }

    private Folder get(Long id) {
        return folderRepository.findById(id).orElseThrow(() -> new NotFoundException("Pasta não encontrada: " + id));
    }
}
