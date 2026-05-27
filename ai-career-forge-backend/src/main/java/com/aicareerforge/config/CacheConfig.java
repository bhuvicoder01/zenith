package com.aicareerforge.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.beans.factory.ObjectProvider;
import java.util.Arrays;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Configuration
@EnableCaching
public class CacheConfig implements CachingConfigurer {

    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Redis GET error for cache {}: {}", cache.getName(), exception.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
                log.warn("Redis PUT error for cache {}: {}", cache.getName(), exception.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Redis EVICT error for cache {}: {}", cache.getName(), exception.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException exception, Cache cache) {
                log.warn("Redis CLEAR error for cache {}: {}", cache.getName(), exception.getMessage());
            }
        };
    }

    private RedisCacheConfiguration createConfiguration(Duration ttl) {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.activateDefaultTyping(LaissezFaireSubTypeValidator.instance, ObjectMapper.DefaultTyping.NON_FINAL, JsonTypeInfo.As.PROPERTY);

        GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(mapper);

        return RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(ttl)
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(serializer));
    }

    @Bean
    public RedisCacheConfiguration cacheConfiguration() {
        return createConfiguration(Duration.ofHours(1));
    }

    @Bean
    public CacheManager cacheManager(ObjectProvider<RedisConnectionFactory> connectionFactoryProvider) {
        try {
            log.info("Checking Redis connection availability...");
            RedisConnectionFactory connectionFactory = connectionFactoryProvider.getIfAvailable();
            if (connectionFactory == null) {
                throw new IllegalStateException("RedisConnectionFactory bean is not available.");
            }
            connectionFactory.getConnection().close();
            log.info("Redis is available. Using RedisCacheManager.");

            RedisCacheConfiguration baseConfig = cacheConfiguration();

            // Specific configurations for different cache names
            Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();
            cacheConfigurations.put("jobDashboard", createConfiguration(Duration.ofMinutes(30)));
            cacheConfigurations.put("recommendedJobs", createConfiguration(Duration.ofHours(2)));
            cacheConfigurations.put("jobCatalog", createConfiguration(Duration.ofMinutes(10)));

            return RedisCacheManager.builder(connectionFactory)
                    .cacheDefaults(baseConfig)
                    .withInitialCacheConfigurations(cacheConfigurations)
                    .build();
        } catch (Exception e) {
            log.warn("Redis is not available, falling back to ConcurrentMapCacheManager. Error: {}", e.getMessage());
            ConcurrentMapCacheManager fallbackCacheManager = new ConcurrentMapCacheManager();
            fallbackCacheManager.setCacheNames(Arrays.asList("jobDashboard", "recommendedJobs", "jobCatalog"));
            return fallbackCacheManager;
        }
    }
}
