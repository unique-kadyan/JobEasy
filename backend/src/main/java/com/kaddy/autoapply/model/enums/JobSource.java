package com.kaddy.autoapply.model.enums;

/**
 * Identifies the origin job-board or API for a scraped listing.
 *
 * <p>Each constant carries metadata used by the orchestration layer to
 * decide display ordering, API key checks, and analytics grouping.
 */
public enum JobSource {

    // ── API-key required ──────────────────────────────────────────────────────
    INDEED      ("Indeed",      true),
    LINKEDIN    ("LinkedIn",    true),
    JSEARCH     ("JSearch",     true),
    ADZUNA      ("Adzuna",      true),
    SERPAPI     ("SerpAPI",     true),
    CAREERJET   ("CareerJet",   true),

    // ── Free public API ───────────────────────────────────────────────────────
    REMOTEOK    ("Remote OK",   false),
    REMOTIVE    ("Remotive",    false),
    ARBEITNOW   ("Arbeitnow",   false),
    JOBICY      ("Jobicy",      false),
    FINDWORK    ("FindWork",    false);

    private final String displayName;
    private final boolean requiresApiKey;

    JobSource(String displayName, boolean requiresApiKey) {
        this.displayName    = displayName;
        this.requiresApiKey = requiresApiKey;
    }

    /** Human-readable board name for UI display. */
    public String displayName() { return displayName; }

    /** {@code true} when an API key must be configured for this source to return results. */
    public boolean requiresApiKey() { return requiresApiKey; }

    /** {@code true} for sources that expose a free, unauthenticated public API. */
    public boolean isFreeTier() { return !requiresApiKey; }

    /**
     * Looks up a {@link JobSource} from a case-insensitive string, returning
     * {@code null} for unknown values rather than throwing an exception.
     * Useful when parsing scraped response data of uncertain origin.
     */
    public static JobSource fromStringOrNull(String name) {
        if (name == null) return null;
        try {
            return valueOf(name.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
