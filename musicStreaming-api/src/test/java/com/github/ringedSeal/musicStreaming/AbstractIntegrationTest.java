package com.github.ringedSeal.musicStreaming;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.cache.CacheManager;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.stream.Stream;

@SpringBootTest(properties = {
        "music.scan-on-startup=false",
        "spring.datasource.url=jdbc:h2:mem:musictest;DB_CLOSE_DELAY=-1"
})
@AutoConfigureMockMvc
public abstract class AbstractIntegrationTest {

    protected static final Path ROOT;

    static {
        try {
            ROOT = Files.createTempDirectory("music-root");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("music.root", ROOT::toString);
    }

    @Autowired
    protected MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private CacheManager cacheManager;

    @BeforeEach
    void resetState() throws IOException {
        try (Stream<Path> walk = Files.walk(ROOT)) {
            walk.sorted(Comparator.reverseOrder()).filter(p -> !p.equals(ROOT)).forEach(p -> p.toFile().delete());
        }
        jdbc.execute("SET REFERENTIAL_INTEGRITY FALSE");
        for (String table : jdbc.queryForList(
                "select table_name from information_schema.tables where table_schema = 'PUBLIC'", String.class)) {
            jdbc.execute("TRUNCATE TABLE \"" + table + "\" RESTART IDENTITY");
        }
        jdbc.execute("SET REFERENTIAL_INTEGRITY TRUE");
        cacheManager.getCacheNames().forEach(n -> cacheManager.getCache(n).clear());
    }

    /** Cria um "mp3" falso com conteúdo único (o título vira o nome do arquivo). */
    protected static Path audio(String relative) throws IOException {
        Path file = ROOT.resolve(relative);
        Files.createDirectories(file.getParent());
        Files.writeString(file, "fake-audio:" + relative + ":" + System.nanoTime());
        return file;
    }

    // ---- helpers HTTP ----

    protected ResultActions get(String url, Object... args) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(url, args));
    }

    protected ResultActions post(String url, String json, Object... args) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(url, args)
                .contentType(MediaType.APPLICATION_JSON).content(json == null ? "" : json));
    }

    protected ResultActions patch(String url, String json, Object... args) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(url, args)
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    protected ResultActions put(String url, String json, Object... args) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(url, args)
                .contentType(MediaType.APPLICATION_JSON).content(json == null ? "" : json));
    }

    protected ResultActions delete(String url, Object... args) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(url, args));
    }

    protected static <T> T json(ResultActions result, String path) throws Exception {
        return JsonPath.read(result.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8), path);
    }

    protected static long id(ResultActions result, String path) throws Exception {
        return ((Number) json(result, path)).longValue();
    }

    protected long defaultLibraryId() throws Exception {
        java.util.List<Number> ids = json(get("/api/libraries"), "$[?(@.isDefault == true)].id");
        return ids.get(0).longValue();
    }

    /** Id da música pelo título (via busca). */
    protected long songId(String title) throws Exception {
        return id(get("/api/search?q={q}", title), "$.songs[0].id");
    }
}
