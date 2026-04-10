<div align="center">

# Kaddy Auto-Apply

### AI-Powered Automated Job Application Platform

_Aggregate. Personalise. Apply. Track — all in one place._

[![CI — Build & Test](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/ci.yml/badge.svg)](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/ci.yml)
[![CodeQL](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/codeql.yml/badge.svg)](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/codeql.yml)
[![Security Scan](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/security.yml/badge.svg)](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/security.yml)
[![Code Quality](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/code-quality.yml/badge.svg)](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/code-quality.yml)
[![Java](https://img.shields.io/badge/Java-25_LTS-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/projects/jdk/25/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.0.3-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](#license)

**Live:** [kaddy-frontend.onrender.com](https://kaddy-frontend.onrender.com)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Infrastructure Setup](#infrastructure-setup)
  - [Environment Configuration](#environment-configuration)
  - [Running Locally](#running-locally)
  - [Running with Load Balancer](#running-with-load-balancer)
- [Testing](#testing)
- [API Reference](#api-reference)
- [AI Provider Configuration](#ai-provider-configuration)
- [Security Posture](#security-posture)
- [CI/CD & Quality Gates](#cicd--quality-gates)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

**Kaddy Auto-Apply** is a production-grade, full-stack platform that automates the end-to-end job application workflow. It aggregates live job listings from multiple major boards, generates AI-powered search keywords from user profiles, creates personalised cover letters using large language models, submits applications on behalf of the user, and provides real-time analytics on application progress — all secured behind enterprise-grade authentication and rate-limiting infrastructure.

The platform is horizontally scalable: the backend runs on Java 25 virtual threads, uses circuit breakers and retry policies for AI provider failover, and supports multi-instance deployment behind an Nginx load balancer with Redis-backed shared state for token revocation, rate limiting, and session management.

---

## Key Features

| Domain                        | Capabilities                                                                                                                                                                                                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication & Identity** | Stateless JWT (access + refresh tokens), Google/LinkedIn OAuth2, email verification, password reset, per-token blacklisting on logout, per-user session revocation                                                                                                                                  |
| **Onboarding Flow**           | 3-step wizard (Upload Resume → Set Goals → All Set!); completes locally even when the backend is temporarily unreachable, preventing redirect loops                                                                                                                                                 |
| **Welcome Animation**         | Falling-petal welcome screen on login ("Welcome Back, [Name]!") and signup ("Welcome to Kaddy, [Name]!") — prefetches dashboard data in background so the portal is populated when the animation ends                                                                                               |
| **Resume Management**         | PDF upload with magic-byte validation, Apache PDFBox text extraction, structured JSON parsed data schema (contact, experience, education, skills by category, projects, certifications), ATS score analysis, AI-powered resume generation with Razorpay payment gate; upload count enforced by tier |
| **AI Keyword Generation**     | `SearchKeywordGeneratorService` crafts an LLM-generated query from skills, target roles, title, and experience when the search field is empty; the generated query is returned in the response for user refinement                                                                                  |
| **Job Search & Aggregation**  | Multi-source parallel scraping (JSearch, SerpAPI, Adzuna, CareerJet, Arbeitnow, RemoteOK, and more), full-text search, salary and recency filters, 1-hour MongoDB TTL cache; result count enforced by tier                                                                                          |
| **AI Cover Letters**          | 10-provider LLM cascade with automatic failover and Resilience4j circuit breakers, custom and system templates, inline editing, per-user provider preference; daily generation count enforced by tier                                                                                               |
| **Career Path Analysis**      | AI-powered career progression analysis (Gold+ only): suggests 3–5 realistic next roles based on resume, skills, experience, and projects; provides per-role checkpoints, mandatory skills, and estimated timelines powered by the reasoning model cascade                                           |
| **Application Tracking**      | One-click and bulk apply (capped at 100), full status lifecycle (Saved → Applied → Interviewing → Offered / Rejected / Withdrawn), status history audit trail                                                                                                                                       |
| **Auto Search Scheduler**     | Background scheduled job search using user profile, configurable interval (1–24 h), AI-driven query generation, scored and filtered results stored automatically (Platinum)                                                                                                                         |
| **Stale Job Pruning**         | Weekly scheduled pruner checks job URLs (HEAD request, 20 concurrent), removes listings returning 404/410, exposes a Spring Boot `HealthIndicator`                                                                                                                                                  |
| **Analytics & Reporting**     | Application funnel metrics, weekly activity timeline, breakdown by job board source and status, response rate calculation                                                                                                                                                                           |
| **Payments**                  | Razorpay integration for premium resume generation; HMAC-SHA256 signature verification; dev-mode mock orders when keys are blank                                                                                                                                                                    |
| **Rate Limiting**             | Redis-backed per-user limits (authenticated) + Nginx per-IP zones (unauthenticated); applied to search, AI cover letters, resume upload, smart resume, bulk apply, and career path endpoints; limits scale with subscription tier                                                                   |
| **Load Balancing**            | Nginx reverse proxy with `least_conn` upstream, per-endpoint rate limit zones, gzip, security headers, Docker Compose horizontal scaling (`--scale api=N`)                                                                                                                                          |
| **Security & Compliance**     | OWASP-aligned HTTP security headers (CSP, HSTS, X-Frame-Options), AOP audit logging, prompt injection sanitisation, OWASP Dependency Check, Trivy secret scanning; all secrets in environment variables — never committed                                                                           |

---

## Subscription Tiers

All platform capabilities are gated by subscription tier. Every limit is enforced on both the backend (service layer) and the frontend (UI gates). No backend bypass is possible.

| Capability              | Free | Gold | Platinum  |
| ----------------------- | ---- | ---- | --------- |
| Job results per search  | 2    | 10   | Unlimited |
| Cover letters per day   | 3    | 25   | Unlimited |
| Resumes stored          | 2    | 10   | Unlimited |
| Smart resume generation | —    | ✓    | ✓         |
| Priority job scoring    | —    | ✓    | ✓         |
| Career path analysis    | —    | ✓    | ✓         |
| Auto-apply              | —    | —    | ✓         |
| Scheduled auto-search   | —    | —    | ✓         |
| Rate limit (req/min)    | 10   | 30   | 60        |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Browser / Mobile Client                             │
│                Next.js 14 · TypeScript · Tailwind CSS                       │
│           Zustand (auth + onboarding state) · TanStack Query                │
│                Next.js Edge Middleware (route protection)                   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │  HTTPS · REST/JSON
                                   │  Authorization: Bearer <JWT>
                         ┌─────────▼─────────┐
                         │      Nginx 1.27    │  ← rate limiting, gzip,
                         │  (load balancer)   │    security headers
                         │   least_conn       │
                         └──┬──────┬──────┬───┘
                            │      │      │   ←  --scale api=N
                ┌───────────▼┐  ┌──▼───┐ ┌▼──────────┐
                │  api (1)   │  │api(2)│ │  api (N)  │   Spring Boot 4.0.3 · Java 25
                └─────┬──────┘  └──┬───┘ └─────┬─────┘   Virtual Threads · ZGC
                      └────────────┴────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
   ┌──────────▼──────────┐               ┌─────────────▼───────────┐
   │      MongoDB 7       │               │         Redis 7          │
   │  (primary datastore) │               │  Token blacklist · Cache │
   │  Documents · TTL idx │               │  AOF + RDB persistence   │
   └─────────────────────┘               └─────────────────────────┘
```

### Design Decisions

| Concern                 | Decision                                                                | Rationale                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Concurrency**         | Java 25 virtual threads (`spring.threads.virtual.enabled=true`)         | Eliminates thread-pool exhaustion under high I/O concurrency from AI and scraper calls                                                                            |
| **GC**                  | Generational ZGC (`-XX:+UseZGC -XX:+ZGenerational`) on Ubuntu/glibc     | Sub-millisecond pauses under load; glibc (Ubuntu Jammy) is required — Alpine (musl libc) is incompatible with ZGC                                                 |
| **AI Resilience**       | Resilience4j circuit breaker + retry per provider, 10 providers total   | Prevents cascading failures; free providers are tried first, premium providers escalate automatically                                                             |
| **AI Search Keywords**  | `SearchKeywordGeneratorService` with graceful fallback                  | When a user has no explicit query, LLM generates a professional targeted query from their profile; falls back to `targetRoles[0]` or `title` if AI is unavailable |
| **Onboarding State**    | `onboardingCompleted` set locally before navigation                     | Prevents infinite redirect loops if the backend is temporarily unreachable during the final onboarding step                                                       |
| **Rate Limiting**       | Redis per-user limits + Nginx per-IP zones                              | O(1) token-bucket per authenticated user; anonymous requests skip user-scoped rate limiting to avoid Redis lookups on public endpoints                            |
| **Token Revocation**    | Redis blacklist with matching TTL + per-user revocation marker          | O(1) logout invalidation; password reset revokes all sessions globally                                                                                            |
| **Horizontal Scaling**  | Stateless JWT + Redis shared state + shared upload volume               | Any instance validates any token; rate limits and session state are global across replicas                                                                        |
| **Circular Dependency** | `ApplicationEventPublisher` for `AutoApplyService ↔ CoverLetterService` | Eliminates `@Lazy` setter injection; decouples services through domain events                                                                                     |

---

## Tech Stack

### Backend

| Layer                 | Technology                                                                         | Version    |
| --------------------- | ---------------------------------------------------------------------------------- | ---------- |
| Language & Runtime    | Java 25 LTS (Eclipse Temurin)                                                      | 25 LTS     |
| Framework             | Spring Boot                                                                        | 4.0.3      |
| Primary Database      | MongoDB (Spring Data MongoDB)                                                      | 7          |
| Cache & Session Store | Redis 7 (Lettuce client)                                                           | 7          |
| Security              | Spring Security, JJWT, OAuth2 Client                                               | —          |
| HTTP Client           | Spring WebFlux (WebClient)                                                         | —          |
| AI Providers          | Claude, OpenAI, Gemini, Groq, Mistral, Cerebras, Together AI, Novita AI, SambaNova | —          |
| Job Board APIs        | JSearch (RapidAPI), SerpAPI, Adzuna, CareerJet, Arbeitnow, RemoteOK, and more      | —          |
| Resilience            | Resilience4j (circuit breaker, retry)                                              | 2.4.0      |
| Rate Limiting         | Bucket4j + Caffeine                                                                | 8.10.1     |
| PDF Processing        | Apache PDFBox                                                                      | 3.0.7      |
| HTML Sanitisation     | OWASP Java HTML Sanitizer                                                          | 20260313.1 |
| Payments              | Razorpay                                                                           | —          |
| API Documentation     | SpringDoc OpenAPI (Swagger UI)                                                     | 3.0.2      |
| Monitoring            | Spring Boot Actuator + Micrometer / Prometheus                                     | —          |
| Build Tool            | Apache Maven (via wrapper)                                                         | 3.9.11     |

### Frontend

| Layer              | Technology                              | Version |
| ------------------ | --------------------------------------- | ------- |
| Framework          | Next.js (App Router)                    | 16      |
| Language           | TypeScript                              | 6       |
| Styling            | Tailwind CSS                            | 4       |
| Server State       | TanStack React Query                    | 5       |
| Client State       | Zustand (with localStorage persistence) | 5       |
| Forms & Validation | React Hook Form + Zod                   | —       |
| Charts             | Recharts                                | —       |
| HTTP Client        | Axios (with JWT interceptors)           | —       |
| Icons              | Lucide React                            | —       |

### Infrastructure & Tooling

| Concern                     | Tool                                                           |
| --------------------------- | -------------------------------------------------------------- |
| Containerisation            | Docker + Docker Compose                                        |
| Docker Base Image           | Eclipse Temurin 25 JRE (Ubuntu Jammy — glibc required for ZGC) |
| Load Balancing              | Nginx 1.27 (least_conn, per-endpoint rate limiting, gzip)      |
| CI/CD                       | GitHub Actions                                                 |
| Static Security Analysis    | CodeQL (`security-extended` queries)                           |
| Dependency Vulnerability    | OWASP Dependency Check (CVSSv3 ≥ 7 fails build), npm audit     |
| Container / Secret Scanning | Trivy                                                          |
| Code Quality                | SpotBugs (max effort, medium threshold), PMD                   |
| PR Dependency Review        | GitHub Dependency Review Action                                |

---

## Project Structure

```
auto_apply_with_kaddy/
│
├── backend/
│   ├── Dockerfile                        # Multi-stage: Temurin 25 JDK build → JRE runtime (jammy)
│   ├── pom.xml                           # Spring Boot 3.5, Java 25, Maven 3.9.11
│   └── src/
│       ├── main/java/com/kaddy/autoapply/
│       │   ├── config/
│       │   │   ├── AiConfig.java         # AiTextGenerator @Bean (wraps AiProviderFactory)
│       │   │   ├── AsyncConfig.java      # Virtual thread executor
│       │   │   ├── FeatureConfig.java    # Subscription tier feature gates
│       │   │   ├── JacksonConfig.java
│       │   │   ├── MongoConfig.java
│       │   │   ├── RateLimitInterceptor.java  # Per-user Redis rate limiting (skips anonymous)
│       │   │   ├── RedisConfig.java      # Lettuce pool, REDIS_URL programmatic config
│       │   │   ├── SecurityConfig.java   # JWT filter chain, CORS, ForwardedHeaderFilter
│       │   │   ├── TemplateSeeder.java
│       │   │   ├── WebClientConfig.java
│       │   │   ├── WebMvcConfig.java
│       │   │   └── security/            # RateLimitFilter, InputSanitizer, SecurityHeadersFilter
│       │   ├── controller/              # Auth, User, Job, Resume, CoverLetter,
│       │   │                            # Application, Analytics, Payment, Template,
│       │   │                            # SmartResume, AutoApply, Health, Subscription
│       │   ├── dto/
│       │   │   ├── request/             # SignupRequest, LoginRequest, ProfileUpdateRequest, …
│       │   │   └── response/            # AuthResponse, UserResponse, JobResponse,
│       │   │                            # PagedResponse<T> (includes generatedQuery field)
│       │   ├── exception/               # GlobalExceptionHandler, AppException hierarchy
│       │   ├── model/                   # MongoDB documents: User, Application, Job,
│       │   │   ├── enums/               # Role, ApplicationStatus, JobSource, SubscriptionTier
│       │   │   └── event/               # AutoApplyJobQueuedEvent
│       │   ├── repository/              # 14 Spring Data MongoDB repositories
│       │   ├── security/                # JwtTokenProvider, JwtAuthenticationFilter, SecurityUtils
│       │   └── service/
│       │       ├── ai/                  # AiProvider (interface) + 10 implementations
│       │       │                        # AiProviderFactory (free → premium cascade)
│       │       │                        # AiTextGenerator (functional interface)
│       │       ├── scraper/             # ScraperOrchestrator + API clients for 10+ job boards
│       │       └── *.java               # AuthService, UserService, JobService,
│       │                                # SearchKeywordGeneratorService, ApplicationService,
│       │                                # CoverLetterService, ResumeService, AnalyticsService,
│       │                                # PaymentService, TemplateService, TokenBlacklistService,
│       │                                # JobScoringService, StaleJobPrunerService,
│       │                                # AutoSearchSchedulerService, AutoApplyService,
│       │                                # CareerPathService, ResumeParserService (structured JSON)
│       └── test/
│           ├── java/com/kaddy/autoapply/
│           │   ├── AutoApplyApplicationTest.java   # Full context (CI-only, requires MongoDB + Redis)
│           │   ├── config/security/                # InputSanitizerTest, RateLimitFilterTest
│           │   ├── controller/                     # AuthControllerTest
│           │   ├── exception/                      # ExceptionHierarchyTest, GlobalExceptionHandlerTest
│           │   ├── security/                       # JwtTokenProviderTest
│           │   └── service/                        # AiProviderFactoryTest, AnalyticsServiceTest,
│           │                                       # ApplicationServiceTest, AuthServiceTest,
│           │                                       # JobServiceTest, PaymentServiceTest,
│           │                                       # ResumeAnalysisServiceTest, ResumeParserServiceTest,
│           │                                       # TemplateServiceTest, UserServiceTest
│           └── resources/
│               └── application-test.yml
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (auth)/                  # /login · /signup · /forgot-password
│       │   │                            # /reset-password · /verify-email
│       │   ├── (dashboard)/             # /dashboard · /jobs · /applications · /resumes
│       │   │   └── layout.tsx           # Auth guard + onboarding redirect (router.replace)
│       │   │                            # /cover-letters · /profile · /settings · /smart-resume
│       │   └── onboarding/              # 3-step wizard; local-first completion to prevent loops
│       ├── components/
│       │   ├── ui/                      # Button, Input, Card, Modal, Badge, Select
│       │   ├── layout/                  # Navbar, WarmUpBanner (Render cold-start indicator)
│       │   └── …/                       # Feature-specific components
│       ├── hooks/                       # useJobs (aiSearchEnabled param), useApplications,
│       │                                # useResumes, useCoverLetters, useKeepAlive
│       ├── lib/
│       │   ├── api.ts                   # Axios client with JWT interceptors
│       │   └── tier-features.ts         # Subscription tier feature gates
│       ├── proxy.ts                     # Edge middleware (session-based route protection)
│       ├── store/
│       │   ├── auth-store.ts            # Zustand persist store (user, tokens, tier helpers)
│       │   └── theme-store.ts
│       └── types/
│           └── index.ts                 # TypeScript interfaces (PagedResponse with generatedQuery)
│
├── nginx/
│   ├── nginx.conf                       # Worker tuning, gzip, proxy defaults
│   └── conf.d/
│       └── default.conf                 # Rate limit zones, upstream, location blocks
│
├── redis/
│   └── redis.conf                       # AOF + RDB dual-layer persistence
│
├── docker-compose.yml                   # MongoDB 7 + Redis 7 with named volumes
├── docker-compose.lb.yml                # api + Nginx services for horizontal scaling
├── render.yaml                          # Render Blueprint (Redis + backend + frontend)
│
└── .github/workflows/
    ├── ci.yml                           # Build & test (Java 25 from .java-version, MongoDB + Redis services)
    ├── codeql.yml                       # Static security analysis
    ├── security.yml                     # OWASP, Trivy, npm audit, dependency review
    ├── code-quality.yml                 # SpotBugs + PMD
    └── keep-alive.yml                   # Pings Render services to prevent free-tier sleep
```

---

## Getting Started

### Prerequisites

| Requirement    | Minimum Version | Notes                                                |
| -------------- | --------------- | ---------------------------------------------------- |
| Java (JDK)     | **25 LTS**      | [Eclipse Temurin](https://adoptium.net/) recommended |
| Apache Maven   | 3.9             | Or use `./mvnw` (wrapper included)                   |
| Node.js        | 20 LTS          | `node --version` to verify                           |
| npm            | 10              | Included with Node 20                                |
| Docker Desktop | Latest          | Required for MongoDB and Redis                       |
| Docker Compose | v2              | Bundled with Docker Desktop                          |

> **Java version note:** The project targets Java 25 bytecode. Spring Boot 4.0.3 (Spring Framework 7 / ASM 9.7) is required for class-file compatibility. Java 21 LTS is the minimum runtime if you cannot install Java 25.

---

### Infrastructure Setup

```bash
# Start MongoDB 7 and Redis 7
docker compose up -d

# Verify both services are healthy
docker compose ps
```

> **Redis authentication** — set `REDIS_PASSWORD` in a `.env` file at the project root before starting if you want password protection. Pass the same value to the backend via the `REDIS_PASSWORD` environment variable.

---

### Environment Configuration

#### Backend

The backend reads all secrets from environment variables. For local development, export them in your shell or use a `.env` file loaded by your IDE / shell profile.

**Minimum required variables:**

```bash
# Database
export MONGODB_URI=mongodb://localhost:27017/kaddy_dev
export JWT_SECRET=$(openssl rand -base64 64)

# At least one AI provider (free tier — no payment needed)
export GROQ_API_KEY=your_groq_key           # groq.com — free
export CEREBRAS_API_KEY=your_cerebras_key   # cerebras.ai — free
```

**Optional variables:**

```bash
# Email
export RESEND_API_KEY=your_key
export BREVO_API_KEY=your_key

# Premium AI providers
export OPENAI_API_KEY=your_key
export ANTHROPIC_API_KEY=your_key
export GEMINI_API_KEY=your_key

# Job board scrapers
export JSEARCH_API_KEY=your_key    # rapidapi.com/jsearch
export SERPAPI_KEY=your_key

# Payments (Razorpay — dev mode works without keys)
export RAZORPAY_KEY_ID=your_id
export RAZORPAY_KEY_SECRET=your_secret

# OAuth2
export GOOGLE_CLIENT_ID=your_id
export GOOGLE_CLIENT_SECRET=your_secret
```

> **Payment dev mode:** When `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are blank, `PaymentService` returns a mock `order_dev_*` order ID and skips signature verification. Production keys are only needed for real transactions.

#### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

---

### Running Locally

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Start backend (local profile enables host/port Redis config)
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# 3. Start frontend (separate terminal)
cd frontend
npm install
npm run dev
```

| Service            | URL                                       |
| ------------------ | ----------------------------------------- |
| Frontend           | http://localhost:3000                     |
| Backend API        | http://localhost:8080/api                 |
| Swagger UI         | http://localhost:8080/swagger-ui.html     |
| Actuator health    | http://localhost:8080/actuator/health     |
| Prometheus metrics | http://localhost:8080/actuator/prometheus |

---

### Running with Load Balancer

```bash
# Start MongoDB + Redis
docker compose up -d

# Start Nginx + 3 Spring Boot instances
docker compose -f docker-compose.yml -f docker-compose.lb.yml up --scale api=3 -d

# Scale at runtime without downtime
docker compose -f docker-compose.yml -f docker-compose.lb.yml up --scale api=5 -d --no-recreate
```

The load balancer is available at **http://localhost:80**. All instances share Redis state so any instance can handle any request.

---

## Testing

```bash
cd backend

# Run all unit + web layer tests (no infra required)
JAVA_HOME=/path/to/jdk-25 ./mvnw test

# Run with MongoDB + Redis running (enables AutoApplyApplicationTest)
CI=true MONGODB_URI=mongodb://localhost:27017/kaddy_test ./mvnw test
```

**Test suite summary (123 tests):**

| Suite                        | Tests | Notes                                                                                |
| ---------------------------- | ----- | ------------------------------------------------------------------------------------ |
| `AutoApplyApplicationTest`   | 1     | Full Spring context; skipped locally, runs in CI where MongoDB + Redis are available |
| `AiProviderFactoryTest`      | 11    | Free → premium cascade, preferred provider, unavailable provider handling            |
| `AuthControllerTest`         | 6     | Signup, login, validation, protected endpoints                                       |
| `GlobalExceptionHandlerTest` | 13    | All exception types mapped to correct HTTP status codes                              |
| `ApplicationServiceTest`     | 12    | Apply, bulk apply, status transitions, ownership checks                              |
| `PaymentServiceTest`         | 12    | Order creation, signature verification, dev mode mock orders                         |
| `ResumeAnalysisServiceTest`  | 12    | ATS scoring, AI analysis                                                             |
| `JobServiceTest`             | 9     | DB + fallback pagination, source filtering, caching                                  |
| `AuthServiceTest`            | 6     | Signup, login, refresh, password reset                                               |
| `RateLimitFilterTest`        | 10    | Per-IP and per-user rate limiting                                                    |
| Others                       | 30    | JWT, exception hierarchy, resume parsing, templates, users                           |

> `AutoApplyApplicationTest` is annotated with `@EnabledIfEnvironmentVariable(named = "CI", matches = "true")` and only runs in GitHub Actions where MongoDB and Redis are provisioned as service containers.

---

## API Reference

### Authentication

| Method | Endpoint                    | Auth          | Description                                 |
| ------ | --------------------------- | ------------- | ------------------------------------------- |
| `POST` | `/api/auth/signup`          | —             | Register and receive JWT tokens             |
| `POST` | `/api/auth/login`           | —             | Login and receive JWT tokens                |
| `POST` | `/api/auth/refresh`         | Refresh token | Exchange refresh token for new access token |
| `POST` | `/api/auth/logout`          | Bearer        | Blacklist current tokens                    |
| `POST` | `/api/auth/forgot-password` | —             | Send password reset email                   |
| `POST` | `/api/auth/reset-password`  | —             | Apply new password with reset token         |

### Jobs

| Method | Endpoint                   | Auth     | Description                                                                                |
| ------ | -------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `GET`  | `/api/jobs/search`         | Optional | Search jobs; `query` is optional — omit to trigger AI keyword generation from user profile |
| `GET`  | `/api/jobs/{id}`           | Optional | Get job details                                                                            |
| `GET`  | `/api/jobs/{id}/summarize` | Bearer   | AI-generated job summary (Gold+ tier)                                                      |
| `GET`  | `/api/jobs/{id}/match`     | Bearer   | Personalised match score for authenticated user                                            |
| `GET`  | `/api/jobs/source-counts`  | Optional | Job count by source board                                                                  |

**Job search query parameters:**

| Parameter    | Type     | Default | Description                                                                       |
| ------------ | -------- | ------- | --------------------------------------------------------------------------------- |
| `query`      | `string` | `""`    | Search terms; if empty and user is authenticated, AI generates query from profile |
| `location`   | `string` | —       | Location filter                                                                   |
| `source`     | `string` | —       | Filter by board (`INDEED`, `LINKEDIN`, etc.)                                      |
| `page`       | `int`    | `0`     | Zero-based page number                                                            |
| `size`       | `int`    | `30`    | Results per page                                                                  |
| `minSalary`  | `long`   | —       | Minimum normalised salary (USD)                                                   |
| `maxSalary`  | `long`   | —       | Maximum normalised salary (USD)                                                   |
| `maxAgeDays` | `int`    | `30`    | Only return jobs posted within N days                                             |

**Response includes `generatedQuery`** when AI keyword generation was used:

```json
{
  "content": [...],
  "totalElements": 84,
  "totalPages": 3,
  "number": 0,
  "size": 30,
  "generatedQuery": "senior backend engineer Java Spring Boot remote"
}
```

### Resumes & Profile

| Method   | Endpoint              | Auth   | Description                              |
| -------- | --------------------- | ------ | ---------------------------------------- |
| `GET`    | `/api/users/profile`  | Bearer | Get authenticated user profile           |
| `PUT`    | `/api/users/profile`  | Bearer | Update profile, skills, and target roles |
| `POST`   | `/api/resumes/upload` | Bearer | Upload PDF/DOC/DOCX resume               |
| `GET`    | `/api/resumes`        | Bearer | List uploaded resumes                    |
| `DELETE` | `/api/resumes/{id}`   | Bearer | Delete a resume                          |

### Applications

| Method | Endpoint                        | Auth   | Description                      |
| ------ | ------------------------------- | ------ | -------------------------------- |
| `POST` | `/api/applications`             | Bearer | Apply to a single job            |
| `POST` | `/api/applications/bulk-apply`  | Bearer | Apply to multiple jobs (max 100) |
| `GET`  | `/api/applications`             | Bearer | List applications with filters   |
| `PUT`  | `/api/applications/{id}/status` | Bearer | Update application status        |

### Cover Letters & Templates

| Method | Endpoint                      | Auth   | Description                        |
| ------ | ----------------------------- | ------ | ---------------------------------- |
| `POST` | `/api/cover-letters/generate` | Bearer | Generate AI cover letter for a job |
| `GET`  | `/api/cover-letters`          | Bearer | List user's cover letters          |
| `GET`  | `/api/templates`              | Bearer | List system + user templates       |
| `POST` | `/api/templates`              | Bearer | Create a custom template           |

### Career Path

| Method | Endpoint                   | Auth   | Tier  | Description                                                                            |
| ------ | -------------------------- | ------ | ----- | -------------------------------------------------------------------------------------- |
| `GET`  | `/api/career-path/analyze` | Bearer | Gold+ | AI career path analysis: current level, suggested roles, checkpoints, mandatory skills |

**Response:**

```json
{
  "currentLevel": "MID",
  "suggestedRoles": ["Senior Backend Engineer", "Tech Lead", "Staff Engineer"],
  "careerPaths": {
    "Senior Backend Engineer": {
      "estimatedYears": 2,
      "description": "Lead complex backend systems with ownership of critical services",
      "mandatorySkills": ["System Design", "Java", "Distributed Systems"],
      "checkpoints": [
        {
          "milestone": "Own a production service end-to-end",
          "description": "Design, build, and operate a critical service with full ownership",
          "skills": ["System Design", "Observability"],
          "timelineMonths": 6
        }
      ]
    }
  }
}
```

### Analytics

| Method | Endpoint                   | Auth   | Description                     |
| ------ | -------------------------- | ------ | ------------------------------- |
| `GET`  | `/api/analytics/summary`   | Bearer | Application funnel metrics      |
| `GET`  | `/api/analytics/timeline`  | Bearer | Weekly application activity     |
| `GET`  | `/api/analytics/by-source` | Bearer | Breakdown by job board          |
| `GET`  | `/api/analytics/by-status` | Bearer | Breakdown by application status |

---

## AI Provider Configuration

The platform uses a **free → premium cascade** with automatic failover. Providers are tried in order; the first successful response is returned.

**Default order:**

| Tier    | Order                                                        |
| ------- | ------------------------------------------------------------ |
| Free    | Cerebras → Groq → Together AI → Mistral → SambaNova → Novita |
| Premium | Gemini → OpenAI → Claude                                     |

Free providers are always tried before premium. If all free providers fail, the cascade escalates to premium. If all providers fail, a `503 Service Unavailable` is returned.

**Override the order at runtime** via environment variables:

```bash
export AI_FREE_ORDER=GROQ,CEREBRAS,TOGETHER,MISTRAL,SAMBANOVA,NOVITA
export AI_PREMIUM_ORDER=OPENAI,CLAUDE,GEMINI
```

**Supported providers:**

| Provider           | Env var             | Free tier |
| ------------------ | ------------------- | --------- |
| Cerebras           | `CEREBRAS_API_KEY`  | Yes       |
| Groq               | `GROQ_API_KEY`      | Yes       |
| Together AI        | `TOGETHER_API_KEY`  | Yes       |
| Mistral            | `MISTRAL_API_KEY`   | Yes       |
| SambaNova          | `SAMBANOVA_API_KEY` | Yes       |
| Novita AI          | `NOVITA_API_KEY`    | Yes       |
| Gemini             | `GEMINI_API_KEY`    | Limited   |
| OpenAI             | `OPENAI_API_KEY`    | No        |
| Claude (Anthropic) | `ANTHROPIC_API_KEY` | No        |

---

## Security Posture

| Control                 | Implementation                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Transport**           | HTTPS enforced via Nginx; HSTS header on all responses                                                                                   |
| **Authentication**      | Stateless JWT (RS256); refresh tokens stored server-side in Redis with TTL                                                               |
| **Authorization**       | Spring Security method-level `@PreAuthorize`; `SecurityUtils.assertOwnerOrAdmin()` for resource ownership checks                         |
| **Rate Limiting**       | Bucket4j per-user (authenticated) + Nginx per-IP zone (unauthenticated); anonymous users bypass user-scoped Redis lookups                |
| **Input Validation**    | Bean Validation (`@Valid`) on all DTOs; OWASP HTML Sanitizer for user-supplied HTML content; prompt injection sanitisation for AI inputs |
| **File Upload**         | Magic-byte validation (PDF/DOC/DOCX); UUID filenames; 10 MB size limit; path-traversal prevention                                        |
| **CORS**                | Configured via `CORS_ORIGINS` env var; restrictive defaults                                                                              |
| **Security Headers**    | CSP, X-Frame-Options (DENY), X-Content-Type-Options, Referrer-Policy, Permissions-Policy via `SecurityHeadersFilter`                     |
| **Dependency Scanning** | OWASP Dependency Check in CI (CVSSv3 ≥ 7 blocks merge); npm audit; Trivy container + secrets scan                                        |
| **Code Analysis**       | CodeQL `security-extended` on every push; SpotBugs + PMD code quality gates                                                              |

---

## CI/CD & Quality Gates

Every push to `main` and every pull request runs four GitHub Actions workflows:

| Workflow              | What it checks                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| **CI — Build & Test** | Maven build + 123 unit/web-layer tests (JDK 25, MongoDB 7, Redis 7) + Next.js lint, type-check, and build |
| **CodeQL**            | Static security analysis with `security-extended` query suite                                             |
| **Security Scan**     | OWASP Dependency Check, npm audit, Trivy (container + secrets), GitHub Dependency Review                  |
| **Code Quality**      | SpotBugs (max effort, medium threshold) + PMD                                                             |

Additionally, a `keep-alive` workflow pings deployed Render services on a schedule to prevent free-tier sleep.

---

## Deployment

The project ships with a `render.yaml` Blueprint that provisions the entire stack on [Render](https://render.com) with a single click.

### Services

| Service          | Type              | Runtime                                   |
| ---------------- | ----------------- | ----------------------------------------- |
| `kaddy-redis`    | Key-Value (Redis) | Render managed                            |
| `kaddy-backend`  | Web service       | Docker (Eclipse Temurin 25, Ubuntu Jammy) |
| `kaddy-frontend` | Web service       | Node.js 20                                |

### Deploy to Render

1. Push this repository to GitHub.
2. Render dashboard → **New** → **Blueprint** → connect this repo.
3. Render prompts for every `sync: false` secret (MongoDB URI, API keys, etc.).
4. After the first deploy, copy the backend URL and set it as `NEXT_PUBLIC_API_URL` on the frontend service (append `/api`).

### Required Render Environment Variables

| Variable              | Service  | Description                                               |
| --------------------- | -------- | --------------------------------------------------------- |
| `MONGODB_URI`         | Backend  | MongoDB Atlas connection string                           |
| `CORS_ORIGINS`        | Backend  | Frontend URL (e.g. `https://kaddy-frontend.onrender.com`) |
| `FRONTEND_URL`        | Backend  | Same as `CORS_ORIGINS` (used in email links)              |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend URL + `/api`                                      |

`JWT_SECRET` is auto-generated by Render. `REDIS_URL` is injected automatically from the `kaddy-redis` service.

### Docker Notes

The `backend/Dockerfile` uses a **multi-stage build**:

- **Build stage:** `eclipse-temurin:25-jdk-jammy` — compiles the JAR with Maven Wrapper
- **Runtime stage:** `eclipse-temurin:25-jre-jammy` — minimal JRE image (~280 MB)

> **Why Ubuntu Jammy (not Alpine)?** ZGC (`-XX:+UseZGC`) requires glibc. Alpine Linux uses musl libc, which is incompatible with ZGC and causes the JVM to crash on startup. Ubuntu Jammy provides the correct glibc environment.

**JVM tuning for Render free tier (512 MB RAM):**

| Flag                             | Value          | Purpose                                                    |
| -------------------------------- | -------------- | ---------------------------------------------------------- |
| `-XX:+UseZGC -XX:+ZGenerational` | —              | Generational ZGC; sub-millisecond GC pauses                |
| `-Xms32m -Xmx180m`               | 32–180 MB heap | Stays well within 512 MB container limit                   |
| `-XX:SoftMaxHeapSize=150m`       | 150 MB         | ZGC tries to stay under this before expanding              |
| `-XX:MaxMetaspaceSize=96m`       | 96 MB          | Prevents metaspace growth from reflection-heavy frameworks |
| `-XX:ReservedCodeCacheSize=32m`  | 32 MB          | JIT code cache                                             |
| `-XX:MaxDirectMemorySize=32m`    | 32 MB          | Netty direct buffers (WebFlux)                             |

---

## License

Proprietary — all rights reserved. See [LICENSE](LICENSE) for details.
