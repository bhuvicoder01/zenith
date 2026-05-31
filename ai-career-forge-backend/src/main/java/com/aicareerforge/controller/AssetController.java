package com.aicareerforge.controller;

import com.aicareerforge.service.S3Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestParam;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
public class AssetController {

    private final S3Service s3Service;

    @GetMapping("/external/proxy")
    public ResponseEntity<byte[]> proxyExternalImage(@RequestParam("url") String externalUrl) {
        log.debug("Proxying external image: {}", externalUrl);
        
        // Security: Only allow specific domains to prevent SSRF
        boolean isAllowed = List.of("pollinations.ai", "image.pollinations.ai", "unsplash.com", "images.unsplash.com")
                .stream().anyMatch(externalUrl::contains);
        
        if (!isAllowed) {
            log.warn("Blocking proxy request to unauthorized domain: {}", externalUrl);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            // Using a more robust way to handle URLs with spaces/special chars
            java.net.URL url = new java.net.URL(externalUrl);
            URI uri = new URI(url.getProtocol(), url.getUserInfo(), url.getHost(), url.getPort(), url.getPath(), url.getQuery(), url.getRef());

            HttpClient client = HttpClient.newBuilder()
                    .followRedirects(HttpClient.Redirect.ALWAYS)
                    .build();
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uri)
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .timeout(java.time.Duration.ofSeconds(60))
                    .build();

            HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
            
            // Fallback to a high-quality professional background if 429 persists
            if (response.statusCode() == 429) {
                log.warn("Rate limit still active. Serving high-quality fallback for: {}", externalUrl);
                String fallbackUrl = "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1200";
                request = HttpRequest.newBuilder()
                        .uri(URI.create(fallbackUrl))
                        .header("User-Agent", "Mozilla/5.0")
                        .build();
                response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
            }

            if (response.statusCode() == 200) {
                String contentType = response.headers().firstValue("Content-Type").orElse("image/jpeg");
                
                // Force a valid image content type if the server returns something generic
                if (contentType.contains("text/plain") || contentType.contains("application/octet-stream")) {
                    contentType = "image/jpeg";
                }

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header("Cache-Control", "public, max-age=3600")
                        .header("X-Content-Type-Options", "nosniff")
                        .body(response.body());
            } else {
                log.error("Failed to fetch external image from {}. Status: {}", externalUrl, response.statusCode());
                return ResponseEntity.status(response.statusCode()).build();
            }
        } catch (Exception e) {
            log.error("Proxy error for URL: {} - Error: {}", externalUrl, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Streams an S3 asset directly to resolve CORS issues with redirects.
     * Path pattern: /api/v1/public/assets/**
     */
    @GetMapping("/assets/**")
    public ResponseEntity<byte[]> serveAsset(HttpServletRequest request) {
        String fullPath = request.getRequestURI();
        // Extract the key after /api/v1/public/assets/
        String key = fullPath.substring(fullPath.indexOf("/assets/") + 8);
        
        log.debug("Serving asset from S3: {}", key);
        
        try {
            byte[] content = s3Service.downloadFile(key);
            String contentType = "application/octet-stream";
            
            if (key.endsWith(".jpg") || key.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (key.endsWith(".png")) contentType = "image/png";
            else if (key.endsWith(".pdf")) contentType = "application/pdf";
            
            String filename = key.contains("/") ? key.substring(key.lastIndexOf("/") + 1) : key;
            String downloadParam = request.getParameter("download");
            
            org.springframework.http.ResponseEntity.BodyBuilder responseBuilder = ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header("Cache-Control", "no-store, no-cache, must-revalidate")
                    .header("X-Content-Type-Options", "nosniff")
                    .header("X-Frame-Options", "ALLOWALL")
                    .header("X-ZENITH-ASSET", "TRUE");
            
            if ("true".equalsIgnoreCase(downloadParam)) {
                responseBuilder.header("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            } else {
                responseBuilder.header("Content-Disposition", "inline; filename=\"" + filename + "\"");
            }
            
            return responseBuilder.body(content);
        } catch (Exception e) {
            log.error("Failed to serve asset for key: {}", key, e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
}
