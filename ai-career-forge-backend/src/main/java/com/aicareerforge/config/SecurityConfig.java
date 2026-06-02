package com.aicareerforge.config;

import com.aicareerforge.security.CustomUserDetailsService;
import com.aicareerforge.security.JwtAuthenticationFilter;
import com.aicareerforge.security.OAuth2SuccessHandler;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final CustomUserDetailsService userDetailsService;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final org.springframework.security.authentication.AuthenticationProvider authenticationProvider;
    
    @Value("${cors.allowed-origins}")
    private List<String> allowedOrigins;

    private String getCspPolicy() {
        String origins = String.join(" ", allowedOrigins.stream()
                .map(String::trim)
                .toList());
        return "frame-ancestors 'self' " + origins;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .headers(headers -> headers
                        .frameOptions(frameOptions -> frameOptions.disable())
                        .addHeaderWriter(new org.springframework.security.web.header.writers.StaticHeadersWriter("X-ZENITH-SECURITY", "ACTIVE"))
                        .contentSecurityPolicy(csp -> csp
                                .policyDirectives(getCspPolicy())
                        )
                )
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ASYNC).permitAll()
                        .requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.OPTIONS, "/**")).permitAll()
                        .requestMatchers(
                                AntPathRequestMatcher.antMatcher("/"),
                                AntPathRequestMatcher.antMatcher("/api/v1/auth/register"),
                                AntPathRequestMatcher.antMatcher("/api/v1/auth/authenticate"),
                                AntPathRequestMatcher.antMatcher("/api/v1/auth/forgot-password"),
                                AntPathRequestMatcher.antMatcher("/api/v1/auth/reset-password"),
                                AntPathRequestMatcher.antMatcher("/api/v1/public/**"),
                                AntPathRequestMatcher.antMatcher("/api/v1/profile/public/**"),
                                AntPathRequestMatcher.antMatcher("/api/v1/assistant/**"),
                                AntPathRequestMatcher.antMatcher("/api/v1/jobs/public"),
                                AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/v1/posts"),
                                AntPathRequestMatcher.antMatcher(HttpMethod.GET, "/api/v1/posts/*"),
                                AntPathRequestMatcher.antMatcher(HttpMethod.POST, "/api/v1/posts/*/view"),
                                AntPathRequestMatcher.antMatcher("/ws/app"),
                                AntPathRequestMatcher.antMatcher("/error")
                        ).permitAll()
                        .requestMatchers(AntPathRequestMatcher.antMatcher("/api/v1/recruiter/**")).hasRole("RECRUITER")
                        .requestMatchers(AntPathRequestMatcher.antMatcher("/api/v1/admin/**")).hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .exceptionHandling(handler -> handler
                        .authenticationEntryPoint((request, response, authException) -> {
                            System.err.println("Unauthorized request for: " + request.getRequestURI());
                            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                        })
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authenticationProvider(authenticationProvider)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .oauth2Login(oauth2 -> oauth2
                        .successHandler(oAuth2SuccessHandler)
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins.stream().map(String::trim).toList());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
