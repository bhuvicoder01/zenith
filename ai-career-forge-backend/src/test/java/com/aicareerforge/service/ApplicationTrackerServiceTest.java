package com.aicareerforge.service;

import com.aicareerforge.model.Application;
import com.aicareerforge.model.User;
import com.aicareerforge.model.UserProfile;
import com.aicareerforge.repository.ApplicationRepository;
import com.aicareerforge.repository.JobRepository;
import com.aicareerforge.repository.UserProfileRepository;
import com.aicareerforge.repository.UserRepository;
import com.aicareerforge.security.WebSocketAppHandler;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ApplicationTrackerServiceTest {
    private final ApplicationRepository applications = mock(ApplicationRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final UserProfileRepository profiles = mock(UserProfileRepository.class);
    private final ApplicationPrepAgent prep = mock(ApplicationPrepAgent.class);
    private final PdfGenerationService pdf = mock(PdfGenerationService.class);
    private final S3Service s3 = mock(S3Service.class);
    private final WebSocketAppHandler socket = mock(WebSocketAppHandler.class);
    private final JobRepository jobs = mock(JobRepository.class);
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final ApplicationTrackerService service = new ApplicationTrackerService(
            applications, users, profiles, prep, pdf, s3, socket, jobs, mongo);

    @Test
    void creatingSavedApplicationCannotOverwriteAnExistingIdOrClaimSubmission() {
        Application incoming = Application.builder().id("another-record").userId("other")
                .status(Application.Status.APPLIED).appliedDate(LocalDateTime.now())
                .tailoredResumeS3Url("another/users/file.pdf").build();
        when(applications.save(any(Application.class))).thenAnswer(call -> call.getArgument(0));
        Application saved = service.createApplication("owner", incoming);
        assertThat(saved.getId()).isNull();
        assertThat(saved.getUserId()).isEqualTo("owner");
        assertThat(saved.getStatus()).isEqualTo(Application.Status.SAVED);
        assertThat(saved.getAppliedDate()).isNull();
        assertThat(saved.getTailoredResumeS3Url()).isNull();
    }

    @Test
    void foreignOrMissingApplicationIsRejectedBeforeReadingResumesOrCallingProviders() {
        when(applications.findById("app")).thenReturn(Optional.of(application(Application.Status.SAVED)));
        assertThatThrownBy(() -> service.prepareApplicationMaterials("app", "intruder", null, null))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatusCode().value()).isEqualTo(404));
        when(applications.findById("missing")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.prepareApplicationMaterials("missing", "owner", null, null))
                .isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(users, profiles, prep, pdf, s3, socket, jobs, mongo);
    }

    @Test
    void reusedApplicationReturnsFreshPrivateDocumentUrl() {
        Application existing = application(Application.Status.SAVED);
        existing.setTailoredResumeS3Url("users/owner/resumes/1-resume.pdf");
        when(applications.findFirstByUserIdAndJobIdAndTemplateStyle("owner", "job", "MODERN"))
                .thenReturn(Optional.of(existing));
        when(s3.getPrivateAssetUrl("users/owner/resumes/1-resume.pdf", "owner"))
                .thenReturn("https://signed.example/resume.pdf");
        Application request = Application.builder().jobId("job").templateStyle("MODERN").build();
        assertThat(service.createApplication("owner", request).getTailoredResumeS3Url())
                .isEqualTo("https://signed.example/resume.pdf");
        verify(applications, never()).save(any());
    }

    @Test
    void preparingDocumentsDoesNotSubmitApplicationOrOverwriteConcurrentUserStatus() throws Exception {
        Application original = application(Application.Status.SAVED);
        givenProfile(original);
        when(prep.tailorResume(any(), anyString())).thenReturn(Map.of(
                "resumeSummary", "Existing profile summary", "topSkills", List.of("Java"),
                "optimizedExperiences", List.of(), "relevantProjects", List.of(),
                "relevantCertifications", List.of(), "relevantInternships", List.of()));
        when(prep.generateCommunicationKit(anyString(), anyString()))
                .thenReturn(Map.of("coverLetter", "Cover draft", "emailIntro", "Email draft"));
        when(prep.generateInterviewPrepKit(anyString(), anyString(), anyString())).thenReturn("Practice questions");
        when(pdf.generatePdf(anyString(), anyMap())).thenReturn(new byte[]{1, 2});
        when(s3.uploadFile(any(byte[].class), anyString(), eq("owner"))).thenReturn("owner/resume.pdf");
        Application fresh = application(Application.Status.INTERVIEW);
        fresh.setTailoredResumeS3Url("owner/resume.pdf");
        fresh.setAppliedDate(LocalDateTime.of(2026, 1, 1, 12, 0));
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class),
                eq(Application.class))).thenReturn(fresh);
        when(s3.getPrivateAssetUrl("owner/resume.pdf", "owner")).thenReturn("https://signed.example/resume.pdf");

        Application result = service.prepareApplicationMaterials("app", "owner", "Java role", "Acme");
        assertThat(original.getStatus()).isEqualTo(Application.Status.SAVED);
        assertThat(result.getStatus()).isEqualTo(Application.Status.INTERVIEW);
        assertThat(result.getAppliedDate()).isEqualTo(LocalDateTime.of(2026, 1, 1, 12, 0));
        assertThat(result.getTailoredResumeS3Url()).isEqualTo("https://signed.example/resume.pdf");
        ArgumentCaptor<Update> update = ArgumentCaptor.forClass(Update.class);
        ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class);
        verify(mongo).findAndModify(query.capture(), update.capture(), any(FindAndModifyOptions.class),
                eq(Application.class));
        assertThat(query.getValue().getQueryObject()).containsEntry("userId", "owner").containsEntry("_id", "app");
        Document fields = update.getValue().getUpdateObject().get("$set", Document.class);
        assertThat(fields).containsEntry("tailoredResumeS3Url", "owner/resume.pdf")
                .containsEntry("emailIntroduction", "Email draft").doesNotContainKeys("status", "appliedDate");
        verify(applications, never()).save(any());
        var order = inOrder(mongo, socket);
        order.verify(mongo).findAndModify(any(Query.class), any(Update.class),
                any(FindAndModifyOptions.class), eq(Application.class));
        order.verify(socket).sendNotification(eq("owner"), eq("PREP_STATUS"), eq("Preparation Completed"),
                anyString(), anyMap());
    }

    @Test
    void preparationFailurePreservesStatusAndDoesNotExposeProviderErrors() {
        Application original = application(Application.Status.OFFER);
        givenProfile(original);
        when(prep.generateCommunicationKit(anyString(), anyString()))
                .thenThrow(new IllegalStateException("PRIVATE-PROVIDER-PAYLOAD"));
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class),
                eq(Application.class))).thenReturn(original);
        Application result = service.prepareApplicationMaterials("app", "owner", "Java role", "Acme");
        assertThat(result.getStatus()).isEqualTo(Application.Status.OFFER);
        assertThat(result.getTailoredResumeS3Url()).isNull();
        verify(socket).sendNotification(eq("owner"), eq("PREP_STATUS"), eq("Preparation Failed"),
                argThat(message -> !message.contains("PRIVATE-PROVIDER-PAYLOAD")),
                argThat(data -> !data.toString().contains("PRIVATE-PROVIDER-PAYLOAD")));
        verifyNoInteractions(pdf);
    }

    @Test
    void explicitAppliedTransitionSetsTimestampAndReturningToSavedClearsIt() {
        Application app = application(Application.Status.SAVED);
        when(applications.findById("app")).thenReturn(Optional.of(app));
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class),
                eq(Application.class))).thenReturn(app);
        service.updateStatus("app", Application.Status.APPLIED, "owner");
        service.updateStatus("app", Application.Status.SAVED, "owner");
        ArgumentCaptor<Update> updates = ArgumentCaptor.forClass(Update.class);
        verify(mongo, times(2)).findAndModify(any(Query.class), updates.capture(), any(FindAndModifyOptions.class),
                eq(Application.class));
        Document submitted = updates.getAllValues().get(0).getUpdateObject().get("$set", Document.class);
        Document saved = updates.getAllValues().get(1).getUpdateObject().get("$set", Document.class);
        assertThat(submitted.get("appliedDate")).isInstanceOf(LocalDateTime.class);
        assertThat(saved).containsEntry("appliedDate", null);
    }

    private void givenProfile(Application app) {
        when(applications.findById("app")).thenReturn(Optional.of(app));
        when(users.findById("owner")).thenReturn(Optional.of(User.builder().id("owner").name("Asha")
                .email("asha@example.test").build()));
        when(profiles.findByUserId("owner")).thenReturn(Optional.of(UserProfile.builder()
                .userId("owner").skills(List.of("Java")).rawResumeText("Verified resume facts").build()));
    }

    private Application application(Application.Status status) {
        return Application.builder().id("app").userId("owner").company("Acme")
                .jobTitle("Developer").templateStyle("MODERN").status(status).build();
    }
}
