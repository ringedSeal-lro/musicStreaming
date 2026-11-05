package com.github.ringedSeal.musicStreaming.services;

import com.github.ringedSeal.musicStreaming.dto.*;
import com.github.ringedSeal.musicStreaming.models.*;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DtoMapper {

    public TagDTO tag(Tag tag) {
        return new TagDTO(tag.getId(), tag.getName());
    }

    public List<TagDTO> tags(java.util.Collection<Tag> tags) {
        return tags.stream().map(this::tag).toList();
    }

    public SongDTO song(Song song) {
        return new SongDTO(
                song.getId(),
                song.getTitle(),
                song.getArtist(),
                song.getAlbum(),
                song.getAlbumArtist(),
                song.getDurationSec(),
                song.isFavorite(),
                song.isAvailable(),
                song.getAddedAt(),
                tags(song.getTags()),
                song.getLocations().stream().map(SongLocation::getPath).toList()
        );
    }

    public LibraryDTO library(Library library, long playlistCount) {
        return new LibraryDTO(library.getId(), library.getName(), library.isDefaultLibrary(),
                playlistCount, library.getCreatedAt());
    }

    public PlaylistSummaryDTO playlistSummary(Playlist p) {
        return new PlaylistSummaryDTO(
                p.getId(),
                p.getLibrary().getId(),
                p.getParent() == null ? null : p.getParent().getId(),
                p.getName(),
                p.getPosition(),
                p.getItems().size(),
                p.getChildren().size(),
                tags(p.getTags()));
    }

    public PlaylistDTO playlist(Playlist p) {
        return new PlaylistDTO(
                p.getId(),
                p.getLibrary().getId(),
                p.getParent() == null ? null : p.getParent().getId(),
                p.getName(),
                p.getPosition(),
                p.getItems().size(),
                tags(p.getTags()),
                p.getChildren().stream().map(this::playlistSummary).toList(),
                p.getCreatedAt(),
                p.getUpdatedAt());
    }

    public FolderDTO folder(Folder f) {
        return new FolderDTO(f.getId(), f.getParent() == null ? null : f.getParent().getId(),
                f.getName(), f.getPath(), f.getChildren().size(), f.getLocations().size());
    }

    public FolderTreeDTO folderTree(Folder f) {
        return new FolderTreeDTO(f.getId(), f.getName(), f.getPath(),
                f.getLocations().stream().map(l -> song(l.getSong())).toList(),
                f.getChildren().stream().map(this::folderTree).toList());
    }
}
