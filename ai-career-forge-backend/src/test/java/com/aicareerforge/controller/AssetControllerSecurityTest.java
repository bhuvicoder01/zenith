package com.aicareerforge.controller;

import com.aicareerforge.model.User;
import com.aicareerforge.service.S3Service;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Flow;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AssetControllerSecurityTest {
    private S3Service s3;
    private HttpClient client;
    private AssetController controller;
    private final User alice = User.builder().id("alice").build();

    @BeforeEach
    void setUp() {
        s3 = mock(S3Service.class);
        client = mock(HttpClient.class);
        controller = new AssetController(s3, client);
    }

    @Test
    void anonymousAndForeignOwnersCannotDownloadOrSignPrivateAssets() {
        MockHttpServletRequest request = asset("users/alice/resumes/resume.pdf");
        request.addHeader("X-Guest-ID", "alice");
        assertEquals(HttpStatus.NOT_FOUND, controller.serveAsset(request, null).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, controller.serveAsset(request, User.builder().id("bob").build()).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND,
                controller.serveAsset(asset("users/alice2/resumes/resume.pdf"), alice).getStatusCode());
        verifyNoInteractions(s3);
    }

    @Test
    void authenticatedOwnerGetsShortLivedRedirectWithoutPublicCaching() {
        when(s3.getPrivateAssetUrl("users/alice/resumes/resume.pdf", "alice"))
                .thenReturn("https://bucket.s3.amazonaws.com/private-signed");
        var response = controller.serveAsset(asset("users/alice/resumes/resume.pdf"), alice);
        assertEquals(HttpStatus.FOUND, response.getStatusCode());
        assertEquals(URI.create("https://bucket.s3.amazonaws.com/private-signed"), response.getHeaders().getLocation());
        assertEquals("private, no-store", response.getHeaders().getCacheControl());
        verify(s3).getPrivateAssetUrl("users/alice/resumes/resume.pdf", "alice");
        verifyNoMoreInteractions(s3);
    }

    @Test
    void publicProfileImageRemainsAvailableWithoutAuthentication() {
        byte[] png = png();
        when(s3.downloadFile("users/alice/photos/photo.png")).thenReturn(png);
        var response = controller.serveAsset(asset("users/alice/photos/photo.png"), null);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertArrayEquals(png, response.getBody());
        assertEquals("image/png", response.getHeaders().getContentType().toString());
        verify(s3).downloadFile("users/alice/photos/photo.png");
    }

    @Test
    void invalidAndEncodedTraversalKeysNeverReachStorage() {
        for (String key : List.of("users/alice/resumes/%2e%2e/private.pdf",
                "users/alice/resumes/%252e%252e/private.pdf", "users/alice//file.pdf",
                "users/alice/resumes/%ZZ", "users/alice/resumes/a%5Cb.pdf")) {
            assertEquals(HttpStatus.NOT_FOUND, controller.serveAsset(asset(key), alice).getStatusCode(), key);
        }
        verifyNoInteractions(s3);
    }

    @Test
    void hostSpoofingProtocolsAndPortsAreRejectedBeforeNetwork() {
        for (String url : List.of("https://127.0.0.1/?images.unsplash.com",
                "https://attacker.invalid/images.unsplash.com/photo.png",
                "https://images.unsplash.com.attacker.invalid/photo.png",
                "https://images.unsplash.com@127.0.0.1/photo.png",
                "https://user@images.unsplash.com/photo.png", "http://images.unsplash.com/photo.png",
                "https://images.unsplash.com:8443/photo.png", "file:///images.unsplash.com",
                "not a URI")) {
            assertEquals(HttpStatus.FORBIDDEN, controller.proxyExternalImage(url).getStatusCode(), url);
        }
        verifyNoInteractions(client, s3);
    }

    @Test
    void acceptedImageHasItsTypeVerifiedAndUsesABoundedRequest() {
        upstream(200, "image/png; charset=binary", png());
        var response = controller.proxyExternalImage("https://images.unsplash.com/photo-test?w=800");
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("nosniff", response.getHeaders().getFirst("X-Content-Type-Options"));
        ArgumentCaptor<HttpRequest> request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(client).sendAsync(request.capture(), any(HttpResponse.BodyHandler.class));
        assertEquals(15, request.getValue().timeout().orElseThrow().getSeconds());
        assertEquals("images.unsplash.com", request.getValue().uri().getHost());
    }

    @Test
    void redirectsAreNotForwardedOrRetried() {
        upstream(302, "text/html", new byte[0]);
        assertEquals(HttpStatus.BAD_GATEWAY,
                controller.proxyExternalImage("https://images.unsplash.com/photo-test").getStatusCode());
        verify(client, times(1)).sendAsync(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    void htmlSvgAndSpoofedImageBodiesAreRejected() {
        for (String type : List.of("text/html", "image/svg+xml", "application/octet-stream", "image/jpeg")) {
            upstream(200, type, "<html>not an image</html>".getBytes(StandardCharsets.UTF_8));
            assertEquals(HttpStatus.BAD_GATEWAY,
                    controller.proxyExternalImage("https://images.unsplash.com/photo-test").getStatusCode(), type);
        }
    }

    @Test
    void streamingBodyIsCancelledAtSizeLimit() {
        var subscriber = new AssetController.LimitedImageSubscriber();
        Flow.Subscription subscription = mock(Flow.Subscription.class);
        subscriber.onSubscribe(subscription);
        subscriber.onNext(List.of(ByteBuffer.wrap(new byte[AssetController.MAX_IMAGE_BYTES])));
        subscriber.onNext(List.of(ByteBuffer.wrap(new byte[]{1})));
        assertTrue(subscriber.getBody().toCompletableFuture().isCompletedExceptionally());
        verify(subscription).cancel();
    }

    @SuppressWarnings("unchecked")
    private void upstream(int status, String type, byte[] body) {
        HttpResponse<byte[]> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.headers()).thenReturn(HttpHeaders.of(Map.of("Content-Type", List.of(type)), (a, b) -> true));
        when(response.body()).thenReturn(body);
        when(client.sendAsync(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any()))
                .thenReturn(CompletableFuture.completedFuture(response));
    }

    private static MockHttpServletRequest asset(String key) {
        return new MockHttpServletRequest("GET", "/api/v1/public/assets/" + key);
    }

    private static byte[] png() {
        return new byte[]{(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 0, 0, 0, 13, 'I', 'H', 'D', 'R'};
    }
}
