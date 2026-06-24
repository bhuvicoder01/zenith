package com.aicareerforge.service;

import com.aicareerforge.model.Post;
import com.aicareerforge.model.User;
import com.aicareerforge.model.UserProfile;
import com.aicareerforge.repository.PostRepository;
import com.aicareerforge.repository.UserProfileRepository;
import com.aicareerforge.repository.UserRepository;
import com.aicareerforge.security.WebSocketAppHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;
import com.aicareerforge.dto.PostAnalyticsResponse;

@Slf4j
@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final S3Service s3Service;
    private final PushNotificationService pushNotificationService;
    private final WebSocketAppHandler webSocketAppHandler;

    public Page<Post> getFeed(Pageable pageable) {
        Page<Post> posts = postRepository.findAllByOrderByCreatedAtDesc(pageable);
        posts.forEach(this::hydratePostUrls);
        return posts;
    }

    public Post createPost(String userId, String content, String linkUrl, byte[] mediaBytes, String mediaFilename, byte[] pdfBytes, String pdfFilename, MultipartFile videoFile) {
        if ((content == null || content.trim().isEmpty()) && mediaBytes == null && pdfBytes == null && (linkUrl == null || linkUrl.trim().isEmpty()) && (videoFile == null || videoFile.isEmpty())) {
            throw new IllegalArgumentException("Post cannot be completely empty");
        }

        // Fetch author info
        String authorName = "Anonymous User";
        String authorAvatar = null;
        String authorHeadline = "Zenith Member";

        Optional<UserProfile> profileOpt = userProfileRepository.findByUserId(userId);
        String authorUsername = null;
        if (profileOpt.isPresent()) {
            UserProfile profile = profileOpt.get();
            authorName = (profile.getFullName() != null && !profile.getFullName().trim().isEmpty()) ? profile.getFullName() : authorName;
            authorAvatar = profile.getProfilePhotoUrl();
            authorHeadline = (profile.getHeadline() != null && !profile.getHeadline().trim().isEmpty()) ? profile.getHeadline() : authorHeadline;
            authorUsername = profile.getUsername();
        }

        if (authorUsername == null || authorUsername.isBlank()) {
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent()) {
                authorUsername = userOpt.get().getUsername();
                if (authorName == null || "Anonymous User".equals(authorName)) {
                    authorName = userOpt.get().getName() != null ? userOpt.get().getName() : "Anonymous User";
                }
            }
        }

        Post.PostBuilder postBuilder = Post.builder()
                .userId(userId)
                .authorName(authorName)
                .authorUsername(authorUsername)
                .authorAvatar(authorAvatar)
                .authorHeadline(authorHeadline)
                .content(content)
                .linkUrl(linkUrl != null ? linkUrl.trim() : null)
                .createdAt(Instant.now())
                .likesCount(0);

        // Upload media (image) if present
        if (mediaBytes != null && mediaBytes.length > 0 && mediaFilename != null) {
            try {
                String mediaKey = s3Service.uploadFile(mediaBytes, mediaFilename, userId, "posts/media");
                String mediaUrl = s3Service.getPermanentUrl(mediaKey);
                java.util.List<String> mediaUrls = new ArrayList<>();
                mediaUrls.add(mediaUrl);
                postBuilder.mediaUrls(mediaUrls);
                log.info("Uploaded post media for user {}: {}", userId, mediaUrl);
            } catch (Exception e) {
                log.error("Failed to upload post media for user {}: {}", userId, e.getMessage());
            }
        }

        // Upload PDF if present
        if (pdfBytes != null && pdfBytes.length > 0 && pdfFilename != null) {
            try {
                String pdfKey = s3Service.uploadFile(pdfBytes, pdfFilename, userId, "posts/documents");
                String pdfUrl = s3Service.getPermanentUrl(pdfKey);
                postBuilder.pdfUrl(pdfUrl);
                log.info("Uploaded post PDF for user {}: {}", userId, pdfUrl);
            } catch (Exception e) {
                log.error("Failed to upload post PDF for user {}: {}", userId, e.getMessage());
            }
        }

        // Upload Video if present (Stream upload to prevent OOM)
        if (videoFile != null && !videoFile.isEmpty()) {
            try {
                String videoKey = s3Service.uploadFile(videoFile.getInputStream(), videoFile.getOriginalFilename(), userId, "posts/videos");
                String videoUrl = s3Service.getPermanentUrl(videoKey);
                postBuilder.videoUrl(videoUrl);
                log.info("Uploaded post video for user {}: {}", userId, videoUrl);
            } catch (Exception e) {
                log.error("Failed to upload post video for user {}: {}", userId, e.getMessage());
            }
        }

        Post savedPost = postRepository.save(postBuilder.build());
        log.info("Post created successfully by user: {} (Post ID: {})", userId, savedPost.getId());
        hydratePostUrls(savedPost);
        return savedPost;
    }

    public Post toggleLike(String postId, String userId) {
        return reactToPost(postId, userId, null);
    }

    public Post reactToPost(String postId, String userId, String emoji) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        if (post.getReactions() == null) {
            post.setReactions(new java.util.HashMap<>());
        }

        String currentReaction = post.getReactions().get(userId);
        if (emoji == null || emoji.trim().isEmpty()) {
            if (post.getLikedUserIds().contains(userId)) {
                post.getLikedUserIds().remove(userId);
                post.getReactions().remove(userId);
                log.info("User {} unliked post {}", userId, postId);
            } else {
                post.getLikedUserIds().add(userId);
                post.getReactions().put(userId, "\uD83D\uDC4D");
                log.info("User {} liked post {}", userId, postId);
            }
        } else {
            if (emoji.equals(currentReaction)) {
                post.getLikedUserIds().remove(userId);
                post.getReactions().remove(userId);
                log.info("User {} removed reaction {} from post {}", userId, emoji, postId);
            } else {
                post.getLikedUserIds().add(userId);
                post.getReactions().put(userId, emoji);
                log.info("User {} reacted with {} to post {}", userId, emoji, postId);
            }
        }

        post.setLikesCount(post.getLikedUserIds().size());
        Post saved = postRepository.save(post);
        hydratePostUrls(saved);

        // Broadcast real-time count update to all connected clients
        broadcastPostUpdate(saved);

        return saved;
    }

    public void deletePost(String postId, String userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        // Check permission (must be author or admin)
        boolean isAdmin = false;
        try {
            Optional<User> userOpt = userRepository.findById(userId);
            isAdmin = userOpt.isPresent() && User.Role.ADMIN.equals(userOpt.get().getRole());
        } catch (Exception e) {
            // ignore
        }

        if (!post.getUserId().equals(userId) && !isAdmin) {
            throw new SecurityException("Unauthorized delete attempt on post ID: " + postId);
        }

        // Delete media from S3
        if (post.getMediaUrls() != null) {
            for (String url : post.getMediaUrls()) {
                String key = extractS3Key(url);
                if (key != null) {
                    s3Service.deleteFile(key);
                }
            }
        }

        // Delete PDF from S3
        if (post.getPdfUrl() != null) {
            String key = extractS3Key(post.getPdfUrl());
            if (key != null) {
                s3Service.deleteFile(key);
            }
        }

        // Delete Video from S3
        if (post.getVideoUrl() != null) {
            String key = extractS3Key(post.getVideoUrl());
            if (key != null) {
                s3Service.deleteFile(key);
            }
        }

        postRepository.delete(post);
        log.info("Post ID: {} deleted by user ID: {}", postId, userId);
    }

    private String extractS3Key(String url) {
        if (url == null || !url.contains("/assets/")) return null;
        return url.substring(url.indexOf("/assets/") + 8);
    }

    private void hydratePostUrls(Post post) {
        if (post == null) return;
        
        // Dynamically update post author info using userId!
        if (post.getUserId() != null) {
            userProfileRepository.findByUserId(post.getUserId()).ifPresentOrElse(
                profile -> {
                    if (profile.getFullName() != null && !profile.getFullName().isBlank()) {
                        post.setAuthorName(profile.getFullName());
                    }
                    if (profile.getUsername() != null && !profile.getUsername().isBlank()) {
                        post.setAuthorUsername(profile.getUsername());
                    }
                    post.setAuthorAvatar(profile.getProfilePhotoUrl());
                    if (profile.getHeadline() != null && !profile.getHeadline().isBlank()) {
                        post.setAuthorHeadline(profile.getHeadline());
                    }
                },
                () -> {
                    userRepository.findById(post.getUserId()).ifPresent(user -> {
                        if (user.getName() != null && !user.getName().isBlank()) {
                            post.setAuthorName(user.getName());
                        }
                        if (user.getUsername() != null && !user.getUsername().isBlank()) {
                            post.setAuthorUsername(user.getUsername());
                        }
                    });
                }
            );
        }

        post.setAuthorAvatar(hydrateUrl(post.getAuthorAvatar()));

        if (post.getComments() != null) {
            java.util.Set<String> rootCommentIds = post.getComments().stream()
                    .filter(c -> c.getParentCommentId() == null)
                    .map(Post.Comment::getId)
                    .collect(Collectors.toSet());

            java.util.List<Post.Comment> validComments = post.getComments().stream()
                    .filter(c -> c.getParentCommentId() == null || rootCommentIds.contains(c.getParentCommentId()))
                    .collect(Collectors.toList());

            if (validComments.size() < post.getComments().size()) {
                post.setComments(validComments);
            }

            post.getComments().forEach(comment -> {
                // Dynamically update comment author info using comment userId!
                if (comment.getUserId() != null) {
                    userProfileRepository.findByUserId(comment.getUserId()).ifPresentOrElse(
                        profile -> {
                            if (profile.getFullName() != null && !profile.getFullName().isBlank()) {
                                comment.setAuthorName(profile.getFullName());
                            }
                            if (profile.getUsername() != null && !profile.getUsername().isBlank()) {
                                comment.setAuthorUsername(profile.getUsername());
                            }
                            comment.setAuthorAvatar(profile.getProfilePhotoUrl());
                            if (profile.getHeadline() != null && !profile.getHeadline().isBlank()) {
                                comment.setAuthorHeadline(profile.getHeadline());
                            }
                        },
                        () -> {
                            userRepository.findById(comment.getUserId()).ifPresent(user -> {
                                if (user.getName() != null && !user.getName().isBlank()) {
                                    comment.setAuthorName(user.getName());
                                }
                                if (user.getUsername() != null && !user.getUsername().isBlank()) {
                                    comment.setAuthorUsername(user.getUsername());
                                }
                            });
                        }
                    );
                }
                // Dynamically update replyTo user info using comment replyToUserId!
                if (comment.getReplyToUserId() != null) {
                    userProfileRepository.findByUserId(comment.getReplyToUserId()).ifPresentOrElse(
                        profile -> {
                            if (profile.getUsername() != null && !profile.getUsername().isBlank()) {
                                comment.setReplyToUserName(profile.getUsername());
                            }
                        },
                        () -> {
                            userRepository.findById(comment.getReplyToUserId()).ifPresent(user -> {
                                if (user.getUsername() != null && !user.getUsername().isBlank()) {
                                    comment.setReplyToUserName(user.getUsername());
                                }
                            });
                        }
                    );
                }
                comment.setAuthorAvatar(hydrateUrl(comment.getAuthorAvatar()));
            });
        }
    }

    private String hydrateUrl(String url) {
        if (url == null || url.isBlank()) return null;
        if (url.startsWith("http")) return url;
        return s3Service.getPermanentUrl(url);
    }

    public Post getPost(String id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));
        hydratePostUrls(post);
        return post;
    }

    public Post updatePost(String postId, String userId, String content, String linkUrl) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        if (!post.getUserId().equals(userId)) {
            throw new SecurityException("Unauthorized edit attempt");
        }

        post.setContent(content);
        post.setLinkUrl(linkUrl != null ? linkUrl.trim() : null);
        Post saved = postRepository.save(post);
        hydratePostUrls(saved);
        return saved;
    }

    public Post addComment(String postId, String userId, String content) {
        return addComment(postId, userId, content, null, null, null, null);
    }

    public Post addComment(String postId, String userId, String content, String parentCommentId, String replyToUserId, String replyToUserName, List<String> mentionedUserIds) {
        if (content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("Comment content cannot be empty");
        }

        Post post = getPost(postId);

        // Fetch author info
        String authorName = "Anonymous User";
        String authorAvatar = null;
        String authorHeadline = "Zenith Member";

        Optional<UserProfile> profileOpt = userProfileRepository.findByUserId(userId);
        String authorUsername = null;
        if (profileOpt.isPresent()) {
            UserProfile profile = profileOpt.get();
            authorName = (profile.getFullName() != null && !profile.getFullName().trim().isEmpty()) ? profile.getFullName() : authorName;
            authorAvatar = profile.getProfilePhotoUrl();
            authorHeadline = (profile.getHeadline() != null && !profile.getHeadline().trim().isEmpty()) ? profile.getHeadline() : authorHeadline;
            authorUsername = profile.getUsername();
        }

        if (authorUsername == null || authorUsername.isBlank()) {
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent()) {
                authorUsername = userOpt.get().getUsername();
                if (authorName == null || "Anonymous User".equals(authorName)) {
                    authorName = userOpt.get().getName() != null ? userOpt.get().getName() : "Anonymous User";
                }
            }
        }

        Post.Comment comment = Post.Comment.builder()
                .id(java.util.UUID.randomUUID().toString())
                .userId(userId)
                .authorName(authorName)
                .authorUsername(authorUsername)
                .authorAvatar(authorAvatar)
                .authorHeadline(authorHeadline)
                .content(content)
                .parentCommentId(parentCommentId)
                .replyToUserId(replyToUserId)
                .replyToUserName(replyToUserName)
                .mentionedUserIds(mentionedUserIds != null ? mentionedUserIds : new ArrayList<>())
                .createdAt(Instant.now())
                .build();

        if (post.getComments() == null) {
            post.setComments(new ArrayList<>());
        }
        post.getComments().add(comment);

        Post saved = postRepository.save(post);
        hydratePostUrls(saved);

        // Broadcast real-time count update to all connected clients
        broadcastPostUpdate(saved);

        // Trigger notifications inside a try-catch block to ensure comment creation never fails
        try {
            final String finalAuthorName = authorName;
            java.util.Set<String> notifiedUserIds = new java.util.HashSet<>();
            notifiedUserIds.add(userId); // Don't notify the commenter themselves

            // 1. Check for replies first
            if (parentCommentId != null && !parentCommentId.trim().isEmpty() && post.getComments() != null) {
                Optional<Post.Comment> parentCommentOpt = post.getComments().stream()
                        .filter(c -> parentCommentId.equals(c.getId()))
                        .findFirst();
                if (parentCommentOpt.isPresent()) {
                    String parentAuthorId = parentCommentOpt.get().getUserId();
                    if (!notifiedUserIds.contains(parentAuthorId)) {
                        webSocketAppHandler.sendNotification(
                                parentAuthorId,
                                "COMMENT",
                                "New Reply on Zenith",
                                finalAuthorName + " replied to your comment on a post.",
                                java.util.Map.of("postId", postId)
                        );
                        notifiedUserIds.add(parentAuthorId);
                    }
                }
            }

            // 2. Notify the post author (if they aren't already notified or are the commenter)
            String postAuthorId = post.getUserId();
            if (!notifiedUserIds.contains(postAuthorId)) {
                webSocketAppHandler.sendNotification(
                        postAuthorId,
                        "COMMENT",
                        "New Comment on Zenith",
                        finalAuthorName + " commented on your post.",
                        java.util.Map.of("postId", postId)
                );
                notifiedUserIds.add(postAuthorId);
            }

            // 3. Notify mentioned users
            if (mentionedUserIds != null) {
                String notificationBody;
                if (parentCommentId != null && !parentCommentId.trim().isEmpty()) {
                    notificationBody = finalAuthorName + " mentioned you in a reply to a comment.";
                } else {
                    notificationBody = finalAuthorName + " mentioned you in a comment on a post.";
                }
                for (String mentionedUserId : mentionedUserIds) {
                    if (mentionedUserId != null && !notifiedUserIds.contains(mentionedUserId)) {
                        webSocketAppHandler.sendNotification(
                                mentionedUserId,
                                "MENTION",
                                "Mentioned on Zenith",
                                notificationBody,
                                java.util.Map.of("postId", postId)
                        );
                        notifiedUserIds.add(mentionedUserId);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to process comment notifications: {}", e.getMessage(), e);
        }

        return saved;
    }

    public Post deleteComment(String postId, String commentId, String userId) {
        Post post = getPost(postId);
        if (post.getComments() == null) {
            throw new IllegalArgumentException("Comment not found");
        }

        Post.Comment targetComment = post.getComments().stream()
                .filter(c -> c.getId().equals(commentId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        boolean isAdmin = false;
        try {
            Optional<User> userOpt = userRepository.findById(userId);
            isAdmin = userOpt.isPresent() && User.Role.ADMIN.equals(userOpt.get().getRole());
        } catch (Exception e) {
            // ignore
        }

        if (!targetComment.getUserId().equals(userId) && !post.getUserId().equals(userId) && !isAdmin) {
            throw new SecurityException("Unauthorized comment delete attempt");
        }

        // Remove the target comment AND any child replies referencing it
        post.getComments().removeIf(c ->
            c.getId().equals(commentId) || commentId.equals(c.getParentCommentId())
        );
        Post saved = postRepository.save(post);
        hydratePostUrls(saved);

        // Broadcast real-time count update to all connected clients
        broadcastPostUpdate(saved);

        return saved;
    }

    public Post toggleCommentLike(String postId, String commentId, String userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        if (post.getComments() == null) {
            throw new IllegalArgumentException("Comment not found");
        }

        Post.Comment comment = post.getComments().stream()
                .filter(c -> c.getId().equals(commentId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        if (comment.getLikedUserIds() == null) {
            comment.setLikedUserIds(new java.util.HashSet<>());
        }

        if (comment.getLikedUserIds().contains(userId)) {
            comment.getLikedUserIds().remove(userId);
            log.info("User {} unliked comment {} on post {}", userId, commentId, postId);
        } else {
            comment.getLikedUserIds().add(userId);
            log.info("User {} liked comment {} on post {}", userId, commentId, postId);
        }

        Post saved = postRepository.save(post);
        hydratePostUrls(saved);
        broadcastPostUpdate(saved);
        return saved;
    }

    /**
     * Broadcasts a lightweight POST_UPDATE event via WebSocket to all connected clients.
     * Contains only the essential data needed to update counts in the UI.
     */
    private void broadcastPostUpdate(Post post) {
        try {
            java.util.Map<String, Object> updateData = new java.util.HashMap<>();
            updateData.put("postId", post.getId());
            updateData.put("likesCount", post.getLikesCount());
            updateData.put("commentsCount", post.getComments() != null ? post.getComments().size() : 0);
            updateData.put("likedUserIds", post.getLikedUserIds() != null ? post.getLikedUserIds() : new ArrayList<>());
            updateData.put("reactions", post.getReactions() != null ? post.getReactions() : new java.util.HashMap<>());

            webSocketAppHandler.broadcastNotification(
                    "POST_UPDATE",
                    "Post Updated",
                    "Post counts updated",
                    updateData
            );
        } catch (Exception e) {
            log.error("Failed to broadcast post update for post {}: {}", post.getId(), e.getMessage());
        }
    }

    public Post recordPostView(String postId, String viewerUserId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));
        
        if (viewerUserId == null || viewerUserId.trim().isEmpty()) {
            post.setViewsCount(post.getViewsCount() + 1);
        } else {
            if (post.getViewedUserIds() == null) {
                post.setViewedUserIds(new HashSet<>());
            }
            if (!post.getViewedUserIds().contains(viewerUserId)) {
                post.getViewedUserIds().add(viewerUserId);
                int currentViews = post.getViewsCount();
                post.setViewsCount(Math.max(currentViews + 1, post.getViewedUserIds().size()));
            }
        }
        
        Post saved = postRepository.save(post);
        hydratePostUrls(saved);
        return saved;
    }

    public PostAnalyticsResponse getPostAnalytics(String userId) {
        List<Post> userPosts = postRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
        
        int totalPosts = userPosts.size();
        int totalViews = 0;
        int totalLikes = 0;
        int totalComments = 0;
        
        List<PostAnalyticsResponse.PostMetrics> metricsList = new ArrayList<>();
        
        // Gather all user IDs we need user profile details for (viewers + likers)
        Set<String> allUserIdsToLookup = new HashSet<>();
        for (Post post : userPosts) {
            if (post.getViewedUserIds() != null) {
                allUserIdsToLookup.addAll(post.getViewedUserIds());
            }
            if (post.getLikedUserIds() != null) {
                allUserIdsToLookup.addAll(post.getLikedUserIds());
            }
        }
        
        // Retrieve profiles in bulk
        java.util.Map<String, UserProfile> profileMap = new java.util.HashMap<>();
        if (!allUserIdsToLookup.isEmpty()) {
            List<UserProfile> profiles = userProfileRepository.findAllByUserIdIn(new ArrayList<>(allUserIdsToLookup));
            for (UserProfile p : profiles) {
                profileMap.put(p.getUserId(), p);
            }
        }
        
        for (Post post : userPosts) {
            hydratePostUrls(post);
            int pViews = post.getViewsCount();
            int pLikes = post.getLikesCount();
            int pComments = post.getComments() != null ? post.getComments().size() : 0;
            
            totalViews += pViews;
            totalLikes += pLikes;
            totalComments += pComments;
            
            // Map viewers
            List<PostAnalyticsResponse.UserProfileInfo> viewers = new ArrayList<>();
            if (post.getViewedUserIds() != null) {
                for (String viewerId : post.getViewedUserIds()) {
                    UserProfile p = profileMap.get(viewerId);
                    viewers.add(mapProfileToInfo(viewerId, p));
                }
            }
            
            // Map likers
            List<PostAnalyticsResponse.UserProfileInfo> likers = new ArrayList<>();
            if (post.getLikedUserIds() != null) {
                for (String likerId : post.getLikedUserIds()) {
                    UserProfile p = profileMap.get(likerId);
                    likers.add(mapProfileToInfo(likerId, p));
                }
            }
            
            // Map commenters (comments already have full author details cached)
            List<PostAnalyticsResponse.UserProfileInfo> commenters = new ArrayList<>();
            if (post.getComments() != null) {
                for (Post.Comment comment : post.getComments()) {
                    commenters.add(PostAnalyticsResponse.UserProfileInfo.builder()
                            .userId(comment.getUserId())
                            .fullName(comment.getAuthorName())
                            .username(comment.getAuthorUsername())
                            .profilePhotoUrl(comment.getAuthorAvatar())
                            .headline(comment.getAuthorHeadline())
                            .build());
                }
            }
            
            String snippet = post.getContent() != null ? post.getContent() : "";
            if (snippet.length() > 60) {
                snippet = snippet.substring(0, 57) + "...";
            }
            
            metricsList.add(PostAnalyticsResponse.PostMetrics.builder()
                    .id(post.getId())
                    .contentSnippet(snippet)
                    .createdAt(post.getCreatedAt() != null ? post.getCreatedAt().toString() : null)
                    .viewsCount(pViews)
                    .likesCount(pLikes)
                    .commentsCount(pComments)
                    .viewers(viewers)
                    .likers(likers)
                    .commenters(commenters)
                    .build());
        }
        
        return PostAnalyticsResponse.builder()
                .totalPosts(totalPosts)
                .totalViews(totalViews)
                .totalLikes(totalLikes)
                .totalComments(totalComments)
                .posts(metricsList)
                .build();
    }

    private PostAnalyticsResponse.UserProfileInfo mapProfileToInfo(String userId, UserProfile p) {
        if (p == null) {
            return PostAnalyticsResponse.UserProfileInfo.builder()
                    .userId(userId)
                    .fullName("Anonymous User")
                    .build();
        }
        return PostAnalyticsResponse.UserProfileInfo.builder()
                .userId(userId)
                .fullName(p.getFullName() != null && !p.getFullName().trim().isEmpty() ? p.getFullName() : "Anonymous User")
                .username(p.getUsername())
                .profilePhotoUrl(hydrateUrl(p.getProfilePhotoUrl()))
                .headline(p.getHeadline() != null && !p.getHeadline().trim().isEmpty() ? p.getHeadline() : "Zenith Member")
                .build();
    }

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void cleanupOrphanedComments() {
        log.info("Starting cleanup of orphaned comments...");
        try {
            List<Post> allPosts = postRepository.findAll();
            int totalCleaned = 0;
            for (Post post : allPosts) {
                if (post.getComments() != null && !post.getComments().isEmpty()) {
                    java.util.Set<String> rootCommentIds = post.getComments().stream()
                            .filter(c -> c.getParentCommentId() == null)
                            .map(Post.Comment::getId)
                            .collect(Collectors.toSet());

                    java.util.List<Post.Comment> validComments = post.getComments().stream()
                            .filter(c -> c.getParentCommentId() == null || rootCommentIds.contains(c.getParentCommentId()))
                            .collect(Collectors.toList());

                    if (validComments.size() < post.getComments().size()) {
                        int removedCount = post.getComments().size() - validComments.size();
                        post.setComments(validComments);
                        postRepository.save(post);
                        totalCleaned += removedCount;
                        log.info("Cleaned {} orphaned comments from post {}", removedCount, post.getId());
                    }
                }
            }
            log.info("Cleanup of orphaned comments finished. Total cleaned: {}", totalCleaned);
        } catch (Exception e) {
            log.error("Failed to run orphaned comments cleanup: {}", e.getMessage(), e);
        }
    }
}

