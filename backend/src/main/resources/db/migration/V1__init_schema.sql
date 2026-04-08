-- Users
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255),
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    location        VARCHAR(255),
    title           VARCHAR(255),
    summary         TEXT,
    skills          JSONB DEFAULT '{}',
    auth_provider   VARCHAR(20) DEFAULT 'LOCAL',
    oauth_id        VARCHAR(255),
    avatar_url      VARCHAR(512),
    preferences     JSONB DEFAULT '{}',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Resumes
CREATE TABLE resumes (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename        VARCHAR(255) NOT NULL,
    file_path       VARCHAR(512) NOT NULL,
    file_size       INTEGER,
    content_type    VARCHAR(100),
    parsed_text     TEXT,
    parsed_data     JSONB,
    is_primary      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_resumes_user ON resumes(user_id);

-- Jobs
CREATE TABLE jobs (
    id              BIGSERIAL PRIMARY KEY,
    external_id     VARCHAR(255),
    source          VARCHAR(50) NOT NULL,
    title           VARCHAR(500) NOT NULL,
    company         VARCHAR(255),
    location        VARCHAR(255),
    url             VARCHAR(1024) NOT NULL,
    description     TEXT,
    salary          VARCHAR(255),
    tags            JSONB DEFAULT '[]',
    job_type        VARCHAR(50),
    date_posted     TIMESTAMP,
    scraped_at      TIMESTAMP DEFAULT NOW(),
    expires_at      TIMESTAMP,
    UNIQUE(source, external_id)
);
CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_scraped ON jobs(scraped_at);
CREATE INDEX idx_jobs_search ON jobs USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Cover Letter Templates
CREATE TABLE templates (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    description     VARCHAR(500),
    is_system       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Cover Letters
CREATE TABLE cover_letters (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id          BIGINT REFERENCES jobs(id) ON DELETE SET NULL,
    template_id     BIGINT REFERENCES templates(id) ON DELETE SET NULL,
    content         TEXT NOT NULL,
    ai_provider     VARCHAR(50),
    ai_model        VARCHAR(100),
    prompt_used     TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_cover_letters_user ON cover_letters(user_id);
CREATE INDEX idx_cover_letters_job ON cover_letters(job_id);

-- Applications
CREATE TABLE applications (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id          BIGINT NOT NULL REFERENCES jobs(id),
    cover_letter_id BIGINT REFERENCES cover_letters(id) ON DELETE SET NULL,
    resume_id       BIGINT REFERENCES resumes(id) ON DELETE SET NULL,
    status          VARCHAR(50) DEFAULT 'APPLIED',
    match_score     DECIMAL(4,3),
    notes           TEXT,
    applied_at      TIMESTAMP DEFAULT NOW(),
    status_updated  TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, job_id)
);
CREATE INDEX idx_applications_user ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(user_id, status);

-- Application Status History
CREATE TABLE application_status_history (
    id              BIGSERIAL PRIMARY KEY,
    application_id  BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    old_status      VARCHAR(50),
    new_status      VARCHAR(50) NOT NULL,
    notes           TEXT,
    changed_at      TIMESTAMP DEFAULT NOW()
);
