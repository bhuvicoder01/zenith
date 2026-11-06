package com.aicareerforge.service;

import io.awspring.cloud.s3.S3Template;
import com.aicareerforge.security.AssetAccessPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.time.Duration;
import java.time.Instant;
import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3Service {

    private final S3Template s3Template;
    private final S3Presigner s3Presigner;
    private final Map<String, CachedPresignedUrl> presignedUrlCache = new ConcurrentHashMap<>();

    @Value("${spring.cloud.aws.s3.bucket-name:ai-career-forge-users-data-bucket}")
    private String bucketName;

    @Value("${app.backend-url:http://localhost:8080}")
    private String backendUrl;

    public String uploadFile(byte[] content, String originalFilename, String userId) {
        return uploadFile(content, originalFilename, userId, "resumes");
    }

    public String uploadFile(byte[] content, String originalFilename, String userId, String type) {
        // Clean filename: remove special characters and spaces
        String cleanName = originalFilename != null ? originalFilename.replaceAll("[^a-zA-Z0-9.-]", "_") : "unnamed";
        String key = String.format("users/%s/%s/%d-%s", userId, type, System.currentTimeMillis(), cleanName);
        
        try {
            // Using S3Template to upload
            s3Template.upload(bucketName, key, new java.io.ByteArrayInputStream(content));
            return key;
        } catch (Exception e) {
            log.error("S3 Upload Failed for key: {} - Error: {}", key, e.getMessage(), e);
            throw new RuntimeException("S3 Storage Error: " + e.getMessage());
        }
    }

    public String uploadFile(java.io.InputStream inputStream, String originalFilename, String userId, String type) {
        // Clean filename: remove special characters and spaces
        String cleanName = originalFilename != null ? originalFilename.replaceAll("[^a-zA-Z0-9.-]", "_") : "unnamed";
        String key = String.format("users/%s/%s/%d-%s", userId, type, System.currentTimeMillis(), cleanName);
        
        try {
            // Stream directly using S3Template
            s3Template.upload(bucketName, key, inputStream);
            return key;
        } catch (Exception e) {
            log.error("S3 Upload Failed for key: {} - Error: {}", key, e.getMessage(), e);
            throw new RuntimeException("S3 Storage Error: " + e.getMessage());
        }
    }

    public byte[] downloadFile(String key) {
        log.info("Downloading file from S3: {}", key);
        try {
            return s3Template.download(bucketName, key).getContentAsByteArray();
        } catch (Exception e) {
            log.error("S3 Download Failed for key: {} - Error: {}", key, e.getMessage());
            throw new RuntimeException("S3 Download Error: " + e.getMessage());
        }
    }

    /**
     * Returns a permanent URL that redirects to a fresh presigned URL.
     * This URL never expires as it's anchored to our backend.
     */
    public String getPermanentUrl(String key) {
        if (key == null || key.isBlank()) return null;
        return backendUrl + "/api/v1/public/assets/" + key;
    }

    /**
     * Issues a short-lived URL only for an authenticated owner's object. Callers
     * must pass the server-selected owner, never an ID from a request body.
     * Also refreshes legacy backend and expired S3 URLs without trusting their
     * embedded query/signature or signing another owner's key.
     */
    public String getPrivateAssetUrl(String value, String ownerId) {
        String key = privateObjectKey(value);
        if (!AssetAccessPolicy.isOwnedKey(key, ownerId)) return null;
        boolean isPdf = key.toLowerCase(java.util.Locale.ROOT).endsWith(".pdf");
        String filename = key.substring(key.lastIndexOf('/') + 1);
        GetObjectRequest objectRequest = GetObjectRequest.builder().bucket(bucketName).key(key)
                .responseContentType(isPdf ? "application/pdf" : "application/octet-stream")
                .responseContentDisposition((isPdf ? "inline" : "attachment") + "; filename=\"" + filename + "\"")
                .responseCacheControl("private, no-store").build();
        GetObjectPresignRequest request = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15)).getObjectRequest(objectRequest).build();
        return s3Presigner.presignGetObject(request).url().toString();
    }

    private String privateObjectKey(String value) {
        if (value == null || value.isBlank()) return null;
        if (value.startsWith("users/")) return value;
        try {
            URI uri = URI.create(value);
            URI backend = URI.create(backendUrl);
            if (uri.getUserInfo() != null || uri.getHost() == null) return null;
            String assetPrefix = "/api/v1/public/assets/";
            if (java.util.Objects.equals(uri.getScheme(), backend.getScheme())
                    && uri.getHost().equalsIgnoreCase(backend.getHost()) && uri.getPort() == backend.getPort()
                    && uri.getPath().startsWith(assetPrefix)) {
                return uri.getPath().substring(assetPrefix.length());
            }
            String host = uri.getHost().toLowerCase(java.util.Locale.ROOT);
            if ("https".equalsIgnoreCase(uri.getScheme())
                    && (host.equals(bucketName + ".s3.amazonaws.com")
                        || (host.startsWith(bucketName + ".s3.") && host.endsWith(".amazonaws.com")))) {
                return uri.getPath().startsWith("/") ? uri.getPath().substring(1) : null;
            }
        } catch (IllegalArgumentException exception) {
            // Unknown external URLs and malformed legacy values are not private assets.
        }
        return null;
    }

    public String getProxyUrl(String externalUrl) {
        if (externalUrl == null || externalUrl.isBlank()) return null;
        try {
            String encodedUrl = java.net.URLEncoder.encode(externalUrl, java.nio.charset.StandardCharsets.UTF_8);
            return backendUrl + "/api/v1/public/external/proxy?url=" + encodedUrl;
        } catch (Exception e) {
            return externalUrl;
        }
    }

    public String getPresignedUrl(String key) {
        if (key == null || key.isBlank()) return null;

        CachedPresignedUrl cached = presignedUrlCache.get(key);
        if (cached != null && !cached.isExpired()) {
            log.debug("Returning cached presigned URL for key: {}", key);
            return cached.url;
        }

        log.info("Generating fresh presigned URL for key: {}", key);
        
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        Duration duration = Duration.ofHours(24);
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(duration)
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
        String url = presignedRequest.url().toString();

        // Cache the URL, expiring 1 hour before S3 signature expires for buffer safety
        Instant expiresAt = Instant.now().plus(duration).minus(Duration.ofHours(1));
        presignedUrlCache.put(key, new CachedPresignedUrl(url, expiresAt));

        return url;
    }

    public void deleteFile(String key) {
        if (key == null || key.isBlank()) return;
        presignedUrlCache.remove(key);
        try {
            s3Template.deleteObject(bucketName, key);
            log.info("Deleted S3 object: {}", key);
        } catch (Exception e) {
            log.warn("Failed to delete S3 object: {} - Error: {}", key, e.getMessage());
        }
    }

    private static class CachedPresignedUrl {
        private final String url;
        private final Instant expiresAt;

        public CachedPresignedUrl(String url, Instant expiresAt) {
            this.url = url;
            this.expiresAt = expiresAt;
        }

        public boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }
}
