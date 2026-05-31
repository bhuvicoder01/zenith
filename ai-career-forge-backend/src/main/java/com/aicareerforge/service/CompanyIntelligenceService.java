package com.aicareerforge.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import org.springframework.web.client.HttpClientErrorException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyIntelligenceService {
    
    public record LogoMetaData(String url, String theme, String color) {}

    private final ChatClient chatClient;
    private final RestTemplate restTemplate;

    @Value("${brandfetch.api-token}")
    private String brandfetchToken;

    @Value("${logo.dev.token}")
    private String logoDevToken;

    private final Map<String, LogoMetaData> logoCache = new ConcurrentHashMap<>();
    private LocalDateTime brandfetchCooldownUntil = LocalDateTime.MIN;

    public String fetchCultureInsights(String companyName, String role) {
        log.info("Generating culture insights for {} - {}", companyName, role);
        
        // In a real production app, we would use a Search API (like SerpApi or Google Custom Search)
        // to get real-time snippets from Glassdoor/Quora and pass them to the LLM.
        // For this implementation, we simulate the 'Agentic Search' by asking the LLM 
        // to act as a research agent that knows about these companies.
        
        String prompt = String.format("""
                SYSTEM: You are a corporate intelligence analyst. Your goal is to provide deep insights into company culture and fair pay.
                USER: Research and summarize the company culture, work-life balance, and typical salary ranges for a '%s' role at '%s'.
                Base your response on common themes found on platforms like Glassdoor, AmbitionBox, and Quora.
                
                Format your response in Markdown with these sections:
                - ### Work Culture & Environment
                - ### Work-Life Balance Rating
                - ### Salary Fairness Intelligence
                - ### Employee Sentiment (Pros & Cons)
                """, role, companyName);

        return chatClient.prompt().user(prompt).call().content();
    }

    public LogoMetaData findCompanyLogoUrl(String companyName) {
        log.info("Researching logo for company: {}", companyName);
        try {
            // Clean company name to guess domain without invoking LLM quota
            String domain = companyName.toLowerCase()
                .replaceAll("\\b(inc|ltd|corp|llc|gmbh|co|corporation|group|solutions|technologies|systems|services|wellness|software|analytics|global|partners|international|solutions|llp)\\b", "")
                .replaceAll("[^a-z0-9]", "")
                .trim();
            
            if (!domain.isEmpty()) {
                domain = domain + ".com";
            } else {
                domain = "google.com";
            }
            
            log.info("Logo Agency identified domain via heuristic: {} for company: {}", domain, companyName);
            
            // Check cache first
            if (logoCache.containsKey(domain)) {
                log.debug("Logo cache hit for domain: {}", domain);
                return logoCache.get(domain);
            }
            
            LogoMetaData result = null;

            // 1. Try Brandfetch (Primary - Highest quality & metadata)
            if (brandfetchToken != null && !brandfetchToken.isEmpty() && LocalDateTime.now().isAfter(brandfetchCooldownUntil)) {
                try {
                    String url = "https://api.brandfetch.io/v2/brands/" + domain;
                    HttpHeaders headers = new HttpHeaders();
                    headers.setBearerAuth(brandfetchToken);
                    HttpEntity<String> entity = new HttpEntity<>(headers);
                    
                    ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
                    
                    if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                        List<Map<String, Object>> logos = (List<Map<String, Object>>) response.getBody().get("logos");
                        if (logos != null && !logos.isEmpty()) {
                            Map<String, Object> bestLogo = logos.stream()
                                .filter(l -> "icon".equals(l.get("type")) || "logo".equals(l.get("type")))
                                .findFirst()
                                .orElse(logos.get(0));
                            
                            List<Map<String, Object>> formats = (List<Map<String, Object>>) bestLogo.get("formats");
                            if (formats != null && !formats.isEmpty()) {
                                String brandfetchUrl = (String) formats.get(0).get("src");
                                String theme = (String) bestLogo.get("theme");
                                
                                String accentColor = null;
                                List<Map<String, Object>> colors = (List<Map<String, Object>>) response.getBody().get("colors");
                                if (colors != null && !colors.isEmpty()) {
                                    accentColor = (String) colors.stream()
                                        .filter(c -> "accent".equals(c.get("type")))
                                        .findFirst()
                                        .map(c -> c.get("hex"))
                                        .orElse(colors.get(0).get("hex"));
                                }
                                
                                log.info("Logo Provider [Brandfetch]: Success for {}", domain);
                                result = new LogoMetaData(brandfetchUrl, theme, accentColor);
                            }
                        }
                    }
                } catch (HttpClientErrorException.TooManyRequests e) {
                    brandfetchCooldownUntil = LocalDateTime.now().plusMinutes(30);
                    log.warn("Brandfetch quota exceeded (429). Cooling down for 30 mins.");
                } catch (Exception e) {
                    log.warn("Brandfetch attempt failed for {}: {}", domain, e.getMessage());
                }
            }
            
            if (result != null) {
                logoCache.put(domain, result);
                return result;
            }

            // 2. Try logo.dev (Secondary)
            if (logoDevToken != null && !logoDevToken.isEmpty()) {
                String logoDevUrl = "https://img.logo.dev/" + domain + "?token=" + logoDevToken;
                try {
                    ResponseEntity<Void> response = restTemplate.exchange(logoDevUrl, HttpMethod.HEAD, null, Void.class);
                    if (response.getStatusCode() == HttpStatus.OK) {
                        log.info("Logo Provider [Logo.dev]: Success for {}", domain);
                        result = new LogoMetaData(logoDevUrl, null, null);
                    }
                } catch (Exception e) {
                    log.warn("Logo.dev check failed for {}: {}", domain, e.getMessage());
                }
            }

            if (result != null) {
                logoCache.put(domain, result);
                return result;
            }

            // 3. Try Clearbit (Tertiary - Reliable, no key needed for basic)
            String clearbitUrl = "https://logo.clearbit.com/" + domain;
            try {
                ResponseEntity<Void> response = restTemplate.exchange(clearbitUrl, HttpMethod.HEAD, null, Void.class);
                if (response.getStatusCode() == HttpStatus.OK) {
                    log.info("Logo Provider [Clearbit]: Success for {}", domain);
                    result = new LogoMetaData(clearbitUrl, null, null);
                }
            } catch (Exception e) {
                log.debug("Clearbit check failed for {}: {}", domain, e.getMessage());
            }

            if (result != null) {
                logoCache.put(domain, result);
                return result;
            }

            // 4. Try Google Favicon (Final fallback - always exists but lower res)
            String googleUrl = "https://www.google.com/s2/favicons?domain=" + domain + "&sz=128";
            log.info("Logo Provider [Google]: Fallback for {}", domain);
            result = new LogoMetaData(googleUrl, null, null);
            
            logoCache.put(domain, result);
            return result;

        } catch (Exception e) {
            log.error("Critical error in logo resolution for {}: {}", companyName, e.getMessage());
            return new LogoMetaData(null, null, null); 
        }
    }
}
