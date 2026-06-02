package com.aicareerforge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostAnalyticsResponse {
    private int totalPosts;
    private int totalViews;
    private int totalLikes;
    private int totalComments;
    private List<PostMetrics> posts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PostMetrics {
        private String id;
        private String contentSnippet;
        private String createdAt;
        private int viewsCount;
        private int likesCount;
        private int commentsCount;
        private List<UserProfileInfo> viewers;
        private List<UserProfileInfo> likers;
        private List<UserProfileInfo> commenters;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserProfileInfo {
        private String userId;
        private String fullName;
        private String username;
        private String profilePhotoUrl;
        private String headline;
    }
}
