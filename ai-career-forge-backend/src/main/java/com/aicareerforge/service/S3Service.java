package com.aicareerforge.service;

import io.awspring.cloud.s3.S3Template;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3Service {

    private final S3Template s3Template;
    private final S3Presigner s3Presigner;

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
        log.info("Generating fresh presigned URL for key: {}", key);
        
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(24)) // Increased to 24h
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
        return presignedRequest.url().toString();
    }

    public void deleteFile(String key) {
        if (key == null || key.isBlank()) return;
        try {
            s3Template.deleteObject(bucketName, key);
            log.info("Deleted S3 object: {}", key);
        } catch (Exception e) {
            log.warn("Failed to delete S3 object: {} - Error: {}", key, e.getMessage());
        }
    }
}
