package com.aicareerforge.service;

import com.aicareerforge.model.Hashtag;
import com.aicareerforge.repository.HashtagRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Arrays;

@Slf4j
@Service
@RequiredArgsConstructor
public class HashtagService {

    private final HashtagRepository hashtagRepository;

    @PostConstruct
    public void seedDefaultHashtags() {
        List<String> defaultTags = Arrays.asList(
            "career", "ai", "recruiting", "developer", "technology", "webdev", 
            "resume", "interview", "zenith", "software", "productivity", "internship", "jobs", "placement"
        );

        for (String tag : defaultTags) {
            String cleanName = tag.trim().toLowerCase();
            if (!hashtagRepository.existsByNameIgnoreCase(cleanName)) {
                Hashtag hashtag = Hashtag.builder()
                        .name(cleanName)
                        .createdAt(Instant.now())
                        .build();
                try {
                    hashtagRepository.save(hashtag);
                    log.info("Seeded default hashtag: {}", cleanName);
                } catch (Exception e) {
                    log.warn("Failed to seed default hashtag {} (might already exist): {}", cleanName, e.getMessage());
                }
            }
        }
    }

    public List<Hashtag> getAllHashtags() {
        return hashtagRepository.findAll();
    }

    public Hashtag saveHashtag(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Hashtag name cannot be empty");
        }
        
        String cleanName = name.trim().replaceAll("[#\\s]", "").toLowerCase();
        if (cleanName.isEmpty()) {
            throw new IllegalArgumentException("Hashtag name cannot be empty");
        }

        Optional<Hashtag> existing = hashtagRepository.findByNameIgnoreCase(cleanName);
        if (existing.isPresent()) {
            return existing.get();
        }

        Hashtag hashtag = Hashtag.builder()
                .name(cleanName)
                .createdAt(Instant.now())
                .build();

        log.info("Saving new hashtag: {}", cleanName);
        try {
            return hashtagRepository.save(hashtag);
        } catch (Exception e) {
            // In case of concurrency/unique key index race, try to fetch again
            existing = hashtagRepository.findByNameIgnoreCase(cleanName);
            if (existing.isPresent()) {
                return existing.get();
            }
            throw e;
        }
    }
}
