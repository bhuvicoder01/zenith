package com.aicareerforge.security;

import java.util.Set;

/** Access rules for the object-key layout created by S3Service. */
public final class AssetAccessPolicy {
    private static final Set<String> PUBLIC_PROFILE_ASSETS = Set.of("photos", "covers");
    private static final Set<String> PUBLIC_POST_ASSETS = Set.of("media", "documents", "videos");

    private AssetAccessPolicy() {}

    public static boolean isValidKey(String key) {
        if (key == null || key.length() > 2048
                || !key.matches("users/[A-Za-z0-9_-]{1,128}/[A-Za-z0-9_./-]+")) {
            return false;
        }
        String[] segments = key.split("/", -1);
        if (segments.length < 4) return false;
        for (String segment : segments) {
            if (segment.isEmpty() || segment.equals(".") || segment.equals("..")) return false;
        }
        return true;
    }

    public static boolean isPublicKey(String key) {
        if (!isValidKey(key)) return false;
        String[] segments = key.split("/");
        return (segments.length == 4 && PUBLIC_PROFILE_ASSETS.contains(segments[2]))
                || (segments.length == 5 && segments[2].equals("posts")
                    && PUBLIC_POST_ASSETS.contains(segments[3]));
    }

    public static boolean isOwnedKey(String key, String userId) {
        return userId != null && userId.matches("[A-Za-z0-9_-]{1,128}")
                && isValidKey(key) && key.startsWith("users/" + userId + "/");
    }
}
