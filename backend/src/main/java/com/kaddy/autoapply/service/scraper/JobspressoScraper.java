package com.kaddy.autoapply.service.scraper;

import com.kaddy.autoapply.dto.response.JobResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Scrapes curated remote jobs from Jobspresso's public RSS feed (no key required).
 * Feed: https://jobspresso.co/feed/
 * Hand-curated remote positions in tech, marketing, support, and design.
 */
@Component
public non-sealed class JobspressoScraper implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(JobspressoScraper.class);

    private static final Pattern ITEM_PATTERN =
            Pattern.compile("<item>(.*?)</item>", Pattern.DOTALL);
    private static final Pattern TITLE_PATTERN =
            Pattern.compile("<title>(?:<!\\[CDATA\\[)?(.*?)(?:]]>)?</title>", Pattern.DOTALL);
    private static final Pattern LINK_PATTERN =
            Pattern.compile("<link>(.*?)</link>", Pattern.DOTALL);
    private static final Pattern DESC_PATTERN =
            Pattern.compile("<description>(?:<!\\[CDATA\\[)?(.*?)(?:]]>)?</description>",
                    Pattern.DOTALL);
    private static final Pattern CREATOR_PATTERN =
            Pattern.compile("<dc:creator>(?:<!\\[CDATA\\[)?(.*?)(?:]]>)?</dc:creator>",
                    Pattern.DOTALL);
    private static final Pattern GUID_PATTERN =
            Pattern.compile("<guid[^>]*>(.*?)</guid>", Pattern.DOTALL);
    private static final Pattern CATEGORY_PATTERN =
            Pattern.compile("<category>(?:<!\\[CDATA\\[)?(.*?)(?:]]>)?</category>",
                    Pattern.DOTALL);

    private final WebClient webClient;

    public JobspressoScraper(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://jobspresso.co")
                .defaultHeader("User-Agent", "KaddyAutoApply/1.0")
                .build();
    }

    @Override
    public String getSource() { return "JOBSPRESSO"; }

    @Override
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        if (page > 0) return List.of(); // RSS has no pagination

        try {
            String rss = webClient.get()
                    .uri("/feed/")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            if (rss == null || rss.isBlank()) return List.of();

            String q = (query != null) ? query.toLowerCase() : "";
            List<JobResponse> results = new ArrayList<>();
            Matcher items = ITEM_PATTERN.matcher(rss);

            while (items.find() && results.size() < 50) {
                String item = items.group(1);

                String title = extract(TITLE_PATTERN, item);
                String url = extract(LINK_PATTERN, item);
                String description = stripHtml(extract(DESC_PATTERN, item));
                String company = extract(CREATOR_PATTERN, item);
                String guid = extract(GUID_PATTERN, item);
                String externalId = guid.isBlank()
                        ? String.valueOf(Math.abs(url.hashCode()))
                        : guid.replaceAll(".*/", "");

                // Collect all category tags
                List<String> tags = new ArrayList<>();
                Matcher cats = CATEGORY_PATTERN.matcher(item);
                while (cats.find()) tags.add(cats.group(1).strip());

                if (!q.isBlank() &&
                    !title.toLowerCase().contains(q) &&
                    !description.toLowerCase().contains(q) &&
                    !tags.stream().anyMatch(t -> t.toLowerCase().contains(q))) {
                    continue;
                }

                results.add(JobResponse.unscored(
                        null, externalId, "JOBSPRESSO",
                        title, company, "Remote",
                        url, description, null,
                        tags, "Full-Time", LocalDateTime.now()
                ));
            }
            return results;
        } catch (Exception e) {
            log.error("Jobspresso scraper error: {}", e.getMessage());
            return List.of();
        }
    }

    private String extract(Pattern p, String text) {
        Matcher m = p.matcher(text);
        return m.find() ? m.group(1).strip() : "";
    }

    private String stripHtml(String html) {
        return html.replaceAll("<[^>]+>", " ").replaceAll("\\s{2,}", " ").strip();
    }
}
