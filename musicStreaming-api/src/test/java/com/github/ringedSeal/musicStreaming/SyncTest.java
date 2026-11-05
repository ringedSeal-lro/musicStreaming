package com.github.ringedSeal.musicStreaming;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SyncTest extends AbstractIntegrationTest {

    @Test
    void syncCustomLibraryReshapesFolders() throws Exception {
        audio("Rock/a.mp3");
        audio("Pop/b.mp3");
        audio("c.mp3");
        post("/api/scan", null);
        long a = songId("a"), b = songId("b");

        long lib = id(post("/api/libraries", "{\"name\":\"Mix\"}"), "$.id");
        long fav = id(post("/api/libraries/{id}/playlists", "{\"name\":\"Fav/Top\"}", lib), "$.id");
        long sub = id(post("/api/libraries/{id}/playlists", "{\"name\":\"Sub\",\"parentId\":" + fav + "}", lib), "$.id");
        post("/api/playlists/{id}/songs", "{\"songIds\":[" + a + "," + b + "]}", fav);
        post("/api/playlists/{id}/songs", "{\"songIds\":[" + a + "]}", sub);

        // dry run: mostra o plano e não mexe no disco
        post("/api/libraries/{id}/sync?dryRun=true", null, lib).andExpect(status().isOk())
                .andExpect(jsonPath("$.dryRun").value(true))
                .andExpect(jsonPath("$.operations[*].type", hasItems("MKDIR", "MOVE", "LINK", "RMDIR")));
        assertThat(ROOT.resolve("Rock/a.mp3")).exists();
        assertThat(ROOT.resolve("Fav_Top")).doesNotExist();

        post("/api/libraries/{id}/sync", null, lib).andExpect(status().isOk())
                .andExpect(jsonPath("$.error").value(nullValue()));

        assertThat(ROOT.resolve("Fav_Top/a.mp3")).exists();
        assertThat(ROOT.resolve("Fav_Top/b.mp3")).exists();
        assertThat(ROOT.resolve("Fav_Top/Sub/a.mp3")).exists();
        assertThat(ROOT.resolve("c.mp3")).exists();
        assertThat(ROOT.resolve("Rock")).doesNotExist();
        assertThat(ROOT.resolve("Pop")).doesNotExist();

        // mesma música em duas pastas continua sendo uma só
        get("/api/songs/{id}", a).andExpect(jsonPath("$.paths",
                containsInAnyOrder("Fav_Top/a.mp3", "Fav_Top/Sub/a.mp3")));
        // sync de outra biblioteca não cria playlists na padrão
        get("/api/libraries/{id}/playlists", defaultLibraryId())
                .andExpect(jsonPath("$[*].name", containsInAnyOrder("Rock", "Pop")));
    }

    @Test
    void syncDefaultLibraryAfterRenameAndRescanCreatesNoDuplicates() throws Exception {
        audio("Rock/a.mp3");
        post("/api/scan", null);
        long lib = defaultLibraryId();
        long rock = id(get("/api/libraries/{id}/playlists", lib), "$[0].id");
        patch("/api/playlists/{id}", "{\"name\":\"Metal\"}", rock);

        post("/api/libraries/{id}/sync", null, lib).andExpect(jsonPath("$.error").value(nullValue()));
        assertThat(ROOT.resolve("Metal/a.mp3")).exists();
        assertThat(ROOT.resolve("Rock")).doesNotExist();

        post("/api/scan", null).andExpect(jsonPath("$.playlistsCreated").value(0));
        get("/api/libraries/{id}/playlists", lib).andExpect(jsonPath("$[*].name", contains("Metal")));
    }

    @Test
    void extraCopiesAreKeptInHiddenDuplicatesFolder() throws Exception {
        audio("Rock/a.mp3");
        Files.createDirectories(ROOT.resolve("Pop"));
        Files.copy(ROOT.resolve("Rock/a.mp3"), ROOT.resolve("Pop/a.mp3"));
        post("/api/scan", null);
        long a = songId("a");

        long lib = id(post("/api/libraries", "{\"name\":\"Só Rock\"}"), "$.id");
        long rock = id(post("/api/libraries/{id}/playlists", "{\"name\":\"Rock\"}", lib), "$.id");
        post("/api/playlists/{id}/songs", "{\"songIds\":[" + a + "]}", rock);

        post("/api/libraries/{id}/sync", null, lib).andExpect(jsonPath("$.error").value(nullValue()));
        assertThat(ROOT.resolve("Rock/a.mp3")).exists();
        assertThat(ROOT.resolve("Pop")).doesNotExist();
        assertThat(ROOT.resolve(".musicstreaming/duplicates/a.mp3")).exists();
        get("/api/songs/{id}", a).andExpect(jsonPath("$.paths", contains("Rock/a.mp3")));
    }
}
