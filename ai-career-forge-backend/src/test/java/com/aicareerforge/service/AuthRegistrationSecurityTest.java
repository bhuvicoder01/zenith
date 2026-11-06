package com.aicareerforge.service;

import com.aicareerforge.dto.AuthDtos.AuthResponse;
import com.aicareerforge.dto.AuthDtos.RegisterRequest;
import com.aicareerforge.model.User;
import com.aicareerforge.repository.PasswordResetTokenRepository;
import com.aicareerforge.repository.UserProfileRepository;
import com.aicareerforge.repository.UserRepository;
import com.aicareerforge.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthRegistrationSecurityTest {
    @Mock UserRepository users;
    @Mock UserProfileRepository profiles;
    @Mock PasswordEncoder encoder;
    @Mock JwtService jwt;
    @Mock AuthenticationManager authentication;
    @Mock UserProfileService profileService;
    @Mock PasswordResetTokenRepository resetTokens;
    @Mock EmailService emails;

    private AuthService auth;

    @BeforeEach
    void setUp() {
        auth = new AuthService(users, profiles, encoder, jwt, authentication, profileService, resetTokens, emails);
    }

    @ParameterizedTest
    @EnumSource(value = User.Role.class, names = {"ADMIN", "PENDING"})
    void publicRegistrationCannotCreatePrivilegedOrInternalRoles(User.Role role) {
        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> auth.register(request(role)));

        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(users, profiles, encoder, jwt, authentication, profileService, resetTokens, emails);
    }

    @ParameterizedTest
    @EnumSource(value = User.Role.class, names = {"USER", "RECRUITER"})
    void intendedSelfServiceRolesCanRegister(User.Role role) {
        stubSuccessfulRegistration();

        AuthResponse response = auth.register(request(role));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().getRole()).isEqualTo(role);
        assertThat(saved.getValue().getPassword()).isEqualTo("hashed-password");
        assertThat(response.getRole()).isEqualTo(role);
        assertThat(response.getToken()).isEqualTo("test-issued-token");
    }

    @Test
    void omittedRoleDefaultsToCandidate() {
        stubSuccessfulRegistration();

        assertThat(auth.register(request(null)).getRole()).isEqualTo(User.Role.USER);
    }

    @Test
    void invalidPasswordIsRejectedBeforePersistence() {
        for (String password : new String[] {null, "short", "a".repeat(73), "\u20ac".repeat(25)}) {
            RegisterRequest request = request(User.Role.USER);
            request.setPassword(password);
            assertThat(assertThrows(ResponseStatusException.class,
                    () -> auth.register(request)).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
        verifyNoInteractions(users, profiles, encoder, jwt, authentication, profileService, resetTokens, emails);
    }

    private RegisterRequest request(User.Role role) {
        return RegisterRequest.builder().name("Test Candidate").email("candidate@example.invalid")
                .password("test-password").role(role).build();
    }

    private void stubSuccessfulRegistration() {
        when(encoder.encode(anyString())).thenReturn("hashed-password");
        when(users.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId("new-user-id");
            return user;
        });
        when(jwt.generateToken(any(User.class))).thenReturn("test-issued-token");
    }
}
