package com.github.ringedSeal.musicStreaming;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LibraryAndPlaylistTest extends AbstractIntegrationTest {

    @BeforeEach
    void scanSomeSongs() throws Exception {
        audio("Rock/a.mp3");
        audio("Rock/b.mp3");
        audio("c.mp3");
        post("/api/scan", null).andExpect(status().isOk());
    }

    @Test
    void emptyLibraryHasAllSongsUnorganized() throws Exception {
        long lib = id(post("/api/libraries", "{\"name\":\"Minha\"}").andExpect(status().isCreated()), "$.id");

        get("/api/libraries/{id}/tree", lib)
                .andExpect(jsonPath("$.isDefault").value(false))
                .andExpect(jsonPath("$.playlists", empty()))
                .andExpect(jsonPath("$.unorganizedSongs[*].title", contains("a", "b", "c")));

        patch("/api/libraries/{id}", "{\"name\":\"Renomeada\"}", lib)
                .andExpect(jsonPath("$.name").value("Renomeada"));
        delete("/api/libraries/{id}", lib).andExpect(status().isNoContent());
        get("/api/libraries/{id}", lib).andExpect(status().isNotFound());
    }

    @Test
    void defaultLibraryCannotBeDeleted() throws Exception {
        delete("/api/libraries/{id}", defaultLibraryId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void validationErrorsReturn400() throws Exception {
        post("/api/libraries", "{\"name\":\" \"}").andExpect(status().isBadRequest());
        post("/api/songs/{id}/tags", "{}", songId("a")).andExpect(status().isBadRequest());
    }

    @Test
    void createRenameMoveAndDeleteNestedPlaylists() throws Exception {
        long lib = id(post("/api/libraries", "{\"name\":\"Minha\"}"), "$.id");
        long parent = id(post("/api/libraries/{id}/playlists", "{\"name\":\"Pai\"}", lib), "$.id");
        long child = id(post("/api/libraries/{id}/playlists",
                "{\"name\":\"Filho\",\"parentId\":" + parent + "}", lib), "$.id");
        long grandchild = id(post("/api/libraries/{id}/playlists",
                "{\"name\":\"Neto\",\"parentId\":" + child + "}", lib), "$.id");

        // ciclo
        patch("/api/playlists/{id}", "{\"parentId\":" + grandchild + "}", parent)
                .andExpect(status().isConflict());

        // renomear não mexe no pai
        patch("/api/playlists/{id}", "{\"name\":\"Filha\"}", child)
                .andExpect(jsonPath("$.name").value("Filha"))
                .andExpect(jsonPath("$.parentId").value((int) parent));

        // mover para a raiz
        patch("/api/playlists/{id}", "{\"parentId\":null}", grandchild)
                .andExpect(jsonPath("$.parentId").value(nullValue()));
        get("/api/libraries/{id}/playlists", lib).andExpect(jsonPath("$[*].name", contains("Pai", "Neto")));

        // mover de volta para dentro de outra playlist
        patch("/api/playlists/{id}", "{\"parentId\":" + parent + "}", grandchild)
                .andExpect(status().isOk());
        get("/api/playlists/{id}", parent).andExpect(jsonPath("$.children[*].name", contains("Filha", "Neto")));

        // outra biblioteca
        long rock = id(get("/api/libraries/{id}/playlists", defaultLibraryId()), "$[0].id");
        patch("/api/playlists/{id}", "{\"parentId\":" + rock + "}", child).andExpect(status().isConflict());

        // apagar o pai apaga os filhos
        delete("/api/playlists/{id}", parent).andExpect(status().isNoContent());
        get("/api/playlists/{id}", child).andExpect(status().isNotFound());
        get("/api/playlists/{id}", grandchild).andExpect(status().isNotFound());
    }

    @Test
    void addReorderAndRemoveSongs() throws Exception {
        long lib = id(post("/api/libraries", "{\"name\":\"Minha\"}"), "$.id");
        long pl = id(post("/api/libraries/{id}/playlists", "{\"name\":\"Mix\"}", lib), "$.id");
        long a = songId("a"), b = songId("b"), c = songId("c");

        post("/api/playlists/{id}/songs", "{\"songIds\":[" + a + "," + b + "," + c + "," + a + "]}", pl)
                .andExpect(jsonPath("$[*].title", contains("a", "b", "c")));

        put("/api/playlists/{id}/songs/order", "{\"songIds\":[" + c + "," + a + "," + b + "]}", pl)
                .andExpect(jsonPath("$[*].title", contains("c", "a", "b")));
        put("/api/playlists/{id}/songs/order", "{\"songIds\":[" + c + "]}", pl)
                .andExpect(status().isBadRequest());

        delete("/api/playlists/{id}/songs/{s}", pl, a).andExpect(status().isNoContent());
        get("/api/playlists/{id}/songs", pl).andExpect(jsonPath("$[*].title", contains("c", "b")));
        get("/api/libraries/{id}/tree", lib).andExpect(jsonPath("$.unorganizedSongs[*].title", contains("a")));

        post("/api/playlists/{id}/songs", "{\"songIds\":[99999]}", pl).andExpect(status().isNotFound());
    }

    @Test
    void favoritesAndTags() throws Exception {
        long a = songId("a");
        put("/api/songs/{id}/favorite", null, a).andExpect(jsonPath("$.favorite").value(true));
        get("/api/songs?favorite=true").andExpect(jsonPath("$.content[*].title", contains("a")));

        long tag = id(post("/api/songs/{id}/tags", "{\"name\":\"  Chill \"}", a), "$.tags[0].id");
        get("/api/tags").andExpect(jsonPath("$[*].name", contains("chill")));
        post("/api/tags", "{\"name\":\"CHILL\"}").andExpect(status().isConflict());
        get("/api/songs?tag=chill").andExpect(jsonPath("$.content[*].title", contains("a")));

        long pl = id(get("/api/libraries/{id}/playlists", defaultLibraryId()), "$[0].id");
        post("/api/playlists/{id}/tags", "{\"tagId\":" + tag + "}", pl)
                .andExpect(jsonPath("$.tags[*].name", contains("chill")));

        delete("/api/tags/{id}", tag).andExpect(status().isNoContent());
        get("/api/songs/{id}", a).andExpect(jsonPath("$.tags", empty()));
        get("/api/playlists/{id}", pl).andExpect(jsonPath("$.tags", empty()));

        delete("/api/songs/{id}/favorite", a).andExpect(jsonPath("$.favorite").value(false));
    }
}
