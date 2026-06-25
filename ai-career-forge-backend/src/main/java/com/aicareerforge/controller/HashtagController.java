package com.aicareerforge.controller;

import com.aicareerforge.model.Hashtag;
import com.aicareerforge.service.HashtagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/hashtags")
@RequiredArgsConstructor
public class HashtagController {

    private final HashtagService hashtagService;

    @GetMapping
    public ResponseEntity<List<Hashtag>> getAllHashtags() {
        return ResponseEntity.ok(hashtagService.getAllHashtags());
    }

    @PostMapping
    public ResponseEntity<Hashtag> createHashtag(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        return ResponseEntity.ok(hashtagService.saveHashtag(name));
    }
}
