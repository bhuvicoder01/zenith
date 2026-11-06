package com.aicareerforge.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.cloud.function.context.FunctionCatalog;
import org.springframework.cloud.function.context.config.ContextFunctionCatalogAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Locale;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;

class CloudFunctionCompatibilityTest {
    @Test
    void transitiveFunctionAutoConfigurationStartsWithTheCurrentSpringBootVersion() {
        // This is the real transitive auto-configuration that failed in production.
        // The runner imports no application configuration, .env, cloud clients,
        // credentials, databases, scheduled work, or provider integrations.
        new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(ContextFunctionCatalogAutoConfiguration.class))
                .withUserConfiguration(LocalFunctionConfiguration.class)
                .run(context -> {
                    assertThat(context).hasNotFailed().hasSingleBean(FunctionCatalog.class);
                    Function<String, String> function = context.getBean(FunctionCatalog.class).lookup("careerLabel");
                    assertThat(function).isNotNull();
                    assertThat(function.apply("software engineer")).isEqualTo("SOFTWARE ENGINEER");
                });
    }

    @Configuration(proxyBeanMethods = false)
    static class LocalFunctionConfiguration {
        @Bean
        Function<String, String> careerLabel() {
            return value -> value.toUpperCase(Locale.ROOT);
        }
    }
}
