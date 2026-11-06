package com.aicareerforge.service;

import com.aicareerforge.model.Application;
import com.aicareerforge.repository.ApplicationRepository;
import com.aicareerforge.repository.UserJobMatchRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class JobPipelineStatusTest {
    @Test
    void preparingInPipelineDoesNotMeanAnApplicationWasSubmitted() {
        ApplicationRepository applications = mock(ApplicationRepository.class);
        UserJobMatchRepository matches = mock(UserJobMatchRepository.class);
        JobService service = new JobService(mock(JobCatalogService.class), mock(JobMatchingService.class),
                new JobScoringService(), mock(JobScoreCache.class), mock(JobSyncOrchestrator.class),
                mock(JobEnrichmentService.class), matches, applications);
        Application app = Application.builder().id("app").userId("owner").status(Application.Status.SAVED).build();
        when(matches.findFirstByUserIdAndJobId("owner", "job")).thenReturn(Optional.empty());
        when(applications.findByUserIdAndJobId("owner", "job")).thenReturn(List.of(app));
        service.updateJobPipelineStage("owner", "job", "APPLYING");
        assertThat(app.getStatus()).isEqualTo(Application.Status.SAVED);
        assertThat(app.getAppliedDate()).isNull();
        service.updateJobPipelineStage("owner", "job", "APPLIED");
        assertThat(app.getStatus()).isEqualTo(Application.Status.APPLIED);
        assertThat(app.getAppliedDate()).isNotNull();
    }
}
