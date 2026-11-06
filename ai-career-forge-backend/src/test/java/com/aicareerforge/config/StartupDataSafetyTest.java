package com.aicareerforge.config;

import com.aicareerforge.repository.PostRepository;
import com.aicareerforge.repository.UserProfileRepository;
import com.aicareerforge.repository.UserRepository;
import com.aicareerforge.security.WebSocketAppHandler;
import com.aicareerforge.service.PostService;
import com.aicareerforge.service.PushNotificationService;
import com.aicareerforge.service.S3Service;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class StartupDataSafetyTest {
    @Test
    void applicationReadyDoesNotReadOrRewriteTheCommunityFeed() {
        PostRepository posts = mock(PostRepository.class);
        UserRepository users = mock(UserRepository.class);
        UserProfileRepository profiles = mock(UserProfileRepository.class);
        S3Service storage = mock(S3Service.class);
        PushNotificationService notifications = mock(PushNotificationService.class);
        WebSocketAppHandler sockets = mock(WebSocketAppHandler.class);

        // Register the real service so Spring discovers its actual event
        // listeners, but replace every external dependency with a local mock.
        new ApplicationContextRunner()
                .withBean(PostService.class, () -> new PostService(posts, users, profiles, storage, notifications, sockets))
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    context.publishEvent(new ApplicationReadyEvent(new SpringApplication(PostService.class),
                            new String[0], context.getSourceApplicationContext(), Duration.ZERO));
                    verifyNoInteractions(posts, users, profiles, storage, notifications, sockets);
                });
    }
}
