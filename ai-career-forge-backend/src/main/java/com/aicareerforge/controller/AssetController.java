package com.aicareerforge.controller;

import com.aicareerforge.model.User;
import com.aicareerforge.security.AssetAccessPolicy;
import com.aicareerforge.service.S3Service;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.util.UriUtils;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;

@Slf4j
@RestController
@RequestMapping("/api/v1/public")
public class AssetController {

    static final int MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    private static final Set<String> IMAGE_HOSTS = Set.of(
            "pollinations.ai", "image.pollinations.ai", "unsplash.com", "images.unsplash.com");
    private static final Set<String> IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif");
    private final S3Service s3Service;
    private final HttpClient imageClient;

    @Autowired
    public AssetController(S3Service s3Service) {
        this(s3Service, HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER)
                .connectTimeout(Duration.ofSeconds(5)).build());
    }

    AssetController(S3Service s3Service, HttpClient imageClient) {
        this.s3Service = s3Service;
        this.imageClient = imageClient;
    }

    @GetMapping("/external/proxy")
    public ResponseEntity<byte[]> proxyExternalImage(@RequestParam("url") String externalUrl) {
        URI uri;
        try {
            uri = URI.create(externalUrl);
        } catch (IllegalArgumentException | NullPointerException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null
                || !IMAGE_HOSTS.contains(uri.getHost().toLowerCase(Locale.ROOT))
                || uri.getUserInfo() != null || (uri.getPort() != -1 && uri.getPort() != 443)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        CompletableFuture<HttpResponse<byte[]>> pending = null;
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uri).header("User-Agent", "Zenith-Image-Proxy")
                    .header("Accept", String.join(", ", IMAGE_TYPES))
                    .timeout(Duration.ofSeconds(15)).GET().build();
            pending = imageClient.sendAsync(request, ignored -> new LimitedImageSubscriber());
            // This deadline includes the response body, including slow/chunked streams.
            HttpResponse<byte[]> response = pending.get(15, TimeUnit.SECONDS);
            if (response.statusCode() != 200) return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
            String contentType = response.headers().firstValue("Content-Type").orElse("")
                    .split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
            byte[] content = response.body();
            if (!IMAGE_TYPES.contains(contentType) || content == null || content.length > MAX_IMAGE_BYTES
                    || !matchesImageType(content, contentType)) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
            }
            return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType))
                    .header("Cache-Control", "public, max-age=3600")
                    .header("X-Content-Type-Options", "nosniff").body(content);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        } catch (Exception e) {
            log.debug("External image unavailable ({})", e.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        } finally {
            if (pending != null && !pending.isDone()) pending.cancel(true);
        }
    }

    /**
     * Streams an S3 asset directly to resolve CORS issues with redirects.
     * Path pattern: /api/v1/public/assets/**
     */
    @GetMapping("/assets/**")
    public ResponseEntity<byte[]> serveAsset(HttpServletRequest request, @AuthenticationPrincipal User user) {
        String fullPath = request.getRequestURI();
        int prefix = fullPath.indexOf("/assets/");
        if (prefix < 0) return ResponseEntity.notFound().build();
        try {
            String key = UriUtils.decode(fullPath.substring(prefix + 8), StandardCharsets.UTF_8);
            if (!AssetAccessPolicy.isValidKey(key)) return ResponseEntity.notFound().build();
            if (!AssetAccessPolicy.isPublicKey(key)) {
                if (user == null || !AssetAccessPolicy.isOwnedKey(key, user.getId())) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .header("Cache-Control", "private, no-store").build();
                }
                String signedUrl = s3Service.getPrivateAssetUrl(key, user.getId());
                if (signedUrl == null) return ResponseEntity.notFound().build();
                return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(signedUrl))
                        .header("Cache-Control", "private, no-store").build();
            }
            // Public videos use signed redirects to support range requests without buffering.
            if (key.contains("/videos/") || key.endsWith(".mp4") || key.endsWith(".webm") || key.endsWith(".ogg") || key.endsWith(".mov")) {
                String presignedUrl = s3Service.getPresignedUrl(key);
                return ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(presignedUrl))
                        .header("Cache-Control", "public, max-age=3600")
                        .build();
            }

            byte[] content = s3Service.downloadFile(key);
            String contentType = "application/octet-stream";
            
            if (key.endsWith(".jpg") || key.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (key.endsWith(".png")) contentType = "image/png";
            else if (key.endsWith(".webp")) contentType = "image/webp";
            else if (key.endsWith(".gif")) contentType = "image/gif";
            else if (key.endsWith(".avif")) contentType = "image/avif";
            else if (key.endsWith(".pdf")) contentType = "application/pdf";
            
            String filename = key.contains("/") ? key.substring(key.lastIndexOf("/") + 1) : key;
            String downloadParam = request.getParameter("download");
            
            org.springframework.http.ResponseEntity.BodyBuilder responseBuilder = ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header("Cache-Control", "public, max-age=3600")
                    .header("X-Content-Type-Options", "nosniff")
                    .header("X-ZENITH-ASSET", "TRUE");
            
            if ("true".equalsIgnoreCase(downloadParam)) {
                responseBuilder.header("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            } else {
                responseBuilder.header("Content-Disposition", "inline; filename=\"" + filename + "\"");
            }
            
            return responseBuilder.body(content);
        } catch (Exception e) {
            log.debug("Asset unavailable ({})", e.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).header("Cache-Control", "no-store").build();
        }
    }

    private static boolean matchesImageType(byte[] body, String type) {
        if (body.length < 12) return false;
        return switch (type) {
            case "image/jpeg" -> body[0] == (byte) 0xff && body[1] == (byte) 0xd8 && body[2] == (byte) 0xff;
            case "image/png" -> body[0] == (byte) 0x89 && ascii(body, 1, 3).equals("PNG")
                    && body[4] == 13 && body[5] == 10 && body[6] == 26 && body[7] == 10;
            case "image/gif" -> ascii(body, 0, 6).equals("GIF87a") || ascii(body, 0, 6).equals("GIF89a");
            case "image/webp" -> ascii(body, 0, 4).equals("RIFF") && ascii(body, 8, 4).equals("WEBP");
            case "image/avif" -> ascii(body, 4, 4).equals("ftyp")
                    && (ascii(body, 8, 4).equals("avif") || ascii(body, 8, 4).equals("avis"));
            default -> false;
        };
    }

    private static String ascii(byte[] body, int offset, int length) {
        return new String(body, offset, length, StandardCharsets.US_ASCII);
    }

    /** Cancels an oversized upstream stream before buffering more than the limit. */
    static final class LimitedImageSubscriber implements HttpResponse.BodySubscriber<byte[]> {
        private final CompletableFuture<byte[]> body = new CompletableFuture<>();
        private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        private Flow.Subscription subscription;

        @Override public CompletionStage<byte[]> getBody() { return body; }
        @Override public void onSubscribe(Flow.Subscription incoming) {
            subscription = incoming;
            incoming.request(Long.MAX_VALUE);
        }
        @Override public void onNext(List<ByteBuffer> buffers) {
            if (body.isDone()) return;
            for (ByteBuffer buffer : buffers) {
                if (buffer.remaining() > MAX_IMAGE_BYTES - bytes.size()) {
                    subscription.cancel();
                    body.completeExceptionally(new IllegalArgumentException("Image exceeds size limit"));
                    return;
                }
                byte[] chunk = new byte[buffer.remaining()];
                buffer.get(chunk);
                bytes.writeBytes(chunk);
            }
        }
        @Override public void onError(Throwable error) { body.completeExceptionally(error); }
        @Override public void onComplete() { body.complete(bytes.toByteArray()); }
    }
}
