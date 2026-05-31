package com.aicareerforge.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Abstraction over the job match score cache.
 * Primary: Redis (survives restarts, scales horizontally).
 * Fallback: In-memory ConcurrentHashMap (when Redis is unavailable).
 *
 * Callers never need to know which backend is active — the interface is the same.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JobScoreCache {

    private static final String REDIS_KEY_PREFIX = "job_score:";
    private static final Duration SCORE_TTL = Duration.ofHours(6);

    private final RedisTemplate<String, Object> redisTemplate;

    // In-memory fallback when Redis is down
    private final Map<String, Map<String, Double>> localCache = new ConcurrentHashMap<>();

    /**
     * Store a match score for a (userId, jobId) pair.
     */
    public void putScore(String userId, String jobId, Double score) {
        if (userId == null || jobId == null || score == null) return;

        // Always write to local cache (fast)
        localCache.computeIfAbsent(userId, k -> new ConcurrentHashMap<>()).put(jobId, score);

        // Try Redis (async-safe — won't block if Redis is down)
        try {
            String redisKey = REDIS_KEY_PREFIX + userId;
            redisTemplate.opsForHash().put(redisKey, jobId, score);
            redisTemplate.expire(redisKey, SCORE_TTL);
        } catch (Exception e) {
            log.debug("Redis score cache write failed (using local fallback): {}", e.getMessage());
        }
    }

    /**
     * Retrieve a cached match score. Checks Redis first, falls back to local.
     *
     * @return the cached score, or null if not found
     */
    public Double getScore(String userId, String jobId) {
        if (userId == null || jobId == null) return null;

        // Try Redis first
        try {
            String redisKey = REDIS_KEY_PREFIX + userId;
            Object value = redisTemplate.opsForHash().get(redisKey, jobId);
            if (value instanceof Number num) {
                return num.doubleValue();
            }
        } catch (Exception e) {
            log.debug("Redis score cache read failed (using local fallback): {}", e.getMessage());
        }

        // Fallback to local
        Map<String, Double> userScores = localCache.get(userId);
        return (userScores != null) ? userScores.get(jobId) : null;
    }

    /**
     * Evict all cached scores for a user (e.g., after profile update or job purge).
     */
    public void evictUser(String userId) {
        if (userId == null) return;

        localCache.remove(userId);

        try {
            redisTemplate.delete(REDIS_KEY_PREFIX + userId);
        } catch (Exception e) {
            log.debug("Redis score cache evict failed: {}", e.getMessage());
        }
    }
}
