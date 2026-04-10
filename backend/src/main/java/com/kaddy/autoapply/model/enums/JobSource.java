package com.kaddy.autoapply.model.enums;

public enum JobSource {

    INDEED      ("Indeed",      true),
    LINKEDIN    ("LinkedIn",    true),
    JSEARCH     ("JSearch",     true),
    ADZUNA      ("Adzuna",      true),
    SERPAPI     ("SerpAPI",     true),
    CAREERJET   ("CareerJet",   true),

    REED            ("Reed",        true),
    JOOBLE          ("Jooble",      true),
    USAJOBS         ("USA Jobs",    true),

    REMOTEOK        ("Remote OK",        false),
    REMOTIVE        ("Remotive",         false),
    ARBEITNOW       ("Arbeitnow",        false),
    JOBICY          ("Jobicy",           false),
    FINDWORK        ("FindWork",         false),
    HIMALAYAS       ("Himalayas",        false),
    THE_MUSE        ("The Muse",         false),
    WORKINGNOMADS   ("Working Nomads",   false),
    WEWORKREMOTELY  ("We Work Remotely", false),
    DEVITJOBS       ("DevITJobs",        false),
    REMOTECO        ("Remote.co",        false),
    JOBSPRESSO      ("Jobspresso",       false);

    private final String displayName;
    private final boolean requiresApiKey;

    JobSource(String displayName, boolean requiresApiKey) {
        this.displayName    = displayName;
        this.requiresApiKey = requiresApiKey;
    }

    public String displayName() { return displayName; }

    public boolean requiresApiKey() { return requiresApiKey; }

    public boolean isFreeTier() { return !requiresApiKey; }

    public static JobSource fromStringOrNull(String name) {
        if (name == null) return null;
        try {
            return valueOf(name.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
