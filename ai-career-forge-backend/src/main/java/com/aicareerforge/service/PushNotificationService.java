package com.aicareerforge.service;

import com.aicareerforge.model.PushSubscription;
import com.aicareerforge.model.UserProfile;
import com.aicareerforge.model.VapidKey;
import com.aicareerforge.repository.PushSubscriptionRepository;
import com.aicareerforge.repository.UserProfileRepository;
import com.aicareerforge.repository.VapidKeyRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.*;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PushNotificationService {

    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final VapidKeyRepository vapidKeyRepository;
    private final UserProfileRepository userProfileRepository;
    private final ObjectMapper objectMapper;

    @Value("${vapid.public-key:}")
    private String configuredPublicKey;

    @Value("${vapid.private-key:}")
    private String configuredPrivateKey;

    @Value("${vapid.subject:mailto:supportzenith247@gmail.com}")
    private String subject;

    private PushService pushService;
    private String activePublicKey;
    private String activePrivateKey;

    @PostConstruct
    public void init() {
        // 1. Add BouncyCastle Provider if not already present
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
            log.info("BouncyCastle Security Provider added successfully.");
        }

        // 2. Load VAPID Keys (Env/Properties -> Database -> Generate New)
        try {
            if (configuredPublicKey != null && !configuredPublicKey.trim().isEmpty() &&
                    configuredPrivateKey != null && !configuredPrivateKey.trim().isEmpty()) {
                activePublicKey = configuredPublicKey.trim();
                activePrivateKey = configuredPrivateKey.trim();
                log.info("VAPID Keys initialized from properties/environment variables.");
            } else {
                List<VapidKey> keys = vapidKeyRepository.findAll();
                if (!keys.isEmpty()) {
                    VapidKey savedKey = keys.get(0);
                    activePublicKey = savedKey.getPublicKey();
                    activePrivateKey = savedKey.getPrivateKey();
                    log.info("VAPID Keys loaded from MongoDB database collection.");
                } else {
                    log.info("No VAPID keys found. Generating new persistent VAPID key pair...");
                    generateAndSaveVapidKeys();
                }
            }

            // 3. Initialize nl.martijndwars.webpush.PushService
            pushService = new PushService(activePublicKey, activePrivateKey, subject);
            log.info("PushService successfully initialized with VAPID Public Key: {}", activePublicKey);
        } catch (Exception e) {
            log.error("Failed to initialize VAPID Keys or PushService: {}", e.getMessage(), e);
        }
    }

    private void generateAndSaveVapidKeys() throws NoSuchAlgorithmException, NoSuchProviderException, InvalidAlgorithmParameterException {
        KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("EC", BouncyCastleProvider.PROVIDER_NAME);
        ECGenParameterSpec ecGenParameterSpec = new ECGenParameterSpec("prime256v1");
        keyPairGenerator.initialize(ecGenParameterSpec);
        KeyPair keyPair = keyPairGenerator.generateKeyPair();

        // Public key is uncompressed EC point (65 bytes)
        byte[] publicKeyBytes = ((org.bouncycastle.jce.interfaces.ECPublicKey) keyPair.getPublic()).getQ().getEncoded(false);
        activePublicKey = Base64.getUrlEncoder().withoutPadding().encodeToString(publicKeyBytes);

        // Private key is standard D value (32 bytes)
        byte[] sBytes = ((ECPrivateKey) keyPair.getPrivate()).getS().toByteArray();
        byte[] privateKeyBytesNormalized = new byte[32];
        if (sBytes.length > 32) {
            System.arraycopy(sBytes, sBytes.length - 32, privateKeyBytesNormalized, 0, 32);
        } else if (sBytes.length < 32) {
            System.arraycopy(sBytes, 0, privateKeyBytesNormalized, 32 - sBytes.length, sBytes.length);
        } else {
            privateKeyBytesNormalized = sBytes;
        }
        activePrivateKey = Base64.getUrlEncoder().withoutPadding().encodeToString(privateKeyBytesNormalized);

        VapidKey vapidKey = VapidKey.builder()
                .publicKey(activePublicKey)
                .privateKey(activePrivateKey)
                .createdAt(Instant.now())
                .build();

        vapidKeyRepository.save(vapidKey);
        log.info("Generated and stored new persistent VAPID Key pair in MongoDB.");
    }

    public String getPublicKey() {
        return this.activePublicKey;
    }

    public void subscribe(String userId, String endpoint, String p256dh, String auth) {
        Optional<PushSubscription> existing = pushSubscriptionRepository.findByEndpoint(endpoint);
        if (existing.isPresent()) {
            PushSubscription sub = existing.get();
            sub.setUserId(userId);
            sub.setP256dh(p256dh);
            sub.setAuth(auth);
            pushSubscriptionRepository.save(sub);
            log.info("Updated push subscription for user: {}", userId);
        } else {
            PushSubscription newSub = PushSubscription.builder()
                    .userId(userId)
                    .endpoint(endpoint)
                    .p256dh(p256dh)
                    .auth(auth)
                    .createdAt(Instant.now())
                    .build();
            pushSubscriptionRepository.save(newSub);
            log.info("Registered new push subscription for user: {}", userId);
        }
    }

    public void unsubscribe(String endpoint) {
        pushSubscriptionRepository.findByEndpoint(endpoint).ifPresent(sub -> {
            pushSubscriptionRepository.delete(sub);
            log.info("Deleted push subscription for user: {}", sub.getUserId());
        });
    }

    public void sendPushNotification(String userId, String title, String message, Object payloadData) {
        // Check if user has disabled device level notifications in settings
        Optional<UserProfile> profileOpt = userProfileRepository.findByUserId(userId);
        if (profileOpt.isPresent()) {
            UserProfile profile = profileOpt.get();
            if (profile.getSettings() != null && !profile.getSettings().isDeviceNotifications()) {
                log.info("Skipping push notification for user {} - user disabled deviceNotifications.", userId);
                return;
            }
        }

        List<PushSubscription> subscriptions = pushSubscriptionRepository.findByUserId(userId);
        if (subscriptions.isEmpty()) {
            log.debug("No active push subscriptions found for user ID: {}", userId);
            return;
        }

        log.info("Sending push notification to user: {} (Subscriptions found: {})", userId, subscriptions.size());

        // Prepare push payload
        String redirectUrl = "/dashboard";
        if (payloadData instanceof Map) {
            Map<?, ?> dataMap = (Map<?, ?>) payloadData;
            if (dataMap.containsKey("postId")) {
                redirectUrl = "/posts/" + dataMap.get("postId");
            } else if (dataMap.containsKey("senderId")) {
                redirectUrl = "/dashboard/messages?userId=" + dataMap.get("senderId");
            }
        }

        Map<String, Object> payloadMap = Map.of(
                "title", title,
                "body", message,
                "data", Map.of("url", redirectUrl)
        );

        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(payloadMap);
        } catch (IOException e) {
            log.error("Failed to serialize push payload JSON: {}", e.getMessage());
            return;
        }

        for (PushSubscription sub : subscriptions) {
            try {
                Subscription webPushSub = new Subscription(
                        sub.getEndpoint(),
                        new Subscription.Keys(sub.getP256dh(), sub.getAuth())
                );
                Notification notification = new Notification(webPushSub, payloadJson);
                
                // Send push notification asynchronously / synchronously
                pushService.send(notification);
                log.debug("Push notification delivered successfully to endpoint: {}", sub.getEndpoint());

            } catch (Exception e) {
                log.error("Error sending push notification to endpoint {}: {}", sub.getEndpoint(), e.getMessage());
                // Handle invalid/expired subscriptions
                if (e.getMessage() != null && (e.getMessage().contains("410") || e.getMessage().contains("404"))) {
                    log.info("Subscription endpoint has expired or is invalid. Purging from DB: {}", sub.getEndpoint());
                    pushSubscriptionRepository.delete(sub);
                }
            }
        }
    }
}
