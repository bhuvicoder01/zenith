package com.aicareerforge.service;

import io.awspring.cloud.s3.S3Template;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.net.URI;
import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class S3PrivateAssetTest {
    private S3Presigner presigner;
    private S3Template storage;
    private S3Service service;

    @BeforeEach
    void setUp() {
        presigner = mock(S3Presigner.class);
        storage = mock(S3Template.class);
        service = new S3Service(storage, presigner);
        ReflectionTestUtils.setField(service, "bucketName", "test-bucket");
        ReflectionTestUtils.setField(service, "backendUrl", "https://api.example.invalid");
    }

    @Test
    void foreignMalformedAndUntrustedUrlsNeverProduceSignatures() {
        for (String value : List.of("users/bob/resumes/private.pdf", "users/alice2/resumes/private.pdf",
                "users/alice/resumes/../private.pdf", "https://attacker.invalid/users/alice/resumes/private.pdf",
                "https://api.example.invalid.attacker.invalid/api/v1/public/assets/users/alice/resumes/private.pdf",
                "https://user@api.example.invalid/api/v1/public/assets/users/alice/resumes/private.pdf",
                "https://other-bucket.s3.amazonaws.com/users/alice/resumes/private.pdf")) {
            assertNull(service.getPrivateAssetUrl(value, "alice"), value);
        }
        assertNull(service.getPrivateAssetUrl("users/alice/resumes/private.pdf", null));
        verifyNoInteractions(presigner, storage);
    }

    @Test
    void rawAndTrustedLegacyValuesRefreshOnlyOwnedObjectsForFifteenMinutes() throws Exception {
        PresignedGetObjectRequest signed = mock(PresignedGetObjectRequest.class);
        when(signed.url()).thenReturn(URI.create("https://test-bucket.s3.amazonaws.com/signed").toURL());
        when(presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(signed);
        for (String value : List.of("users/alice/resumes/private.pdf",
                "https://api.example.invalid/api/v1/public/assets/users/alice/resumes/private.pdf",
                "https://test-bucket.s3.amazonaws.com/users/alice/resumes/private.pdf?expired=signature",
                "https://test-bucket.s3.ap-south-1.amazonaws.com/users/alice/resumes/private.pdf?expired=signature")) {
            assertEquals("https://test-bucket.s3.amazonaws.com/signed", service.getPrivateAssetUrl(value, "alice"));
        }
        ArgumentCaptor<GetObjectPresignRequest> requests = ArgumentCaptor.forClass(GetObjectPresignRequest.class);
        verify(presigner, times(4)).presignGetObject(requests.capture());
        for (GetObjectPresignRequest request : requests.getAllValues()) {
            assertEquals("users/alice/resumes/private.pdf", request.getObjectRequest().key());
            assertEquals("test-bucket", request.getObjectRequest().bucket());
            assertEquals("application/pdf", request.getObjectRequest().responseContentType());
            assertEquals("inline; filename=\"private.pdf\"", request.getObjectRequest().responseContentDisposition());
            assertEquals("private, no-store", request.getObjectRequest().responseCacheControl());
            assertEquals(Duration.ofMinutes(15), request.signatureDuration());
        }
        verifyNoInteractions(storage);
    }
}
