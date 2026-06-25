package com.aicareerforge.controller;

import com.aicareerforge.model.Post;
import com.aicareerforge.model.User;
import com.aicareerforge.dto.PostAnalyticsResponse;
import com.aicareerforge.service.PostService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @GetMapping
    public ResponseEntity<Page<Post>> getFeed(
            @RequestParam(value = "tag", required = false) String tag,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(postService.getFeed(tag, pageable));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Post> createPost(
            @AuthenticationPrincipal User user,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam(value = "linkUrl", required = false) String linkUrl,
            @RequestParam(value = "media", required = false) MultipartFile mediaFile,
            @RequestParam(value = "pdf", required = false) MultipartFile pdfFile,
            @RequestParam(value = "video", required = false) MultipartFile videoFile) throws IOException {

        byte[] mediaBytes = (mediaFile != null && !mediaFile.isEmpty()) ? mediaFile.getBytes() : null;
        String mediaFilename = (mediaFile != null && !mediaFile.isEmpty()) ? mediaFile.getOriginalFilename() : null;

        byte[] pdfBytes = (pdfFile != null && !pdfFile.isEmpty()) ? pdfFile.getBytes() : null;
        String pdfFilename = (pdfFile != null && !pdfFile.isEmpty()) ? pdfFile.getOriginalFilename() : null;

        Post post = postService.createPost(user.getId(), content, linkUrl, mediaBytes, mediaFilename, pdfBytes, pdfFilename, videoFile);
        return ResponseEntity.ok(post);
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<Post> toggleLike(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String postId) {
        Post post = postService.toggleLike(postId, user.getId());
        return ResponseEntity.ok(post);
    }

    @PostMapping("/{id}/react")
    public ResponseEntity<Post> reactToPost(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String postId,
            @RequestParam(value = "emoji", required = false) String emoji) {
        Post post = postService.reactToPost(postId, user.getId(), emoji);
        return ResponseEntity.ok(post);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String postId) {
        postService.deletePost(postId, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Post> updatePost(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String postId,
            @RequestBody UpdatePostRequest request) {
        Post post = postService.updatePost(postId, user.getId(), request.getContent(), request.getLinkUrl());
        return ResponseEntity.ok(post);
    }

    public static class UpdatePostRequest {
        private String content;
        private String linkUrl;
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getLinkUrl() { return linkUrl; }
        public void setLinkUrl(String linkUrl) { this.linkUrl = linkUrl; }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Post> getPost(@PathVariable("id") String id) {
        return ResponseEntity.ok(postService.getPost(id));
    }

    @PostMapping("/{id}/view")
    public ResponseEntity<Post> recordView(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String postId) {
        String userId = user != null ? user.getId() : null;
        Post post = postService.recordPostView(postId, userId);
        return ResponseEntity.ok(post);
    }

    @GetMapping("/analytics")
    public ResponseEntity<PostAnalyticsResponse> getAnalytics(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(postService.getPostAnalytics(user.getId()));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<Post> addComment(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String postId,
            @RequestBody CommentRequest request) {
        Post post = postService.addComment(
                postId,
                user.getId(),
                request.getContent(),
                request.getParentCommentId(),
                request.getReplyToUserId(),
                request.getReplyToUserName(),
                request.getMentionedUserIds()
        );
        return ResponseEntity.ok(post);
    }

    @DeleteMapping("/{id}/comments/{commentId}")
    public ResponseEntity<Post> deleteComment(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String postId,
            @PathVariable("commentId") String commentId) {
        Post post = postService.deleteComment(postId, commentId, user.getId());
        return ResponseEntity.ok(post);
    }

    @PostMapping("/{id}/comments/{commentId}/like")
    public ResponseEntity<Post> toggleCommentLike(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String postId,
            @PathVariable("commentId") String commentId) {
        Post post = postService.toggleCommentLike(postId, commentId, user.getId());
        return ResponseEntity.ok(post);
    }

    public static class CommentRequest {
        private String content;
        private String parentCommentId;
        private String replyToUserId;
        private String replyToUserName;
        private List<String> mentionedUserIds;

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getParentCommentId() { return parentCommentId; }
        public void setParentCommentId(String parentCommentId) { this.parentCommentId = parentCommentId; }
        public String getReplyToUserId() { return replyToUserId; }
        public void setReplyToUserId(String replyToUserId) { this.replyToUserId = replyToUserId; }
        public String getReplyToUserName() { return replyToUserName; }
        public void setReplyToUserName(String replyToUserName) { this.replyToUserName = replyToUserName; }
        public List<String> getMentionedUserIds() { return mentionedUserIds; }
        public void setMentionedUserIds(List<String> mentionedUserIds) { this.mentionedUserIds = mentionedUserIds; }
    }
}
