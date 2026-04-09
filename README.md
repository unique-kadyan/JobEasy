<div align="center">

# Kaddy Auto-Apply

### AI-Powered Automated Job Application Platform

*Aggregate. Personalise. Apply. Track — all in one place.*

[![CI — Build & Test](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/ci.yml/badge.svg)](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/ci.yml)
[![CodeQL](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/codeql.yml/badge.svg)](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/codeql.yml)
[![Security Scan](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/security.yml/badge.svg)](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/security.yml)
[![Code Quality](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/code-quality.yml/badge.svg)](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/code-quality.yml)
[![Java](https://img.shields.io/badge/Java-25_LTS-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/projects/jdk/25/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3.6-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
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

**Kaddy Auto-Apply** is a production-grade, full-stack platform that automates the end-to-end job application workflow. It aggregates live job listings from multiple major boards, generates personalised cover letters using large language models, submits applications on behalf of the user, and provides real-time analytics on application progress — all secured behind enterprise-grade authentication and rate-limiting infrastructure.

The platform is built for scale: the backend runs on Java virtual threads, uses circuit breakers and retry policies for AI provider failover, and employs a bounded Caffeine cache for in-memory rate-limit state with MongoDB and Redis for persistence.

---

## Key Features

| Domain | Capabilities |
|---|---|
| **Authentication & Identity** | Stateless JWT (access + refresh), Google/LinkedIn OAuth2, email verification, password reset, per-token blacklisting on logout |
| **Resume Management** | PDF upload and parsing (Apache PDFBox), ATS score analysis, AI-powered resume generation with preview and payment gate |
| **Job Search & Aggregation** | Multi-source parallel scraping (JSearch, SerpAPI, Adzuna, CareerJet), full-text search, location and type filters, 1-hour MongoDB TTL cache |
| **AI Cover Letters** | 10-provider LLM support with automatic failover, custom and system templates, inline editing, per-user provider preference |
| **Application Tracking** | One-click and bulk apply, full status lifecycle (Saved → Applied → Interviewing → Offered / Rejected / Withdrawn), Kanban board view, status history audit trail |
| **Analytics & Reporting** | Application funnel metrics, weekly activity timeline, breakdown by job source and status, response rate calculation |
| **Payments** | Razorpay integration for premium-tier resume generation, mock order fallback in development |
| **Security & Compliance** | OWASP-aligned HTTP security headers (CSP, HSTS, X-Frame-Options), Bucket4j per-IP rate limiting, AOP audit logging, OWASP Dependency Check, Trivy secret scanning |
| **Developer Experience** | Full GitHub Actions CI/CD, CodeQL static analysis, SpotBugs + PMD code quality, OpenAPI/Swagger UI at `/swagger-ui.html` |

---

## Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                      Browser / Mobile Client                          │
│              Next.js 14 · TypeScript · Tailwind CSS                   │
│         Zustand (auth store) · TanStack Query (server state)          │
│              Next.js Edge Middleware (route protection)               │
└───────────────────────────────┬───────────────────────────────────────┘
                                │  HTTPS · REST/JSON
                                │  Authorization: Bearer <JWT>
                                │  X-Requested-With: XMLHttpRequest
┌───────────────────────────────▼───────────────────────────────────────┐
│                        Spring Boot 3.3 · Java 25                      │
│                                                                        │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────────┐ │
│  │  Security Layer │  │  REST Controllers│  │   Service Layer       │ │
│  │─────────────────│  │──────────────────│  │───────────────────────│ │
│  │ RateLimitFilter │  │ AuthController   │  │ ┌───────────────────┐ │ │
│  │ JwtAuthFilter   │  │ UserController   │  │ │ AiProviderFactory │ │ │
│  │ Spring Security │  │ JobController    │  │ │ 10 LLM providers  │ │ │
│  │ AOP Audit Log   │  │ ResumeController │  │ │ Circuit Breaker   │ │ │
│  │ CORS + CSRF     │  │ CoverLetterCtrl  │  │ └───────────────────┘ │ │
│  │ CSP Headers     │  │ ApplicationCtrl  │  │ ┌───────────────────┐ │ │
│  └─────────────────┘  │ AnalyticsCtrl   │  │ │ScraperOrchestrator│ │ │
│                        │ PaymentCtrl     │  │ │ 4 job board APIs  │ │ │
│                        └──────────────────┘  │ │ Parallel + dedupe │ │ │
│                                               │ └───────────────────┘ │ │
│                                               └───────────────────────┘ │
└────────────────────────┬────────────────────────┬────────────────────────┘
                         │                        │
         ┌───────────────▼──────┐    ┌────────────▼────────────┐
         │     MongoDB 7         │    │       Redis 7            │
         │  (primary datastore)  │    │  Token blacklist · Cache │
         │  Documents · TTL idx  │    │  AOF + RDB persistence   │
         └──────────────────────┘    └─────────────────────────┘
```

### Design Decisions

| Concern | Decision | Rationale |
|---|---|---|
| **Concurrency** | Java virtual threads (`spring.threads.virtual.enabled=true`) | Eliminates thread-pool exhaustion under high I/O concurrency from AI and scraper calls |
| **AI Resilience** | Resilience4j circuit breaker + retry per provider | Prevents cascading failures when a single LLM provider is unavailable |
| **Rate Limiting** | Bucket4j + Caffeine (bounded, auto-evicting) | O(1) per-IP token-bucket check; 200K IP ceiling prevents unbounded heap growth |
| **Token Revocation** | Redis blacklist with matching TTL | O(1) logout invalidation without full-session storage |
| **GC** | Generational ZGC (`-XX:+ZGenerational`) | Sub-millisecond pause times under heavy request load |

---

## Tech Stack

### Backend

| Layer | Technology | Version |
|---|---|---|
| Language & Runtime | Java (OpenJDK Temurin) | 25 LTS |
| Framework | Spring Boot | 3.3.6 |
| Primary Database | MongoDB (Spring Data MongoDB) | 7 |
| Cache & Session Store | Redis 7 (Lettuce client) | 7-alpine |
| Security | Spring Security, JJWT, OAuth2 Client | — |
| HTTP Client | Spring WebFlux (WebClient) | — |
| AI Providers | Claude, OpenAI, Gemini, Groq, Mistral, Cerebras, Together AI, Novita AI, SambaNova | — |
| Job Board APIs | JSearch (RapidAPI), SerpAPI, Adzuna, CareerJet | — |
| Resilience | Resilience4j (circuit breaker, retry) | 2.2.0 |
| Rate Limiting | Bucket4j + Caffeine | 8.10.1 |
| PDF Processing | Apache PDFBox | 3.0.3 |
| HTML Sanitization | OWASP Java HTML Sanitizer | 20240325.1 |
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
│       │   │   │                         # TemplateSeeder, AOP audit, async config
│       │   │   │   └── security/         # RateLimitFilter, InputSanitizer
│       │   │   ├── controller/           # AuthController, UserController, JobController,
│       │   │   │                         # ResumeController, CoverLetterController,
│       │   │   │                         # ApplicationController, AnalyticsController,
│       │   │   │                         # PaymentController, TemplateController,
│       │   │   │                         # SmartResumeController
│       │   │   ├── dto/
│       │   │   │   ├── request/          # SignupRequest, LoginRequest, ProfileUpdateRequest, …
│       │   │   │   └── response/         # AuthResponse, UserResponse, JobResponse, …
│       │   │   ├── exception/            # GlobalExceptionHandler (@RestControllerAdvice),
│       │   │   │                         # AppException hierarchy (400 / 404 / 429 / 503)
│       │   │   ├── model/                # MongoDB documents: User, Application, Job,
│       │   │   │                         # Resume, CoverLetter, Template, …
│       │   │   │   └── enums/            # Role, ApplicationStatus, AuthProvider, JobSource
│       │   │   ├── repository/           # Spring Data MongoDB repositories (12)
│       │   │   ├── security/             # JwtTokenProvider, JwtAuthenticationFilter,
│       │   │   │                         # SecurityUtils
│       │   │   └── service/
│       │   │       ├── ai/               # AiProvider interface + 10 provider implementations
│       │   │       │                     # AiProviderFactory (selection + failover)
│       │   │       ├── scraper/          # ScraperOrchestrator, JSearchApiClient,
│       │   │       │                     # SerpApiClient, AdzunaApiClient, CareerJetApiClient,
│       │   │       │                     # RemoteOKScraper, ArbeitnowScraper, …
│       │   │       └── *.java            # AuthService, UserService, JobService,
│       │   │                             # ApplicationService, CoverLetterService,
│       │   │                             # ResumeService, AnalyticsService,
│       │   │                             # PaymentService, TemplateService,
│       │   │                             # TokenBlacklistService, …
│       │   └── resources/
│       │       ├── application.yml       # ⚠ gitignored — do not commit
│       │       └── META-INF/
│       │           └── additional-spring-configuration-metadata.json
│       └── test/
│           ├── java/com/kaddy/autoapply/ # 123 unit + integration tests
│           └── resources/
│               ├── application-test.yml  # Test profile (real Atlas + Redis Cloud)
│               └── mockito-extensions/   # mock-maker-subclass for Java 25 compat
│
├── frontend/                             # Next.js 14 application
│   └── src/
│       ├── app/
│       │   ├── (auth)/                   # /login · /signup · /forgot-password
│       │   │                             # /reset-password · /verify-email
│       │   └── (dashboard)/              # /dashboard · /jobs · /jobs/[id]
│       │                                 # /applications · /resumes
│       │                                 # /cover-letters · /cover-letters/templates
│       │                                 # /profile · /settings · /smart-resume
│       ├── components/
│       │   ├── ui/                       # Button, Input, Card, Modal, Badge, Select
│       │   ├── layout/                   # Sidebar, Topbar
│       │   └── …/                        # Feature-specific components
│       ├── hooks/                        # useAuth, useJobs, useApplications,
│       │                                 # useResumes, useCoverLetters
│       ├── lib/
│       │   ├── api.ts                    # Axios client (JWT interceptors, session cookie)
│       │   └── utils.ts                  # Formatting helpers
│       ├── middleware.ts                 # Edge middleware (route protection)
│       ├── store/
│       │   └── auth-store.ts             # Zustand auth store (persist + hasRole)
│       └── types/
│           └── index.ts                  # TypeScript interfaces (User, Job, Application, …)
│
├── redis/
│   └── redis.conf                        # Production Redis config (AOF + RDB persistence)
│
├── .github/workflows/
│   ├── ci.yml                            # Build & test — backend + frontend
│   ├── codeql.yml                        # Static security analysis (scheduled + on push)
│   ├── security.yml                      # OWASP, Trivy, npm audit, dependency review
│   └── code-quality.yml                  # SpotBugs + PMD
│
├── docker-compose.yml                    # MongoDB 7 + Redis 7 with persistence volumes
└── README.md
```

---

## Getting Started

### Prerequisites

Ensure the following are installed and available on your `PATH` before proceeding:

| Requirement | Minimum Version | Notes |
|---|---|---|
| Java (JDK) | 25 (LTS) | [Temurin distribution](https://adoptium.net/) recommended |
| Apache Maven | 3.9 | `mvn --version` to verify |
| Node.js | 20 LTS | `node --version` to verify |
| npm | 10 | Included with Node 20 |
| Docker Desktop | Latest | Required for MongoDB and Redis |
| Docker Compose | v2 | Bundled with Docker Desktop |

---

### Infrastructure Setup

The Docker Compose file provisions MongoDB 7 and Redis 7 with production-grade persistence configuration (AOF + RDB dual-layer for Redis, named volumes for both services).

```bash
# Start MongoDB (port 27017) and Redis (port 6379)
docker-compose up -d

# Verify both services are healthy
docker-compose ps
```

> **Optional Redis authentication** — set `REDIS_PASSWORD` in a `.env` file in the project root before starting Docker Compose. The same value must be provided to the backend via the `REDIS_PASSWORD` environment variable.

---

### Environment Configuration

#### Backend — `backend/src/main/resources/application.yml`

This file is **gitignored** and must never be committed. Create it locally with the values below, replacing all `<placeholder>` entries:

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
    secret: ${JWT_SECRET}                    # Min 256-bit random string
    access-token-expiry: 900000              # 15 minutes (milliseconds)
    refresh-token-expiry: 604800000          # 7 days (milliseconds)

  cors:
    allowed-origins: ${CORS_ORIGINS:http://localhost:3000}

  frontend-url: ${FRONTEND_URL:http://localhost:3000}

  mail:
    from: ${MAIL_FROM:noreply@yourdomain.com}

  email:
    resend:
      api-key: ${RESEND_API_KEY:}
    brevo:
      api-key: ${BREVO_API_KEY:}

  ai:
    default-provider: ${AI_DEFAULT_PROVIDER:OPENAI}
    claude:
      api-key: ${CLAUDE_API_KEY:}
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

> **JWT Secret** — generate a cryptographically secure secret with:
> ```bash
> openssl rand -base64 64
> ```

#### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

---

### Running Locally

**Step 1 — Start infrastructure**
```bash
docker-compose up -d
```

**Step 2 — Start the backend**
```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

The API server starts on **`http://localhost:8080`**.

**Step 3 — Start the frontend**
```bash
cd frontend
npm install
npm run dev
```

The web application starts on **`http://localhost:3000`**.

---

### Verifying the Installation

```bash
# 1. Backend health check
curl -s http://localhost:8080/actuator/health | python -m json.tool

# 2. Register a test account
curl -s -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Password123!"}' \
  | python -m json.tool

# 3. Login and capture the access token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# 4. Call a protected endpoint
curl -s http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  | python -m json.tool

# 5. OpenAPI / Swagger UI
open http://localhost:8080/swagger-ui.html
```

---

## Testing

### Backend

```bash
cd backend

# Run all 123 tests (unit + web layer + context integration)
mvn test

# Run with coverage report (output: target/site/jacoco/index.html)
mvn verify

# Run a specific test class
mvn test -Dtest=AuthServiceTest

# Run a specific test method
mvn test -Dtest=GlobalExceptionHandlerTest#invalidEmail_shouldReturn400WithApiError
```

The test suite uses:
- `@WebMvcTest` for controller-layer slice tests (no Spring context boot required)
- `@SpringBootTest` with the `test` profile for full context integration (uses real MongoDB Atlas + Redis Cloud credentials from `application-test.yml`)
- `mock-maker-subclass` Mockito extension for Java 25 compatibility

### Frontend

```bash
cd frontend

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Production build (confirms no build-time errors)
npm run build
```

---

## API Reference

All endpoints are prefixed with `/api`. Protected endpoints require the header:
```
Authorization: Bearer <access_token>
```

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | — | Register a new user account |
| `POST` | `/auth/login` | — | Authenticate and receive JWT + refresh token |
| `POST` | `/auth/logout` | ✓ | Blacklist the current access token (server-side invalidation) |
| `POST` | `/auth/refresh` | — | Exchange a valid refresh token for a new token pair |
| `GET` | `/auth/me` | ✓ | Return the current authenticated user's profile |
| `GET` | `/auth/verify-email` | — | Verify email address via one-time token (`?token=`) |
| `POST` | `/auth/resend-verification` | — | Resend the email verification link |
| `POST` | `/auth/forgot-password` | — | Initiate the password reset flow |
| `POST` | `/auth/reset-password` | — | Complete the password reset with token + new password |

### User Profile

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/users/profile` | ✓ | Retrieve the authenticated user's full profile |
| `PUT` | `/users/profile` | ✓ | Update profile fields (name, title, skills, links, etc.) |
| `POST` | `/users/github-import` | ✓ | Import public profile data from a GitHub username |
| `POST` | `/users/skip-keywords` | ✓ | Add a job-filter keyword (suppresses matching listings) |
| `DELETE` | `/users/skip-keywords/{keyword}` | ✓ | Remove a job-filter keyword |
| `GET` | `/users/auto-search-schedule` | ✓ | Get the automated job search schedule |
| `PUT` | `/users/auto-search-schedule` | ✓ | Configure the automated search interval and parameters |
| `DELETE` | `/users/account` | ✓ | Permanently delete the user account and all associated data |

### Jobs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/jobs/search` | ✓ | Search jobs across all configured sources (`?q=&location=&page=&size=`) |
| `GET` | `/jobs/{id}` | ✓ | Retrieve full job details by ID |

### Resumes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/resumes/upload` | ✓ | Upload a PDF resume (multipart/form-data) |
| `GET` | `/resumes` | ✓ | List all resumes for the authenticated user |
| `GET` | `/resumes/{id}` | ✓ | Retrieve a specific resume |
| `DELETE` | `/resumes/{id}` | ✓ | Delete a resume |
| `GET` | `/resumes/{id}/analysis` | ✓ | Retrieve ATS score analysis for a resume |
| `POST` | `/resumes/generate` | ✓ | Generate an AI-tailored resume from the user's profile |

### Cover Letters

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/cover-letters/generate` | ✓ | Generate an AI cover letter for a specific job |
| `GET` | `/cover-letters` | ✓ | List all cover letters for the authenticated user |
| `GET` | `/cover-letters/{id}` | ✓ | Retrieve a specific cover letter |
| `PUT` | `/cover-letters/{id}` | ✓ | Update cover letter content |
| `DELETE` | `/cover-letters/{id}` | ✓ | Delete a cover letter |

### Templates

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/templates` | ✓ | List all system templates and user-created templates |
| `POST` | `/templates` | ✓ | Create a custom template |
| `PUT` | `/templates/{id}` | ✓ | Update a user-owned template |
| `DELETE` | `/templates/{id}` | ✓ | Delete a user-owned template |

### Applications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/applications` | ✓ | Create a new application record |
| `POST` | `/applications/bulk-apply` | ✓ | Submit applications to multiple jobs simultaneously |
| `GET` | `/applications` | ✓ | List all applications (`?status=&page=&size=`) |
| `GET` | `/applications/{id}` | ✓ | Retrieve a specific application with status history |
| `PUT` | `/applications/{id}/status` | ✓ | Transition application status (e.g. APPLIED → INTERVIEWING) |
| `DELETE` | `/applications/{id}` | ✓ | Remove an application record |

### Analytics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/analytics/summary` | ✓ | Aggregated totals: applied, interviewing, offered, response rate |
| `GET` | `/analytics/timeline` | ✓ | Weekly application activity chart data |
| `GET` | `/analytics/by-source` | ✓ | Application count broken down by job board source |
| `GET` | `/analytics/by-status` | ✓ | Application count broken down by current status |

### Payments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/payments/create-order` | ✓ | Create a Razorpay order for a premium feature |
| `POST` | `/payments/verify` | ✓ | Verify Razorpay payment signature and unlock feature |

### Monitoring

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/actuator/health` | — | Service liveness and readiness |
| `GET` | `/actuator/info` | — | Application metadata |
| `GET` | `/actuator/metrics` | `ROLE_ADMIN` | Micrometer metrics |
| `GET` | `/actuator/**` | `ROLE_ADMIN` | All other actuator endpoints |

---

## AI Provider Configuration

The platform implements a unified `AiProvider` interface with 10 concrete provider implementations. The `AiProviderFactory` selects the active provider based on the `app.ai.default-provider` configuration value and automatically fails over to the next available provider via a Resilience4j circuit breaker.

| Provider | `default-provider` Key | Model Example |
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

Set `app.ai.default-provider` to the desired key in `application.yml` and provide the corresponding API key. At minimum, one provider key must be configured for cover letter generation to function.

---

## Job Source Configuration

The `ScraperOrchestrator` invokes all configured job board clients in parallel, merges and deduplicates results, and caches them in MongoDB with a configurable TTL.

| Source | Configuration Key | Coverage |
|---|---|---|
| **JSearch** (RapidAPI) | `app.scraper.jsearch-api-key` | Indeed + LinkedIn aggregation |
| **SerpAPI** | `app.scraper.serpapi.api-key` | Google Jobs results |
| **Adzuna** | `app.scraper.adzuna.app-id` + `app-key` | UK / US / AU / EU boards |
| **CareerJet** | `app.scraper.careerjet.affiliate-id` | Global job aggregator |

A source is silently skipped if its API key is empty. At least one source must be configured for job search to return results. Cache TTL defaults to 60 minutes and is configurable via `app.scraper.cache-ttl-minutes`.

---

## Security Posture

### Authentication & Authorisation

| Control | Implementation |
|---|---|
| Stateless JWT authentication | 15-minute access tokens; 7-day refresh tokens; HMAC-SHA256 signing |
| Refresh token rotation | New token pair issued on every `/auth/refresh` call |
| Token revocation | Redis-backed blacklist (`TokenBlacklistService`); TTL matches remaining token lifetime |
| Role-based access control | `ROLE_USER` and `ROLE_ADMIN` roles embedded in JWT claims; enforced via `@PreAuthorize` and Spring Security filter chain |
| OAuth2 social login | Google and LinkedIn providers via Spring Security OAuth2 Client |
| Email verification | One-time token sent on signup; account access restricted until verified |
| Password reset | Secure time-limited reset token; silent response for non-existent addresses (prevents user enumeration) |

### Transport & Headers

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforce HTTPS (OWASP A02) |
| `Content-Security-Policy` | Restrictive default-src, frame-ancestors none | Prevent XSS and framing (OWASP A03) |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | camera, mic, geolocation, payment all denied | Restrict browser API access |
| `X-Requested-With` | `XMLHttpRequest` (sent by Axios) | CSRF mitigation signal |

### Rate Limiting

| Scope | Limit | Implementation |
|---|---|---|
| Auth endpoints (`/api/auth/**`) | 10 requests / minute / IP | Bucket4j token bucket |
| All other endpoints | 60 requests / minute / IP | Bucket4j token bucket |
| Cache | Bounded Caffeine (max 200K entries, 2-min idle eviction) | Prevents unbounded memory growth |

### Input Validation & Sanitisation

- All request bodies validated with Jakarta Bean Validation (`@Valid`) before reaching service layer
- HTML input sanitised via OWASP Java HTML Sanitizer before persistence
- SQL/NoSQL injection prevented through Spring Data MongoDB parameterised queries exclusively

### Secret Management

- All credentials injected via environment variables; no secrets committed to version control
- `application.yml` is gitignored; `application-test.yml` uses URL-encoded cloud credentials
- Repository history scanned for secrets on every push via Trivy

### Audit Logging

- AOP `@Around` advice intercepts all security-sensitive operations and emits structured log events
- Spring Boot Actuator exposes health, info, and metrics endpoints (metrics restricted to `ROLE_ADMIN`)

---

## CI/CD & Quality Gates

Four GitHub Actions workflows execute automatically on every push and pull request to `main`. All SARIF outputs are uploaded to **GitHub Security → Code scanning** for unified visibility.

### Workflow Summary

| Workflow | Trigger | Jobs |
|---|---|---|
| **CI — Build & Test** (`ci.yml`) | Push + PR to `main` | Backend: `mvn verify` (compile, 123 tests, JaCoCo coverage). Frontend: lint, `tsc --noEmit`, production build |
| **CodeQL** (`codeql.yml`) | Push + PR + weekly schedule | Static security analysis for Java and JavaScript using `security-extended` and `security-and-quality` query suites |
| **Security** (`security.yml`) | Push + PR + weekly schedule | OWASP Dependency Check (fail on CVSSv3 ≥ 7), npm audit (high/critical), Trivy repository secret scan, GitHub Dependency Review on PRs |
| **Code Quality** (`code-quality.yml`) | Push + PR to `main` | SpotBugs (max effort, medium threshold) + PMD static analysis |

### Required Secrets

The following repository secrets must be configured for all workflows to complete successfully:

| Secret | Required For |
|---|---|
| `JWT_SECRET` | Backend integration tests (CI) |
| `NVD_API_KEY` | OWASP Dependency Check NVD API (rate limit avoidance) |

---

## Deployment

The application is designed to be deployed to any environment that supports containerised workloads or Java/Node runtimes. Recommended production configuration:

| Component | Recommended Platform |
|---|---|
| Backend (Spring Boot JAR) | Railway, Render, Fly.io, AWS ECS, Azure App Service |
| Frontend (Next.js) | Vercel (recommended), Netlify, self-hosted with `next start` |
| MongoDB | MongoDB Atlas (M10+ for production) |
| Redis | Redis Cloud (30MB+ for token blacklist + cache) |

### Production Environment Variables

The following variables must be set in the production environment. No default values are safe for production use:

```
MONGODB_URI          — MongoDB Atlas connection string (with database name)
REDIS_HOST           — Redis Cloud hostname
REDIS_PORT           — Redis Cloud port
REDIS_PASSWORD       — Redis authentication password
JWT_SECRET           — Min 256-bit random secret (openssl rand -base64 64)
CORS_ORIGINS         — Comma-separated list of allowed frontend origins
FRONTEND_URL         — Public URL of the frontend (for email links)
MAIL_FROM            — Verified sender address
```

---

## Contributing

This is a proprietary project. External contributions are not accepted at this time.

Internal development workflow:

1. Create a feature branch from `main` (`git checkout -b feat/your-feature`)
2. Implement changes with accompanying tests
3. Ensure all quality gates pass locally:
   ```bash
   # Backend
   cd backend && mvn verify

   # Frontend
   cd frontend && npm run lint && npx tsc --noEmit && npm run build
   ```
4. Open a pull request against `main` — all four CI workflows must pass before merging
5. Squash-merge with a descriptive commit message

---

## License

Copyright © 2025 Rajesh Singh Kadyan. All rights reserved.

This software and its source code are proprietary and confidential. Unauthorised copying, distribution, modification, or use of this software, in whole or in part, is strictly prohibited without the express written consent of the copyright owner.
