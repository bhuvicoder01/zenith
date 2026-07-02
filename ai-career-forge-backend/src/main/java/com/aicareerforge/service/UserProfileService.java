package com.aicareerforge.service;

import com.aicareerforge.model.Post;
import com.aicareerforge.model.UserProfile;
import com.aicareerforge.model.UsernameReservation;
import com.aicareerforge.repository.UserProfileRepository;
import com.aicareerforge.repository.UsernameReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import com.aicareerforge.dto.PublicProfileDTO;
import java.io.IOException;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;
    private final com.aicareerforge.repository.UserRepository userRepository;
    private final UsernameReservationRepository usernameReservationRepository;
    private final com.aicareerforge.repository.PostRepository postRepository;
    private final S3Service s3Service;
    private final ProfileAiAgent profileAiAgent;
    private final JobService jobService;
    private final JobSyncService jobSyncService;
    private final org.springframework.ai.chat.client.ChatClient chatClient;
    private final com.aicareerforge.security.WebSocketAppHandler webSocketAppHandler;
    private final org.springframework.cache.CacheManager cacheManager;

    public UserProfile getProfile(String userId) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserProfile newProfile = UserProfile.builder()
                            .userId(userId)
                            .build();
                    return userProfileRepository.save(newProfile);
                });
        
        userRepository.findById(userId).ifPresent(user -> {
            profile.setEmail(user.getEmail());
            profile.setPasswordGenerated(user.isPasswordGenerated());
            
            // Self-healing usernames for legacy profiles
            if (profile.getUsername() == null || profile.getUsername().isBlank()) {
                String baseUsername = generateBaseUsername(user.getName(), user.getEmail());
                String uniqueUsername = makeUsernameUnique(baseUsername);
                profile.setUsername(uniqueUsername);
                userProfileRepository.save(profile);
            }
            
            if (user.getUsername() == null || user.getUsername().isBlank()) {
                user.setUsername(profile.getUsername());
                userRepository.save(user);
            }
        });

        hydrateUrls(profile);
        return profile;
    }

    private String generateBaseUsername(String name, String email) {
        String base = "";
        if (name != null && !name.isBlank()) {
            base = name.toLowerCase().replaceAll("[^a-z0-9_]", "_");
        } else if (email != null && !email.isBlank()) {
            base = email.split("@")[0].toLowerCase().replaceAll("[^a-z0-9_]", "_");
        }
        if (base.isBlank()) {
            base = "user";
        }
        return base;
    }

    private String makeUsernameUnique(String base) {
        String attempt = base;
        int count = 1;
        while (userProfileRepository.existsByUsername(attempt) || userRepository.existsByUsername(attempt) || isUsernameReservedForOther(attempt, null)) {
            attempt = base + count;
            count++;
        }
        return attempt;
    }

    private boolean isUsernameReservedForOther(String username, String userId) {
        return usernameReservationRepository.findByUsername(username)
                .map(r -> r.getReservedUntil().isAfter(java.time.Instant.now()) && !r.getReservedForUserId().equals(userId))
                .orElse(false);
    }

    public boolean isUsernameAvailable(String username, String userId) {
        // 1. Check if used by another user in profile repository
        java.util.Optional<UserProfile> existingProfile = userProfileRepository.findByUsername(username);
        if (existingProfile.isPresent() && !existingProfile.get().getUserId().equals(userId)) {
            return false;
        }

        // 2. Check if used by another user in user repository
        java.util.Optional<com.aicareerforge.model.User> existingUser = userRepository.findByUsername(username);
        if (existingUser.isPresent() && !existingUser.get().getId().equals(userId)) {
            return false;
        }

        // 3. Check if reserved for another user
        if (isUsernameReservedForOther(username, userId)) {
            return false;
        }

        return true;
    }

    public PublicProfileDTO getPublicProfile(String userIdOrUsername) {
        UserProfile profile = userProfileRepository.findByUserId(userIdOrUsername)
                .or(() -> userProfileRepository.findByUsername(userIdOrUsername))
                .orElseThrow(() -> new IllegalArgumentException("Profile not found for user: " + userIdOrUsername));

        if (profile.getSettings() != null && profile.getSettings().isHideProfile()) {
            throw new IllegalArgumentException("Profile is private.");
        }

        userRepository.findById(profile.getUserId()).ifPresent(user -> {
            profile.setEmail(user.getEmail());
            profile.setPasswordGenerated(user.isPasswordGenerated());
        });

        hydrateUrls(profile);
        return PublicProfileDTO.fromEntity(profile);
    }

    public java.util.List<PublicProfileDTO> searchPublicProfiles(String query) {
        java.util.List<UserProfile> profiles;
        if (query == null || query.isBlank()) {
            profiles = userProfileRepository.findAllPublic();
        } else {
            profiles = userProfileRepository.searchPublic(query.trim());
        }

        return profiles.stream()
                .map(profile -> {
                    hydrateUrls(profile);
                    return PublicProfileDTO.fromEntity(profile);
                })
                .collect(java.util.stream.Collectors.toList());
    }

    private void hydrateUrls(UserProfile profile) {
        if (profile == null) return;
        profile.setResumeS3Url(hydrateUrl(profile.getResumeS3Url()));
        profile.setProfilePhotoUrl(hydrateUrl(profile.getProfilePhotoUrl()));
        profile.setCoverImageUrl(hydrateUrl(profile.getCoverImageUrl()));
        if (profile.getUserId() != null) {
            java.util.List<UsernameReservation> activeReservations = usernameReservationRepository
                    .findByReservedForUserIdAndReservedUntilAfter(profile.getUserId(), java.time.Instant.now());
            if (!activeReservations.isEmpty()) {
                profile.setPreviousUsername(activeReservations.get(0).getUsername());
                profile.setPreviousUsernameReservedUntil(activeReservations.get(0).getReservedUntil());
            }
        }
    }

    private String hydrateUrl(String url) {
        if (url == null || url.isBlank()) return null;
        if (url.startsWith("http")) {
            // If it's already an absolute URL (like Pollinations), proxy it through our backend
            // to bypass CORS/Network blocks that the client might have.
            if (url.contains("pollinations.ai") || url.contains("unsplash.com")) {
                return s3Service.getProxyUrl(url);
            }
            return url;
        }
        return s3Service.getPermanentUrl(url);
    }

    /**
     * Check if a user still needs to complete onboarding.
     * A user needs onboarding if they have no resume and no skills extracted.
     */
    public boolean needsOnboarding(String userId) {
        // First check the user's role. Admins and Recruiters don't need candidate onboarding.
        com.aicareerforge.model.User user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getRole() != com.aicareerforge.model.User.Role.USER) {
            return false;
        }

        UserProfile profile = userProfileRepository.findByUserId(userId).orElse(null);
        if (profile == null) return true;
        boolean hasResume = profile.getResumeS3Url() != null && !profile.getResumeS3Url().isBlank();
        boolean hasSkills = profile.getSkills() != null && !profile.getSkills().isEmpty();
        return !hasResume && !hasSkills;
    }

    public UserProfile updateProfile(String userId, UserProfile updatedData) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElse(UserProfile.builder().userId(userId).build());
        
        boolean oldShowOnline = profile.getSettings() == null || profile.getSettings().isShowOnlineStatus();

        if (updatedData.getUsername() != null && !updatedData.getUsername().isBlank()) {
            String newUsername = updatedData.getUsername().toLowerCase().replaceAll("[^a-z0-9_]", "_");
            String oldUsername = profile.getUsername() != null ? profile.getUsername().toLowerCase().replaceAll("[^a-z0-9_]", "_") : "";

            if (!newUsername.equals(oldUsername)) {
                // COOLDOWN LOCK CHECK: If user has an active reservation, they can ONLY change back to that reserved username!
                // Only enforce if they are changing FROM an existing username.
                boolean isReverting = false;
                if (!oldUsername.isEmpty()) {
                    java.util.List<UsernameReservation> activeReservations = usernameReservationRepository
                            .findByReservedForUserIdAndReservedUntilAfter(userId, java.time.Instant.now());
                    if (!activeReservations.isEmpty()) {
                        isReverting = activeReservations.stream()
                                .anyMatch(r -> r.getUsername().equals(newUsername));
                        if (!isReverting) {
                            throw new IllegalArgumentException("You can only change back to your previous username within 7 days of changing it.");
                        }
                    }
                }

                if (!isUsernameAvailable(newUsername, userId)) {
                    throw new IllegalArgumentException("Username already in use or reserved");
                }
                profile.setUsername(newUsername);
                userRepository.findById(userId).ifPresent(user -> {
                    user.setUsername(newUsername);
                    userRepository.save(user);
                });

                // Save reservation for the old username only if we are NOT reverting
                if (!oldUsername.isEmpty() && !isReverting) {
                    UsernameReservation reservation = usernameReservationRepository.findByUsername(oldUsername)
                            .orElse(UsernameReservation.builder().username(oldUsername).build());
                    reservation.setReservedForUserId(userId);
                    reservation.setReservedUntil(java.time.Instant.now().plus(7, java.time.temporal.ChronoUnit.DAYS));
                    usernameReservationRepository.save(reservation);
                }

                // Clean up any reservation for the new username
                usernameReservationRepository.findByUsername(newUsername).ifPresent(usernameReservationRepository::delete);

                if (!oldUsername.isEmpty()) {
                    updateMentionsInPosts(oldUsername, newUsername);
                }
            }
        }

        boolean coreMatchingFieldsChanged = false;
        if (updatedData.getHeadline() != null && !java.util.Objects.equals(updatedData.getHeadline(), profile.getHeadline())) {
            coreMatchingFieldsChanged = true;
        }
        if (updatedData.getSkills() != null && !updatedData.getSkills().equals(profile.getSkills())) {
            coreMatchingFieldsChanged = true;
        }
        if (updatedData.getExperiences() != null && !updatedData.getExperiences().equals(profile.getExperiences())) {
            coreMatchingFieldsChanged = true;
        }
        if (updatedData.getInternships() != null && !updatedData.getInternships().equals(profile.getInternships())) {
            coreMatchingFieldsChanged = true;
        }
        if (updatedData.getPreferredLocation() != null && !java.util.Objects.equals(updatedData.getPreferredLocation(), profile.getPreferredLocation())) {
            coreMatchingFieldsChanged = true;
        }
        if (updatedData.getPreferredLifestyle() != null && !java.util.Objects.equals(updatedData.getPreferredLifestyle(), profile.getPreferredLifestyle())) {
            coreMatchingFieldsChanged = true;
        }

        if (updatedData.getFullName() != null) profile.setFullName(updatedData.getFullName());
        if (updatedData.getHeadline() != null) profile.setHeadline(updatedData.getHeadline());
        if (updatedData.getBio() != null) profile.setBio(updatedData.getBio());
        if (updatedData.getSkills() != null) profile.setSkills(updatedData.getSkills());
        if (updatedData.getExperiences() != null) profile.setExperiences(updatedData.getExperiences());
        if (updatedData.getInternships() != null) profile.setInternships(updatedData.getInternships());
        if (updatedData.getAcademicProjects() != null) profile.setAcademicProjects(updatedData.getAcademicProjects());
        if (updatedData.getCertifications() != null) profile.setCertifications(updatedData.getCertifications());
        if (updatedData.getParsedGoals() != null) profile.setParsedGoals(updatedData.getParsedGoals());
        if (updatedData.getPreferredLocation() != null) profile.setPreferredLocation(updatedData.getPreferredLocation());
        if (updatedData.getPreferredSalary() != null) profile.setPreferredSalary(updatedData.getPreferredSalary());
        if (updatedData.getPreferredLifestyle() != null) profile.setPreferredLifestyle(updatedData.getPreferredLifestyle());
        if (updatedData.getSettings() != null) profile.setSettings(updatedData.getSettings());
        
        boolean newShowOnline = profile.getSettings() == null || profile.getSettings().isShowOnlineStatus();

        userProfileRepository.save(profile);

        if (oldShowOnline != newShowOnline) {
            webSocketAppHandler.handlePresenceToggle(userId, newShowOnline);
        }

        if (coreMatchingFieldsChanged) {
            log.info("Core matching profile fields changed for user {}. Purging and triggering a fresh sync.", userId);
            jobService.purgeJobsForUser(userId);
            jobSyncService.syncJobsForUser(userId);
        } else {
            log.info("No core matching profile fields changed for user {}. Skipping sync/purge.", userId);
        }

        hydrateUrls(profile);
        return profile;
    }

    public UserProfile uploadProfilePhoto(String userId, MultipartFile file) {
        log.info("Starting profile photo upload for user: {}", userId);
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElse(UserProfile.builder().userId(userId).build());
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file", e);
        }
        
        String s3Key = s3Service.uploadFile(bytes, file.getOriginalFilename(), userId, "photos");
        profile.setProfilePhotoUrl(s3Key);
        UserProfile saved = userProfileRepository.save(profile);
        hydrateUrls(saved);
        return saved;
    }

    public UserProfile uploadCoverImage(String userId, MultipartFile file) {
        log.info("Starting cover image upload for user: {}", userId);
        UserProfile profile = getProfile(userId);
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file", e);
        }
        
        String s3Key = s3Service.uploadFile(bytes, file.getOriginalFilename(), userId, "covers");
        profile.setCoverImageUrl(s3Key);
        UserProfile saved = userProfileRepository.save(profile);
        hydrateUrls(saved);
        return saved;
    }

    public UserProfile setPredefinedCover(String userId, String imageUrl) {
        log.info("Setting predefined cover for user: {}", userId);
        UserProfile profile = getProfile(userId);
        profile.setCoverImageUrl(imageUrl);
        UserProfile saved = userProfileRepository.save(profile);
        hydrateUrls(saved);
        return saved;
    }

    public UserProfile generateAiCover(String userId, String style) {
        log.info("Generating AI cover for user: {} with style: {}", userId, style);
        UserProfile profile = getProfile(userId);
        
        // Use AI to generate a prompt based on user's bio/skills
        String promptRequest = String.format(
            "Based on this user profile, generate a short 5-10 word professional image prompt for a LinkedIn cover banner. " +
            "Style: %s. Bio: %s. Skills: %s. " +
            "IMPORTANT: Return ONLY the prompt text. NO special characters, NO dots, NO commas. ONLY letters and spaces.",
            style, profile.getBio(), profile.getSkills()
        );
        
        String imagePrompt = chatClient.prompt().user(promptRequest).call().content();
        // Clean prompt: remove trailing period, newlines and extra spaces
        if (imagePrompt != null) {
            imagePrompt = imagePrompt.trim().replaceAll("\\.$", "");
        }
        log.debug("AI Image Prompt: {}", imagePrompt);
        
        // Using image.pollinations.ai with the turbo model for better speed and stability
        String encodedPrompt = java.net.URLEncoder.encode(imagePrompt, java.nio.charset.StandardCharsets.UTF_8)
                .replace("+", "%20");
        String aiImageUrl = "https://image.pollinations.ai/prompt/" + encodedPrompt + "?width=1200&height=400&model=turbo&nologo=true&seed=" + System.currentTimeMillis();
        
        log.info("Downloading AI image to persist in S3: {}", aiImageUrl);
        try {
            // Use a clean Chrome-like User-Agent to avoid blocks during download
            java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder()
                    .followRedirects(java.net.http.HttpClient.Redirect.ALWAYS)
                    .build();
            
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(aiImageUrl))
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .timeout(java.time.Duration.ofSeconds(60))
                    .build();

            java.net.http.HttpResponse<byte[]> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofByteArray());
            
            if (response.statusCode() == 200) {
                // Upload to S3 under covers/
                String s3Key = s3Service.uploadFile(response.body(), "ai-cover.jpg", userId, "covers");
                profile.setCoverImageUrl(s3Key);
                log.info("AI Cover persisted to S3 with key: {}", s3Key);
            } else {
                log.warn("Failed to download AI image (Status: {}). Falling back to URL.", response.statusCode());
                profile.setCoverImageUrl(aiImageUrl);
            }
        } catch (Exception e) {
            log.error("Error persisting AI image to S3: {}", e.getMessage());
            profile.setCoverImageUrl(aiImageUrl); // Fallback to raw URL
        }

        UserProfile saved = userProfileRepository.save(profile);
        hydrateUrls(saved);
        return saved;
    }

    public UserProfile uploadResume(String userId, MultipartFile file) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElse(UserProfile.builder().userId(userId).build());
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file", e);
        }
        
        String s3Key = s3Service.uploadFile(bytes, file.getOriginalFilename(), userId);
        profile.setResumeS3Url(s3Key);
        
        // Extract text from the uploaded PDF resume
        String extractedText = extractTextFromPdf(file);
        profile.setRawResumeText(extractedText);
        
        // Save the profile first with the new resume link and text
        userProfileRepository.save(profile);
        
        // Use AI to generate a suggestion, but do NOT save it to the DB yet
        // The frontend will receive this populated profile and ask for approval
        UserProfile suggestions = profileAiAgent.extractProfileFromResume(extractedText);
        
        // Copy suggestions into the transient profile object we return to the frontend
        profile.setFullName(suggestions.getFullName());
        profile.setHeadline(suggestions.getHeadline());
        profile.setBio(suggestions.getBio());
        profile.setSkills(suggestions.getSkills());
        profile.setExperiences(suggestions.getExperiences());
        profile.setInternships(suggestions.getInternships());
        profile.setAcademicProjects(suggestions.getAcademicProjects());
        profile.setCertifications(suggestions.getCertifications());
        
        // Also trigger an initial sync in the background so job matching works with the raw text
        jobService.purgeJobsForUser(userId);
        jobSyncService.syncJobsForUser(userId);
        
        hydrateUrls(profile);
        return profile;
    }

    /**
     * Combined onboarding: Upload resume + set preferences in one flow.
     * Called from onboarding endpoint after user completes all steps.
     */
    public UserProfile completeOnboarding(String userId, MultipartFile resumeFile,
                                           String headline, String bio,
                                           String parsedGoals, String preferredLocation,
                                           String preferredSalary, String preferredLifestyle) {
        UserProfile profile = getProfile(userId);
        
        // Step 1: Process resume if provided
        if (resumeFile != null && !resumeFile.isEmpty()) {
            byte[] bytes;
            try {
                bytes = resumeFile.getBytes();
            } catch (IOException e) {
                throw new RuntimeException("Failed to read file", e);
            }
            
            String s3Key = s3Service.uploadFile(bytes, resumeFile.getOriginalFilename(), userId);
            profile.setResumeS3Url(s3Key); // Store key
            
            String extractedText = extractTextFromPdf(resumeFile);
            profile.setRawResumeText(extractedText);
            
            UserProfile extractedInfo = profileAiAgent.extractProfileFromResume(extractedText);
            profile.setSkills(extractedInfo.getSkills());
            profile.setExperiences(extractedInfo.getExperiences());
            profile.setInternships(extractedInfo.getInternships());
            profile.setAcademicProjects(extractedInfo.getAcademicProjects());
            profile.setCertifications(extractedInfo.getCertifications());

            // Use AI-extracted identity if user didn't provide their own
            if ((profile.getFullName() == null || profile.getFullName().isBlank()) && extractedInfo.getFullName() != null) {
                profile.setFullName(extractedInfo.getFullName());
            }
            if ((headline == null || headline.isBlank()) && extractedInfo.getHeadline() != null) {
                profile.setHeadline(extractedInfo.getHeadline());
            }
            if ((bio == null || bio.isBlank()) && extractedInfo.getBio() != null) {
                profile.setBio(extractedInfo.getBio());
            }
            if ((parsedGoals == null || parsedGoals.isBlank()) && extractedInfo.getParsedGoals() != null) {
                profile.setParsedGoals(extractedInfo.getParsedGoals());
            }
        }
        
        // Step 2: Set preferences and manual info
        if (headline != null && !headline.isBlank()) {
            profile.setHeadline(headline);
        }
        if (bio != null && !bio.isBlank()) {
            profile.setBio(bio);
        }
        if (parsedGoals != null && !parsedGoals.isBlank()) {
            profile.setParsedGoals(parsedGoals);
        }
        if (preferredLocation != null && !preferredLocation.isBlank()) {
            profile.setPreferredLocation(preferredLocation);
        }
        if (preferredSalary != null && !preferredSalary.isBlank()) {
            profile.setPreferredSalary(preferredSalary);
        }
        if (preferredLifestyle != null && !preferredLifestyle.isBlank()) {
            profile.setPreferredLifestyle(preferredLifestyle);
        }
        
        // Step 3: Save and trigger multi-source sync
        userProfileRepository.save(profile);
        jobSyncService.syncJobsForUser(userId);
        hydrateUrls(profile);
        return profile;
    }

    public void deleteProfile(String userId) {
        log.info("Deleting entire career profile for user: {}", userId);
        userProfileRepository.findByUserId(userId).ifPresent(profile -> {
            // Delete S3 assets
            if (profile.getResumeS3Url() != null) s3Service.deleteFile(profile.getResumeS3Url());
            if (profile.getProfilePhotoUrl() != null) s3Service.deleteFile(profile.getProfilePhotoUrl());
            if (profile.getCoverImageUrl() != null && !profile.getCoverImageUrl().startsWith("http")) {
                s3Service.deleteFile(profile.getCoverImageUrl());
            }
            
            // Purge jobs
            jobService.purgeJobsForUser(userId);
            
            // Delete from DB
            userProfileRepository.delete(profile);
            log.info("Profile deleted for user: {}", userId);
        });
    }

    private String extractTextFromPdf(MultipartFile file) {
        try (PDDocument document = PDDocument.load(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        } catch (IOException e) {
            throw new RuntimeException("Failed to extract text from PDF", e);
        }
    }

    private void updateMentionsInPosts(String oldUsername, String newUsername) {
        try {
            String targetMention = "@" + oldUsername.toLowerCase();
            java.util.List<Post> posts = postRepository.findAll();
            java.util.List<Post> updatedPosts = new java.util.ArrayList<>();

            for (Post post : posts) {
                boolean updated = false;

                if (post.getContent() != null && post.getContent().toLowerCase().contains(targetMention)) {
                    post.setContent(replaceMention(post.getContent(), oldUsername, newUsername));
                    updated = true;
                }

                if (post.getComments() != null) {
                    for (Post.Comment comment : post.getComments()) {
                        if (comment.getContent() != null && comment.getContent().toLowerCase().contains(targetMention)) {
                            comment.setContent(replaceMention(comment.getContent(), oldUsername, newUsername));
                            updated = true;
                        }
                    }
                }

                if (updated) {
                    updatedPosts.add(post);
                }
            }

            if (!updatedPosts.isEmpty()) {
                postRepository.saveAll(updatedPosts);
                log.info("Successfully updated username mentions from @{} to @{} in {} posts/comments.", oldUsername, newUsername, updatedPosts.size());
            }
        } catch (Exception e) {
            log.error("Failed to update username mentions from @{} to @{}: {}", oldUsername, newUsername, e.getMessage(), e);
        }
    }

    private String replaceMention(String text, String oldUsername, String newUsername) {
        if (text == null) return null;
        String regex = "(?i)@" + java.util.regex.Pattern.quote(oldUsername) + "\\b";
        return text.replaceAll(regex, "@" + newUsername);
    }

    public UserProfile updateE2eeKeys(String userId, String publicKey, String privateKey) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseGet(() -> UserProfile.builder().userId(userId).build());
        profile.setE2eePublicKey(publicKey);
        profile.setE2eePrivateKey(privateKey);
        return userProfileRepository.save(profile);
    }

    public UserProfile updateMatchWeights(String userId, java.util.Map<String, Double> weights) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found for user: " + userId));
        profile.setMatchWeights(weights);

        // Evict matching/recommendation cache after preferences update so they recalculate instantly!
        try {
            org.springframework.cache.Cache recommendedCache = cacheManager.getCache("recommendedJobs");
            if (recommendedCache != null) recommendedCache.evict(userId);
            org.springframework.cache.Cache catalogCache = cacheManager.getCache("jobCatalog");
            if (catalogCache != null) catalogCache.evict(userId);
            org.springframework.cache.Cache dashboardCache = cacheManager.getCache("jobDashboard");
            if (dashboardCache != null) dashboardCache.evict(userId);
        } catch (Exception e) {
            log.error("Failed to evict caches on match preference update: {}", e.getMessage());
        }

        return userProfileRepository.save(profile);
    }
}
