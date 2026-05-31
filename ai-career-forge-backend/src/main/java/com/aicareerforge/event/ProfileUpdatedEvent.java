package com.aicareerforge.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Published when a user's profile is updated (e.g., new resume parsed, skills changed).
 * Listeners can trigger job re-matching and cache invalidation.
 */
@Getter
public class ProfileUpdatedEvent extends ApplicationEvent {

    private final String userId;

    public ProfileUpdatedEvent(Object source, String userId) {
        super(source);
        this.userId = userId;
    }
}
