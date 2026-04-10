<div align="center">

# Kaddy Auto-Apply

### AI-Powered Automated Job Application Platform

*Aggregate. Personalise. Apply. Track — all in one place.*

[![CI — Build & Test](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/ci.yml/badge.svg)](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/ci.yml)
[![CodeQL](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/codeql.yml/badge.svg)](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/codeql.yml)
[![Security Scan](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/security.yml/badge.svg)](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/security.yml)
[![Code Quality](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/code-quality.yml/badge.svg)](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/code-quality.yml)
[![Java](https://img.shields.io/badge/Java-21_LTS-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](#license)

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
  - [Verifying the Installation](#verifying-the-installation)
- [Testing](#testing)
- [API Reference](#api-reference)
- [AI Provider Configuration](#ai-provider-configuration)
- [Job Source Configuration](#job-source-configuration)
- [Security Posture](#security-posture)
- [CI/CD & Quality Gates](#cicd--quality-gates)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Kaddy Auto-Apply** is a production-grade, full-stack platform that automates the end-to-end job application workflow. It aggregates live job listings from multiple major boards, generates AI-powered search keywords from user profiles, creates personalised cover letters using large language models, submits applications on behalf of the user, and provides real-time analytics on application progress — all secured behind enterprise-grade authentication and rate-limiting infrastructure.

The platform is horizontally scalable: the backend runs on Java 21 virtual threads, uses circuit breakers and retry policies for AI provider failover, and supports multi-instance deployment behind an Nginx load balancer with Redis-backed shared state for token revocation, rate limiting, and session management.

---

## Key Features

| Domain | Capabilities |
|---|---|
| **Authentication & Identity** | Stateless JWT (access + refresh tokens), Google/LinkedIn OAuth2, email verification, password reset, per-token blacklisting on logout, per-user session revocation |
| **Resume Management** | PDF upload with magic-byte validation, Apache PDFBox parsing, ATS score analysis, AI-powered resume generation with payment gate, path-traversal-safe UUID filenames |
| **AI Keyword Generation** | When the keyword field is empty, `SearchKeywordGeneratorService` uses the user's skills, target roles, title, and experience to craft a professional search query via LLM, maximising job listing coverage |
| **Job Search & Aggregation** | Multi-source parallel scraping (JSearch, SerpAPI, Adzuna, CareerJet, Arbeitnow, RemoteOK, and more), full-text search, salary and recency filters, 1-hour MongoDB TTL cache, AI-generated query returned in response for user refinement |
| **AI Cover Letters** | 10-provider LLM support with automatic failover and circuit breaker, custom and system templates, inline editing, per-user provider preference |
| **Application Tracking** | One-click and bulk apply (capped at 100), full status lifecycle (Saved → Applied → Interviewing → Offered / Rejected / Withdrawn), status history audit trail |
| **Auto Search Scheduler** | Background scheduled job search using user profile, configurable interval (1–24 h), AI-driven query generation, scored and filtered results stored automatically |
| **Stale Job Pruning** | Weekly scheduled pruner checks job URLs (HEAD request, 20 concurrent), removes listings returning 404/410, exposes a Spring Boot `HealthIndicator` |
| **Analytics & Reporting** | Application funnel metrics, weekly activity timeline, breakdown by job board source and status, response rate calculation |
| **Payments** | Razorpay integration for premium-tier features; signature verification enforced in all environments |
| **Load Balancing** | Nginx reverse proxy with `least_conn` upstream, per-endpoint rate limit zones, gzip, security headers, Docker Compose horizontal scaling (`--scale api=N`) |
| **Security & Compliance** | OWASP-aligned HTTP security headers (CSP, HSTS, X-Frame-Options), Bucket4j per-IP rate limiting, AOP audit logging, prompt injection sanitisation, OWASP Dependency Check, Trivy secret scanning |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Browser / Mobile Client                             │
│                Next.js 14 · TypeScript · Tailwind CSS                       │
│           Zustand (auth store) · TanStack Query (server state)              │
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
                │  api (1)   │  │api(2)│ │  api (N)  │   Spring Boot 3 · Java 21
                └─────┬──────┘  └──┬───┘ └─────┬─────┘   Virtual Threads
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

| Concern | Decision | Rationale |
|---|---|---|
| **Concurrency** | Java 21 virtual threads (`spring.threads.virtual.enabled=true`) | Eliminates thread-pool exhaustion under high I/O concurrency from AI and scraper calls |
| **AI Resilience** | Resilience4j circuit breaker + retry per provider | Prevents cascading failures when a single LLM provider is unavailable |
| **AI Search Keywords** | `SearchKeywordGeneratorService` with graceful fallback | When a user has no explicit query, the LLM crafts a professional, targeted query from their profile; falls back to `targetRoles[0]` or `title` if AI is unavailable |
| **Rate Limiting** | Bucket4j + Caffeine (bounded, auto-evicting) + Nginx zones | O(1) per-IP token-bucket; 200K IP ceiling prevents unbounded heap; Nginx zones provide an additional layer before requests reach the JVM |
| **Token Revocation** | Redis blacklist with matching TTL + per-user revocation marker | O(1) logout invalidation; password reset revokes all sessions globally |
| **Horizontal Scaling** | Stateless JWT + Redis shared state + shared upload volume | Any instance validates any token; rate limits and session state are global across replicas |
| **Circular Dependency** | `ApplicationEventPublisher` for `AutoApplyService ↔ CoverLetterService` | Eliminates `@Lazy` setter injection; decouples services through domain events |
| **GC** | Generational ZGC (`-XX:+ZGenerational`) | Sub-millisecond pause times under heavy request load |

---

## Tech Stack

### Backend

| Layer | Technology | Version |
|---|---|---|
| Language & Runtime | Java (OpenJDK Temurin) | 21 LTS |
| Framework | Spring Boot | 3.3 |
| Primary Database | MongoDB (Spring Data MongoDB) | 7 |
| Cache & Session Store | Redis 7 (Lettuce client) | 7-alpine |
| Security | Spring Security, JJWT, OAuth2 Client | — |
| HTTP Client | Spring WebFlux (WebClient) | — |
| AI Providers | Claude, OpenAI, Gemini, Groq, Mistral, Cerebras, Together AI, Novita AI, SambaNova | — |
| Job Board APIs | JSearch (RapidAPI), SerpAPI, Adzuna, CareerJet, Arbeitnow, RemoteOK, and more | — |
| Resilience | Resilience4j (circuit breaker, retry) | 2.2.0 |
| Rate Limiting | Bucket4j + Caffeine | 8.10.1 |
| PDF Processing | Apache PDFBox | 3.0.3 |
| HTML Sanitisation | OWASP Java HTML Sanitizer | 20240325.1 |
| Payments | Razorpay | — |
| API Documentation | SpringDoc OpenAPI (Swagger UI) | 2.6.0 |
| Monitoring | Spring Boot Actuator + Micrometer / Prometheus | — |
| Build Tool | Apache Maven | 3.9+ |

### Frontend

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 3 |
| Server State | TanStack React Query | 5 |
| Client State | Zustand (with persistence) | 5 |
| Forms & Validation | React Hook Form + Zod | — |
| Charts | Recharts | — |
| HTTP Client | Axios (with JWT interceptors) | — |
| Icons | Lucide React | — |

### Infrastructure & Tooling

| Concern | Tool |
|---|---|
| Containerisation | Docker + Docker Compose |
| Load Balancing | Nginx 1.27 (least_conn, per-endpoint rate limiting, gzip) |
| CI/CD | GitHub Actions |
| Static Security Analysis | CodeQL (`security-extended` queries) |
| Dependency Vulnerability | OWASP Dependency Check (CVSSv3 ≥ 7 fails build), npm audit |
| Container / Secret Scanning | Trivy |
| Code Quality | SpotBugs (max effort, medium threshold), PMD |
| PR Dependency Review | GitHub Dependency Review Action |

---

## Project Structure

```
auto_apply_with_kaddy/
│
├── backend/                              # Spring Boot application
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── java/com/kaddy/autoapply/
│       │   │   ├── config/               # SecurityConfig, RedisConfig, WebClientConfig,
│       │   │   │                         # FeatureConfig, TemplateSeeder, AsyncConfig,
│       │   │   │                         # JacksonConfig, WebMvcConfig
│       │   │   │   ├── aop/              # LoggingAspect, SecurityAuditAspect
│       │   │   │   └── security/         # RateLimitFilter, InputSanitizer,
│       │   │   │                         # SecurityHeadersFilter
│       │   │   ├── controller/           # AuthController, UserController, JobController,
│       │   │   │                         # ResumeController, CoverLetterController,
│       │   │   │                         # ApplicationController, AnalyticsController,
│       │   │   │                         # PaymentController, TemplateController,
│       │   │   │                         # SmartResumeController, AutoApplyController,
│       │   │   │                         # HealthController, SubscriptionController
│       │   │   ├── dto/
│       │   │   │   ├── request/          # SignupRequest, LoginRequest, ProfileUpdateRequest,
│       │   │   │   │                     # CoverLetterRequest, ApplyRequest, …
│       │   │   │   └── response/         # AuthResponse, UserResponse, JobResponse,
│       │   │   │                         # PagedResponse (with generatedQuery), …
│       │   │   ├── exception/            # GlobalExceptionHandler, AppException hierarchy
│       │   │   │                         # (400 / 404 / 429 / 503)
│       │   │   ├── model/                # MongoDB documents: User, Application, Job,
│       │   │   │                         # Resume, CoverLetter, Template, Payment, …
│       │   │   │   ├── enums/            # Role, ApplicationStatus, AuthProvider,
│       │   │   │   │                     # JobSource, SubscriptionTier, AiProviderType
│       │   │   │   └── event/            # AutoApplyJobQueuedEvent
│       │   │   ├── repository/           # Spring Data MongoDB repositories (14)
│       │   │   ├── security/             # JwtTokenProvider, JwtAuthenticationFilter,
│       │   │   │                         # SecurityUtils (assertOwnerOrAdmin)
│       │   │   └── service/
│       │   │       ├── ai/               # AiProvider (sealed interface) + 10 implementations
│       │   │       │                     # AiProviderFactory (selection, failover, circuit breaker)
│       │   │       │                     # AiTextGenerator
│       │   │       ├── scraper/          # ScraperOrchestrator, JSearchApiClient,
│       │   │       │                     # SerpApiClient, AdzunaApiClient, CareerJetApiClient,
│       │   │       │                     # ArbeitnowScraper, RemoteOKScraper, and more
│       │   │       └── *.java            # AuthService, UserService, JobService,
│       │   │                             # SearchKeywordGeneratorService,
│       │   │                             # ApplicationService, CoverLetterService,
│       │   │                             # ResumeService, AnalyticsService,
│       │   │                             # PaymentService, TemplateService,
│       │   │                             # TokenBlacklistService, JobScoringService,
│       │   │                             # StaleJobPrunerService, StaleJobPrunerHealthIndicator,
│       │   │                             # AutoSearchSchedulerService, AutoApplyService
│       │   └── resources/
│       │       ├── application.yml       # gitignored — do not commit
│       │       └── META-INF/
│       │           └── additional-spring-configuration-metadata.json
│       └── test/
│           ├── java/com/kaddy/autoapply/ # Unit + web layer + integration tests
│           └── resources/
│               ├── application-test.yml
│               └── mockito-extensions/
│
├── frontend/                             # Next.js 14 application
│   └── src/
│       ├── app/
│       │   ├── (auth)/                   # /login · /signup · /forgot-password
│       │   │                             # /reset-password · /verify-email
│       │   └── (dashboard)/              # /dashboard · /jobs · /applications
│       │                                 # /resumes · /cover-letters
│       │                                 # /cover-letters/templates · /profile
│       │                                 # /settings · /smart-resume
│       ├── components/
│       │   ├── ui/                       # Button, Input, Card, Modal, Badge, Select
│       │   ├── layout/                   # Sidebar, Topbar
│       │   └── …/                        # Feature-specific components
│       ├── hooks/                        # useAuth, useJobs (with aiSearchEnabled),
│       │                                 # useApplications, useResumes, useCoverLetters
│       ├── lib/
│       │   ├── api.ts                    # Axios client (JWT interceptors)
│       │   └── utils.ts                  # Formatting helpers
│       ├── middleware.ts                 # Edge middleware (route protection)
│       ├── store/
│       │   └── auth-store.ts             # Zustand auth store (persist + tier helpers)
│       └── types/
│           └── index.ts                  # TypeScript interfaces
│
├── nginx/
│   ├── nginx.conf                        # Worker tuning, gzip, proxy defaults
│   └── conf.d/
│       └── default.conf                  # Rate limit zones, upstream, location blocks
│
├── redis/
│   └── redis.conf                        # AOF + RDB dual-layer persistence
│
├── docker-compose.yml                    # MongoDB 7 + Redis 7 with named volumes
├── docker-compose.lb.yml                 # api + Nginx services for horizontal scaling
│
└── .github/workflows/
    ├── ci.yml                            # Build & test
    ├── codeql.yml                        # Static security analysis
    ├── security.yml                      # OWASP, Trivy, npm audit, dependency review
    └── code-quality.yml                  # SpotBugs + PMD
```

---

## Getting Started

### Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| Java (JDK) | 21 LTS | [Temurin distribution](https://adoptium.net/) recommended |
| Apache Maven | 3.9 | `mvn --version` to verify |
| Node.js | 20 LTS | `node --version` to verify |
| npm | 10 | Included with Node 20 |
| Docker Desktop | Latest | Required for MongoDB and Redis |
| Docker Compose | v2 | Bundled with Docker Desktop |

---

### Infrastructure Setup

```bash
docker compose up -d

docker compose ps
```

> **Redis authentication** — set `REDIS_PASSWORD` in a `.env` file at the project root before starting. The same value must be provided to the backend via the `REDIS_PASSWORD` environment variable.

---

### Environment Configuration

#### Backend — `backend/src/main/resources/application.yml`

This file is **gitignored** and must never be committed. Create it locally:

```yaml
spring:
  data:
    mongodb:
      uri: ${MONGODB_URI:mongodb://localhost:27017/kaddy_dev}
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD:}
  threads:
    virtual:
      enabled: true

app:
  jwt:
    secret: ${JWT_SECRET}
    access-token-expiry: 900000
    refresh-token-expiry: 604800000

  cors:
    allowed-origins: ${CORS_ORIGINS:http://localhost:3000}

  frontend-url: ${FRONTEND_URL:http://localhost:3000}

  email:
    resend:
      api-key: ${RESEND_API_KEY:}
    brevo:
      api-key: ${BREVO_API_KEY:}

  ai:
    default-provider: ${AI_DEFAULT_PROVIDER:OPENAI}
    provider-order:
      free: ${AI_FREE_ORDER:CEREBRAS,GROQ,TOGETHER,MISTRAL,SAMBANOVA,NOVITA}
      premium: ${AI_PREMIUM_ORDER:GEMINI,OPENAI,CLAUDE}
    claude:
      api-key: ${ANTHROPIC_API_KEY:}
      model: claude-sonnet-4-20250514
    openai:
      api-key: ${OPENAI_API_KEY:}
      model: gpt-4o
    gemini:
      api-key: ${GEMINI_API_KEY:}
    groq:
      api-key: ${GROQ_API_KEY:}
    mistral:
      api-key: ${MISTRAL_API_KEY:}
    cerebras:
      api-key: ${CEREBRAS_API_KEY:}
    together:
      api-key: ${TOGETHER_API_KEY:}
    sambanova:
      api-key: ${SAMBANOVA_API_KEY:}
    novita:
      api-key: ${NOVITA_API_KEY:}

  scraper:
    jsearch-api-key: ${JSEARCH_API_KEY:}
    cache-ttl-minutes: 60
    adzuna:
      app-id: ${ADZUNA_APP_ID:}
      app-key: ${ADZUNA_APP_KEY:}
    serpapi:
      api-key: ${SERPAPI_KEY:}
    careerjet:
      affiliate-id: ${CAREERJET_AFFILIATE_ID:}

  payment:
    razorpay:
      key-id: ${RAZORPAY_KEY_ID:}
      key-secret: ${RAZORPAY_KEY_SECRET:}

  upload:
    dir: ${UPLOAD_DIR:./uploads}

spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID:}
            client-secret: ${GOOGLE_CLIENT_SECRET:}
```

Generate a secure JWT secret:
```bash
openssl rand -base64 64
```

#### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

---

### Running Locally

```bash
docker compose up -d
```

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

API server starts on **`http://localhost:8080`**.

```bash
cd frontend
npm install
npm run dev
```

Frontend starts on **`http://localhost:3000`**.

---

### Running with Load Balancer

The load-balanced stack adds Nginx in front of horizontally-scaled Spring Boot instances. All state (token blacklist, rate-limit counters, uploaded files) is shared across replicas via Redis and a bind-mount volume.

```bash
docker compose up -d
```

```bash
docker compose -f docker-compose.yml -f docker-compose.lb.yml up --scale api=3 -d
```

Scale at runtime without downtime:
```bash
docker compose -f docker-compose.yml -f docker-compose.lb.yml up --scale api=5 -d --no-recreate
```

The application is available at **`http://localhost:80`**.

**Rate limit zones (Nginx)**

| Zone | Endpoint | Limit |
|---|---|---|
| `auth_zone` | `/api/auth/login`, `/api/auth/signup`, etc. | 5 req/min per IP |
| `upload_zone` | `/api/resumes/upload` | 10 req/min per IP |
| `api_zone` | All other `/api/**` | 120 req/min per IP |
| `global_zone` | Entire server (safety net) | 300 req/min per IP |

---

### Verifying the Installation

```bash
curl -s http://localhost:8080/actuator/health | python -m json.tool

curl -s -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Password123!"}' \
  | python -m json.tool

TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

curl -s http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  | python -m json.tool
```

---

## Testing

### Backend

```bash
cd backend

mvn test

mvn verify

mvn test -Dtest=AuthServiceTest

mvn test -Dtest=GlobalExceptionHandlerTest#invalidEmail_shouldReturn400WithApiError
```

The test suite uses:
- `@WebMvcTest` for controller-layer slice tests
- `@SpringBootTest` with the `test` profile for full context integration (uses real MongoDB Atlas + Redis Cloud credentials from `application-test.yml`)
- `mock-maker-subclass` Mockito extension for Java 21 compatibility

### Frontend

```bash
cd frontend

npx tsc --noEmit

npm run lint

npm run build
```

---

## API Reference

All endpoints are prefixed with `/api`. Protected endpoints require:
```
Authorization: Bearer <access_token>
```

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | — | Register a new user account |
| `POST` | `/auth/login` | — | Authenticate and receive JWT + refresh token |
| `POST` | `/auth/logout` | ✓ | Blacklist the current access token |
| `POST` | `/auth/refresh` | — | Exchange a valid refresh token for a new token pair |
| `GET` | `/auth/me` | ✓ | Return the current authenticated user's profile |
| `GET` | `/auth/verify-email` | — | Verify email via one-time token (`?token=`) |
| `POST` | `/auth/resend-verification` | — | Resend the email verification link |
| `POST` | `/auth/forgot-password` | — | Initiate the password reset flow |
| `POST` | `/auth/reset-password` | — | Complete the password reset |

### User Profile

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/users/profile` | ✓ | Retrieve the authenticated user's full profile |
| `PUT` | `/users/profile` | ✓ | Update profile fields (name, title, skills, target roles, links, etc.) |
| `POST` | `/users/github-import` | ✓ | Import public profile data from a GitHub username |
| `POST` | `/users/skip-keywords` | ✓ | Add a job-filter keyword |
| `DELETE` | `/users/skip-keywords/{keyword}` | ✓ | Remove a job-filter keyword |
| `GET` | `/users/auto-search-schedule` | ✓ | Get the automated search schedule |
| `PUT` | `/users/auto-search-schedule` | ✓ | Configure the automated search interval and parameters |
| `DELETE` | `/users/account` | ✓ | Permanently delete the account and all associated data |

### Jobs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/jobs/search` | ✓ | Search jobs. `query` is optional — when omitted, the backend generates professional search keywords from the authenticated user's profile using AI. Response includes `generatedQuery` when keywords were auto-generated. |
| `GET` | `/jobs/{id}` | ✓ | Retrieve full job details by ID |
| `GET` | `/jobs/counts` | ✓ | Job count breakdown by source for a given query and location |
| `POST` | `/jobs/{id}/summarize` | ✓ | Generate an AI summary of the job description (Gold/Platinum) |
| `GET` | `/jobs/{id}/match` | ✓ | Score the job against the user's resume skills |

**Search query parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | string | No | Keywords or job title. If omitted, AI generates from profile. |
| `location` | string | No | City, country, or "Remote" |
| `source` | string | No | Filter by source (e.g. `JSEARCH`) |
| `page` | int | No | Page number (default: 0) |
| `size` | int | No | Results per page: 30, 40, 50, 75, or 100 (default: 30) |
| `minSalary` | long | No | Minimum normalised salary in USD |
| `maxSalary` | long | No | Maximum normalised salary in USD |
| `maxAgeDays` | int | No | Maximum posting age in days (default: 30) |

### Resumes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/resumes/upload` | ✓ | Upload a PDF resume (multipart/form-data, max 10 MB) |
| `GET` | `/resumes` | ✓ | Paginated list of the user's resumes |
| `GET` | `/resumes/{id}` | ✓ | Retrieve a specific resume |
| `DELETE` | `/resumes/{id}` | ✓ | Delete a resume |
| `GET` | `/resumes/{id}/analysis` | ✓ | ATS score and improvement suggestions |
| `POST` | `/resumes/generate` | ✓ | AI-tailored resume generation (requires payment) |

### Cover Letters

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/cover-letters/generate` | ✓ | Generate an AI cover letter for a specific job |
| `GET` | `/cover-letters` | ✓ | List all cover letters |
| `GET` | `/cover-letters/{id}` | ✓ | Retrieve a specific cover letter |
| `PUT` | `/cover-letters/{id}` | ✓ | Update cover letter content |
| `DELETE` | `/cover-letters/{id}` | ✓ | Delete a cover letter |

### Templates

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/templates` | ✓ | List system templates and user-created templates |
| `POST` | `/templates` | ✓ | Create a custom template |
| `PUT` | `/templates/{id}` | ✓ | Update a user-owned template |
| `DELETE` | `/templates/{id}` | ✓ | Delete a user-owned template |

### Applications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/applications` | ✓ | Create a new application record |
| `POST` | `/applications/bulk-apply` | ✓ | Apply to multiple jobs (max 100 per request) |
| `GET` | `/applications` | ✓ | Paginated list of applications (`?status=&page=&size=`) |
| `GET` | `/applications/{id}` | ✓ | Application details with status history |
| `PUT` | `/applications/{id}/status` | ✓ | Transition application status |
| `DELETE` | `/applications/{id}` | ✓ | Remove an application record |

### Analytics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/analytics/summary` | ✓ | Aggregated totals: applied, interviewing, offered, response rate |
| `GET` | `/analytics/timeline` | ✓ | Weekly application activity |
| `GET` | `/analytics/by-source` | ✓ | Application count by job board source |
| `GET` | `/analytics/by-status` | ✓ | Application count by current status |

### Payments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/payments/create-order` | ✓ | Create a Razorpay order |
| `POST` | `/payments/verify` | ✓ | Verify Razorpay payment signature and unlock feature |

### Monitoring

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/actuator/health` | — | Service liveness and readiness (includes `StaleJobPrunerHealthIndicator`) |
| `GET` | `/actuator/info` | — | Application metadata |
| `GET` | `/actuator/metrics` | `ROLE_ADMIN` | Micrometer metrics |
| `GET` | `/actuator/**` | `ROLE_ADMIN` | All other actuator endpoints |

---

## AI Provider Configuration

The platform implements a unified `AiProvider` sealed interface with 10 concrete provider implementations. `AiProviderFactory` selects the active provider from a configurable ordered list and automatically fails over to the next available provider via a Resilience4j circuit breaker.

Provider order is configured via `application.yml`:

```yaml
app:
  ai:
    provider-order:
      free: CEREBRAS,GROQ,TOGETHER,MISTRAL,SAMBANOVA,NOVITA
      premium: GEMINI,OPENAI,CLAUDE
```

| Provider | Key | Example Model |
|---|---|---|
| Anthropic Claude | `CLAUDE` | `claude-sonnet-4-20250514` |
| OpenAI | `OPENAI` | `gpt-4o` |
| Google Gemini | `GEMINI` | `gemini-1.5-pro` |
| Groq | `GROQ` | `llama-3.3-70b-versatile` |
| Mistral | `MISTRAL` | `mistral-large-latest` |
| Cerebras | `CEREBRAS` | `llama-3.3-70b` |
| Together AI | `TOGETHER` | `meta-llama/Llama-3-70b-chat-hf` |
| SambaNova | `SAMBANOVA` | `Meta-Llama-3.3-70B-Instruct` |
| Novita AI | `NOVITA` | `meta-llama/llama-3.3-70b-instruct` |
| OpenAI-compatible | `OPENAI_COMPATIBLE` | Any OpenAI-compatible endpoint |

At minimum, one provider key must be configured for AI features (cover letter generation, job summarisation, keyword generation, resume optimisation) to function.

---

## Job Source Configuration

`ScraperOrchestrator` invokes all configured sources in parallel, merges and deduplicates results, and caches them in MongoDB with a configurable TTL.

| Source | Configuration Key | Coverage |
|---|---|---|
| **JSearch** (RapidAPI) | `app.scraper.jsearch-api-key` | Indeed + LinkedIn aggregation |
| **SerpAPI** | `app.scraper.serpapi.api-key` | Google Jobs |
| **Adzuna** | `app.scraper.adzuna.app-id` + `app-key` | UK / US / AU / EU boards |
| **CareerJet** | `app.scraper.careerjet.affiliate-id` | Global aggregator |
| **Arbeitnow** | No key required | European tech jobs |
| **RemoteOK** | No key required | Remote-only listings |

A source is silently skipped if its API key is empty or unavailable. At least one source must be configured for job search to return results. Cache TTL defaults to 60 minutes (`app.scraper.cache-ttl-minutes`).

---

## Security Posture

### Authentication & Authorisation

| Control | Implementation |
|---|---|
| Stateless JWT | 15-minute access tokens; 7-day refresh tokens; HMAC-SHA256 |
| Refresh token rotation | New pair issued on every `/auth/refresh`; consumed token blacklisted |
| Token revocation | Redis-backed blacklist (`TokenBlacklistService`) with TTL matching remaining lifetime |
| Per-user revocation | `revokeAllForUser()` writes a Redis marker; password reset invokes it globally |
| Role-based access control | `ROLE_USER` and `ROLE_ADMIN` embedded in JWT; enforced via `@PreAuthorize` and Spring Security |
| Resource ownership | `SecurityUtils.assertOwnerOrAdmin()` guards all owner-sensitive operations |
| OAuth2 social login | Google and LinkedIn via Spring Security OAuth2 Client |
| Email verification | One-time token on signup; access restricted until verified |
| Password reset | Time-limited token; silent response for unknown addresses (prevents enumeration) |

### Transport & Headers

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforce HTTPS (OWASP A02) |
| `Content-Security-Policy` | Restrictive default-src, frame-ancestors none | Prevent XSS and framing (OWASP A03) |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | camera, mic, geolocation, payment denied | Restrict browser API access |
| `Forwarded-Header` | Processed via `ForwardedHeaderFilter` | Correct client IP behind Nginx |

### Input Validation & Security

- All request bodies validated with Jakarta Bean Validation before reaching service layer
- HTML input sanitised via OWASP Java HTML Sanitizer before persistence
- PDF uploads validated by magic-byte check (`%PDF`); filenames are pure UUID — no user input in paths
- AI prompt inputs sanitised via `sanitizeForPrompt()` — strips role markers, code fences, control characters
- MongoDB queries use Spring Data parameterised methods exclusively

### Rate Limiting (layered)

| Layer | Scope | Limit |
|---|---|---|
| Nginx `auth_zone` | Auth endpoints | 5 req/min per IP |
| Nginx `upload_zone` | `/api/resumes/upload` | 10 req/min per IP |
| Nginx `api_zone` | All other `/api/**` | 120 req/min per IP |
| Nginx `global_zone` | Entire server | 300 req/min per IP |
| Bucket4j (JVM) | Auth endpoints | 10 req/min per IP |
| Bucket4j (JVM) | All other endpoints | 60 req/min per IP |

### Audit Logging

AOP `@Around` advice in `SecurityAuditAspect` intercepts authentication events, payment operations, subscription changes, resume uploads, and bulk apply requests, emitting structured log entries for each.

---

## CI/CD & Quality Gates

Four GitHub Actions workflows run on every push and pull request to `main`.

| Workflow | Trigger | Jobs |
|---|---|---|
| **CI — Build & Test** (`ci.yml`) | Push + PR to `main` | Backend: `mvn verify` (compile, tests, JaCoCo). Frontend: lint, `tsc --noEmit`, production build |
| **CodeQL** (`codeql.yml`) | Push + PR + weekly | Java and JavaScript static analysis with `security-extended` query suite |
| **Security** (`security.yml`) | Push + PR + weekly | OWASP Dependency Check (fail on CVSSv3 ≥ 7), npm audit, Trivy secret scan, GitHub Dependency Review |
| **Code Quality** (`code-quality.yml`) | Push + PR to `main` | SpotBugs (max effort, medium threshold) + PMD |

### Required Secrets

| Secret | Required For |
|---|---|
| `JWT_SECRET` | Backend integration tests |
| `NVD_API_KEY` | OWASP Dependency Check NVD rate limit |

---

## Deployment

| Component | Recommended Platform |
|---|---|
| Backend (Spring Boot JAR) | Railway, Render, Fly.io, AWS ECS, Azure App Service |
| Frontend (Next.js) | Vercel (recommended), Netlify, self-hosted `next start` |
| MongoDB | MongoDB Atlas (M10+ for production) |
| Redis | Redis Cloud (30 MB+ for token blacklist + rate-limit cache) |

### Production Environment Variables

```
MONGODB_URI          MongoDB Atlas connection string (with database name)
REDIS_HOST           Redis Cloud hostname
REDIS_PORT           Redis Cloud port
REDIS_PASSWORD       Redis authentication password
JWT_SECRET           Min 256-bit random secret (openssl rand -base64 64)
CORS_ORIGINS         Comma-separated list of allowed frontend origins
FRONTEND_URL         Public URL of the frontend (for email links)
MAIL_FROM            Verified sender address
SPRING_PROFILES_ACTIVE   prod
```

### Docker Compose Production Reference

```bash
docker compose -f docker-compose.yml -f docker-compose.lb.yml \
  --env-file .env \
  up --scale api=3 -d
```

---

## Contributing

This is a proprietary project. External contributions are not accepted at this time.

Internal development workflow:

1. Create a feature branch from `main` (`git checkout -b feat/your-feature`)
2. Implement changes with accompanying tests
3. Ensure all quality gates pass locally:
   ```bash
   cd backend && mvn verify
   cd frontend && npm run lint && npx tsc --noEmit && npm run build
   ```
4. Open a pull request against `main` — all four CI workflows must pass before merging
5. Squash-merge with a descriptive commit message

---

## License

Copyright © 2025 Rajesh Singh Kadyan. All rights reserved.

This software and its source code are proprietary and confidential. Unauthorised copying, distribution, modification, or use of this software, in whole or in part, is strictly prohibited without the express written consent of the copyright owner.
