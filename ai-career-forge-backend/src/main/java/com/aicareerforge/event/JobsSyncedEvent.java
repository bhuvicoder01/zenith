package com.aicareerforge.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.List;

/**
 * Published after a batch of jobs has been synced from external sources.
 * Listeners can use this to trigger re-scoring, cache refresh, or notifications.
 */
@Getter
public class JobsSyncedEvent extends ApplicationEvent {

    private final String userId;
    private final String keyword;
    private final int jobCount;
    private final List<String> sources;

    public JobsSyncedEvent(Object source, String userId, String keyword, int jobCount, List<String> sources) {
        super(source);
        this.userId = userId;
        this.keyword = keyword;
        this.jobCount = jobCount;
        this.sources = sources;
    }
}
