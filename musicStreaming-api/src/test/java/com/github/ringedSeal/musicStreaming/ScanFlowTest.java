package com.github.ringedSeal.musicStreaming;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ScanFlowTest extends AbstractIntegrationTest {

    @Test
    void firstScanCreatesDefaultLibraryFromFolders() throws Exception {
        audio("Rock/a.mp3");
        audio("Rock/Classic/b.mp3");
        audio("c.mp3");
        Files.writeString(ROOT.resolve("Rock/cover.jpg"), "not audio");

        post("/api/scan", null).andExpect(status().isOk())
                .andExpect(jsonPath("$.added").value(3))
                .andExpect(jsonPath("$.foldersCreated").value(2))
                .andExpect(jsonPath("$.playlistsCreated").value(2));

        get("/api/libraries").andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].isDefault").value(true))
                .andExpect(jsonPath("$[0].playlistCount").value(2));

        get("/api/libraries/{id}/tree", defaultLibraryId())
                .andExpect(jsonPath("$.playlists", hasSize(1)))
                .andExpect(jsonPath("$.playlists[0].name").value("Rock"))
                .andExpect(jsonPath("$.playlists[0].songs[*].title", contains("a")))
                .andExpect(jsonPath("$.playlists[0].children[0].name").value("Classic"))
                .andExpect(jsonPath("$.playlists[0].children[0].songs[*].title", contains("b")))
                .andExpect(jsonPath("$.unorganizedSongs[*].title", contains("c")));

        get("/api/folders").andExpect(jsonPath("$[*].path", contains("Rock")));
    }

    @Test
    void incrementalScanAddsNewFoldersAndKeepsUserEdits() throws Exception {
        audio("Rock/a.mp3");
        post("/api/scan", null).andExpect(status().isOk());
        long library = defaultLibraryId();
        long rock = id(get("/api/libraries/{id}/playlists", library), "$[0].id");
        long a = songId("a");

        delete("/api/playlists/{id}/songs/{songId}", rock, a).andExpect(status().isNoContent());
        audio("Jazz/d.mp3");

        post("/api/scan", null).andExpect(status().isOk())
                .andExpect(jsonPath("$.added").value(1))
                .andExpect(jsonPath("$.playlistsCreated").value(1));

        get("/api/libraries/{id}/tree", library)
                .andExpect(jsonPath("$.playlists[*].name", contains("Rock", "Jazz")))
                .andExpect(jsonPath("$.playlists[0].songs", empty()))
                .andExpect(jsonPath("$.playlists[1].songs[*].title", contains("d")));
    }

    @Test
    void missingFilesMarkSongUnavailable() throws Exception {
        audio("Rock/a.mp3");
        post("/api/scan", null);
        long a = songId("a");

        Files.delete(ROOT.resolve("Rock/a.mp3"));
        post("/api/scan", null).andExpect(jsonPath("$.missing").value(1));

        get("/api/songs/{id}", a).andExpect(jsonPath("$.available").value(false));
    }

    @Test
    void sameContentInTwoPlacesIsOneSong() throws Exception {
        audio("Rock/a.mp3");
        Files.createDirectories(ROOT.resolve("Pop"));
        Files.copy(ROOT.resolve("Rock/a.mp3"), ROOT.resolve("Pop/a.mp3"));

        post("/api/scan", null).andExpect(jsonPath("$.added").value(1));
        get("/api/songs").andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].paths", containsInAnyOrder("Rock/a.mp3", "Pop/a.mp3")));
    }
}
