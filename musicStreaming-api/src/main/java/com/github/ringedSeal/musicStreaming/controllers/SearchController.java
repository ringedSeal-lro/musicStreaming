package com.github.ringedSeal.musicStreaming.controllers;

import com.github.ringedSeal.musicStreaming.dto.SearchResultDTO;
import com.github.ringedSeal.musicStreaming.services.SearchService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public SearchResultDTO search(@RequestParam("q") String query,
                                  @RequestParam(required = false) Long libraryId) {
        return searchService.search(query, libraryId);
    }
}
