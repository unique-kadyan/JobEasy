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

@Component
public non-sealed class WeWorkRemotelyScraper implements JobScraper {

    private static final Logger log = LoggerFactory.getLogger(WeWorkRemotelyScraper.class);

    private static final Pattern ITEM_PATTERN =
            Pattern.compile("<item>(.*?)</item>", Pattern.DOTALL);
    private static final Pattern TITLE_PATTERN =
            Pattern.compile("<title><!\\[CDATA\\[(.*?)]]></title>", Pattern.DOTALL);
    private static final Pattern LINK_PATTERN =
            Pattern.compile("<link>(.*?)</link>", Pattern.DOTALL);
    private static final Pattern DESC_PATTERN =
            Pattern.compile("<description><!\\[CDATA\\[(.*?)]]></description>", Pattern.DOTALL);
    private static final Pattern COMPANY_PATTERN =
            Pattern.compile("<company><!\\[CDATA\\[(.*?)]]></company>", Pattern.DOTALL);
    private static final Pattern REGION_PATTERN =
            Pattern.compile("<region><!\\[CDATA\\[(.*?)]]></region>", Pattern.DOTALL);
    private static final Pattern ID_PATTERN =
            Pattern.compile("<guid[^>]*>(.*?)</guid>", Pattern.DOTALL);

    private final WebClient webClient;

    public WeWorkRemotelyScraper(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://weworkremotely.com")
                .defaultHeader("User-Agent", "KaddyAutoApply/1.0")
                .build();
    }

    @Override
    public String getSource() { return "WEWORKREMOTELY"; }

    @Override
    public List<JobResponse> fetchJobs(String query, String location, int page) {
        if (page > 0) return List.of();

        try {
            String rss = webClient.get()
                    .uri("/remote-jobs.rss")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            if (rss == null || rss.isBlank()) return List.of();

            String q = (query != null) ? query.toLowerCase() : "";
            List<JobResponse> results = new ArrayList<>();
            Matcher items = ITEM_PATTERN.matcher(rss);

            while (items.find() && results.size() < 50) {
                String item = items.group(1);

                String rawTitle = extract(TITLE_PATTERN, item);

                String[] parts = rawTitle.split(": ", 2);
                String title = parts.length > 1 ? parts[1] : rawTitle;

                if (title.contains(" at ")) {
                    title = title.substring(0, title.lastIndexOf(" at ")).strip();
                }

                String company  = extract(COMPANY_PATTERN, item);
                if (company.isBlank()) {
                    company = parts.length > 1 ? parts[0] : "";
                }
                String url         = extract(LINK_PATTERN, item);
                String description = extract(DESC_PATTERN, item);
                String region      = extract(REGION_PATTERN, item);
                String guid        = extract(ID_PATTERN, item);
                String externalId  = guid.isBlank()
                        ? String.valueOf(Math.abs(url.hashCode()))
                        : guid.replaceAll(".*/", "");

                if (!q.isBlank() &&
                    !title.toLowerCase().contains(q) &&
                    !description.toLowerCase().contains(q) &&
                    !company.toLowerCase().contains(q)) {
                    continue;
                }

                String loc = region.isBlank() ? "Worldwide" : region;
                results.add(JobResponse.unscored(
                        null, externalId, "WEWORKREMOTELY",
                        title, company, loc,
                        url, stripHtml(description), null,
                        List.of(), "Full-Time", LocalDateTime.now()
                ));
            }
            return results;
        } catch (Exception e) {
            log.error("We Work Remotely scraper error: {}", e.getMessage());
            return List.of();
        }
    }

    private String extract(Pattern p, String text) {
        Matcher m = p.matcher(text);
        return m.find() ? m.group(1).strip() : "";
    }

    private String stripHtml(String html) {
        return html.replaceAll("<[^>]+>", " ")
                   .replaceAll("\\s{2,}", " ")
                   .strip();
    }
}
