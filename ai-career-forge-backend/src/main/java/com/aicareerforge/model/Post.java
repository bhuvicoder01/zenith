package com.aicareerforge.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "posts")
public class Post {
    @Id
    private String id;

    @Indexed
    private String userId;

    private String authorName;
    private String authorUsername;
    private String authorAvatar;
    private String authorHeadline;

    private String content;

    @Builder.Default
    private List<String> mediaUrls = new ArrayList<>();

    private String pdfUrl;
    private String pdfName;
    private String videoUrl;
    private String linkUrl;

    @Indexed
    private Instant createdAt;

    private int likesCount;
    private int viewsCount;

    @Builder.Default
    private Set<String> likedUserIds = new HashSet<>();

    @Builder.Default
    private Set<String> viewedUserIds = new HashSet<>();

    @Builder.Default
    private java.util.Map<String, String> reactions = new java.util.HashMap<>();

    @Builder.Default
    private List<Comment> comments = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Comment {
        private String id;
        private String userId;
        private String authorName;
        private String authorUsername;
        private String authorAvatar;
        private String authorHeadline;
        private String content;
        private Instant createdAt;
        private String parentCommentId;
        private String replyToUserId;
        private String replyToUserName;
        @Builder.Default
        private List<String> mentionedUserIds = new ArrayList<>();
        @Builder.Default
        private java.util.Set<String> likedUserIds = new java.util.HashSet<>();
    }
}
