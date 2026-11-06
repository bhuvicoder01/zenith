package com.aicareerforge.security;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class AssetAccessPolicyTest {
    @Test
    void onlyKnownProfileAndPostCategoriesArePublic() {
        for (String key : List.of("users/alice/photos/photo.png", "users/alice/covers/cover.jpg",
                "users/alice/posts/media/photo.png", "users/alice/posts/documents/report.pdf",
                "users/alice/posts/videos/clip.mp4")) {
            assertTrue(AssetAccessPolicy.isPublicKey(key), key);
        }
        for (String key : List.of("users/alice/resumes/resume.pdf", "users/alice/private/file.pdf",
                "users/alice/posts/resume.pdf", "users/alice/photos/nested/file.jpg")) {
            assertFalse(AssetAccessPolicy.isPublicKey(key), key);
            assertTrue(AssetAccessPolicy.isOwnedKey(key, "alice"), key);
        }
    }

    @Test
    void traversalAndAmbiguousKeysAreNeverValid() {
        for (String key : List.of("users/alice/resumes/../file.pdf", "users/alice/./file.pdf",
                "users/alice//file.pdf", "users/alice/resumes/", "users/alice/resumes/%2e%2e/file.pdf",
                "users/alice/resumes/file?x.pdf", "users/alice/resumes/a\\b.pdf",
                "/users/alice/photos/photo.png", "other/alice/photos/photo.png", "users/alice/resumes")) {
            assertFalse(AssetAccessPolicy.isValidKey(key), key);
            assertFalse(AssetAccessPolicy.isPublicKey(key), key);
        }
        assertFalse(AssetAccessPolicy.isValidKey(null));
    }

    @Test
    void ownershipRequiresAnExactOwnerSegment() {
        assertTrue(AssetAccessPolicy.isOwnedKey("users/alice/resumes/file.pdf", "alice"));
        assertFalse(AssetAccessPolicy.isOwnedKey("users/alice2/resumes/file.pdf", "alice"));
        assertFalse(AssetAccessPolicy.isOwnedKey("users/alice/resumes/file.pdf", null));
        assertFalse(AssetAccessPolicy.isOwnedKey("users/alice/resumes/file.pdf", "../alice"));
    }
}
