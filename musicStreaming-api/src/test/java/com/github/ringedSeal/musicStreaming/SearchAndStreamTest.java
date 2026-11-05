package com.github.ringedSeal.musicStreaming;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

import java.nio.file.Files;

import static org.hamcrest.Matchers.*;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SearchAndStreamTest extends AbstractIntegrationTest {

    @Test
    void searchPrioritizesNameThenTags() throws Exception {
        audio("Rock/Rocket.mp3");
        audio("Rock/Hard Rock Café.mp3");
        audio("Chill/Blue.mp3");
        audio("Chill/Other.mp3");
        post("/api/scan", null);

        long blue = songId("Blue");
        post("/api/songs/{id}/tags", "{\"name\":\"rock\"}", blue);
        long chill = id(get("/api/search?q=chill"), "$.playlists[0].id");
        post("/api/playlists/{id}/tags", "{\"name\":\"rock\"}", chill);

        get("/api/search?q=ROCK")
                .andExpect(jsonPath("$.songs[*].title", contains("Rocket", "Hard Rock Café", "Blue")))
                .andExpect(jsonPath("$.playlists[*].name", contains("Rock", "Chill")));

        // sem acento acha com acento
        get("/api/search?q=cafe").andExpect(jsonPath("$.songs[*].title", contains("Hard Rock Café")));
        // curingas do LIKE são tratados como texto
        get("/api/search?q=%25").andExpect(jsonPath("$.songs", empty()));
    }

    @Test
    void streamSupportsRangeRequests() throws Exception {
        Files.createDirectories(ROOT.resolve("Rock"));
        Files.writeString(ROOT.resolve("Rock/song.mp3"), "0123456789");
        post("/api/scan", null);
        long id = songId("song");

        mvc.perform(MockMvcRequestBuilders.get("/api/songs/{id}/stream", id))
                .andExpect(status().isOk())
                .andExpect(content().contentType("audio/mpeg"))
                .andExpect(content().string("0123456789"));

        mvc.perform(MockMvcRequestBuilders.get("/api/songs/{id}/stream", id).header(HttpHeaders.RANGE, "bytes=2-5"))
                .andExpect(status().isPartialContent())
                .andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes 2-5/10"))
                .andExpect(content().string("2345"));

        mvc.perform(MockMvcRequestBuilders.get("/api/songs/{id}/stream", 9999)).andExpect(status().isNotFound());
    }
}
