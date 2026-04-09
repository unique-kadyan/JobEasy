# JobEasy — Automated Job Application Platform

> Apply smarter. Track everything. Land faster.

JobEasy is a full-stack AI-powered job application platform that aggregates listings from multiple job boards, generates tailored cover letters using large language models, and lets users apply with a single click — all while tracking every application in one place.

---

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [API Reference](#api-reference)
- [AI Providers](#ai-providers)
- [Job Sources](#job-sources)
- [CI/CD & Quality Gates](#cicd--quality-gates)
- [Security](#security)
- [License](#license)

---

## Features

| Category | Capabilities |
|---|---|
| **Auth** | JWT + refresh tokens, Google/LinkedIn OAuth2, email verification, password reset |
| **Resume** | PDF upload, AI-powered parsing, ATS score analysis, AI resume generation |
| **Job Search** | Multi-source aggregation (JSearch, SerpAPI, Adzuna, CareerJet), full-text search, filters |
| **Cover Letters** | AI generation with 10+ provider support, custom templates, manual editing |
| **Apply** | One-click apply, bulk apply, application status tracking, Kanban board |
| **Analytics** | Application funnel, success rate by source/status, weekly activity timeline |
| **Payments** | Razorpay integration for premium subscription tiers |
| **Security** | Rate limiting (Bucket4j), AOP security audit logging, OWASP dependency scanning |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 14)                │
│   App Router · TypeScript · Tailwind · Zustand · React Query│
└─────────────────────────┬───────────────────────────────────┘
                          │  REST / JSON (port 3000 → 8080)
┌─────────────────────────▼───────────────────────────────────┐
│                   Backend (Spring Boot 3.3)                  │
│  Security  │  Controllers  │  Services  │  Repositories      │
│            │               │  ┌────────────────────────┐    │
│  JWT Auth  │  REST API     │  │  AI Provider Factory   │    │
│  OAuth2    │  Rate Limit   │  │  (10+ LLM providers)   │    │
│  AOP Audit │  Validation   │  └────────────────────────┘    │
│            │               │  ┌────────────────────────┐    │
│            │               │  │  Scraper Orchestrator  │    │
│            │               │  │  (4 job board clients) │    │
│            │               │  └────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                ┌─────────▼─────────┐
                │     MongoDB 7      │
                └───────────────────┘
```

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | Spring Boot 3.3.6, Java 21 (LTS) |
| Database | MongoDB 7 (Spring Data MongoDB), Redis 7 (caching + token blacklist) |
| Security | Spring Security, JWT (JJWT), OAuth2 Client |
| HTTP Client | Spring WebFlux (WebClient) |
| AI | Claude, OpenAI, Gemini, Groq, Mistral, Cerebras, Together AI, Novita AI, SambaNova |
| Job APIs | JSearch (RapidAPI), SerpAPI, Adzuna, CareerJet |
| Resilience | Resilience4j (circuit breaker, retry, rate limiter) |
| Rate Limiting | Bucket4j |
| PDF | Apache PDFBox |
| Monitoring | Spring Boot Actuator |
| Build | Maven |

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS |
| State | Zustand, TanStack React Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |

### Infrastructure
| Concern | Tool |
|---|---|
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Static Analysis | CodeQL, SpotBugs, PMD |
| Security Scanning | OWASP Dependency Check, Trivy, npm audit |

---

## Project Structure

```
auto_apply_with_kaddy/
├── backend/
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/kaddy/autoapply/
│       │   ├── config/               # SecurityConfig, CorsConfig, AiConfig, AOP
│       │   ├── controller/           # Auth, User, Resume, Job, CoverLetter,
│       │   │                         # Application, Analytics, Payment, Template
│       │   ├── dto/                  # Request + Response DTOs
│       │   ├── exception/            # GlobalExceptionHandler + custom exceptions
│       │   ├── model/                # MongoDB documents + enums
│       │   ├── repository/           # Spring Data MongoDB repositories
│       │   ├── security/             # JwtTokenProvider, JwtAuthenticationFilter,
│       │   │                         # OAuth2 success handler, RateLimitFilter
│       │   └── service/
│       │       ├── ai/               # AiProvider interface + 10 implementations
│       │       ├── scraper/          # ScraperOrchestrator + 4 job board clients
│       │       └── *.java            # Business logic services
│       └── main/resources/
│           └── META-INF/
│               └── additional-spring-configuration-metadata.json
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (auth)/               # /login, /signup
│       │   └── (dashboard)/          # /dashboard, /jobs, /applications,
│       │                             # /resumes, /cover-letters, /settings
│       ├── components/               # ui/, layout/, jobs/, applications/,
│       │                             # cover-letters/, resumes/, dashboard/
│       ├── hooks/                    # useAuth, useJobs, useApplications,
│       │                             # useCoverLetters
│       ├── lib/                      # api.ts, auth.ts, utils.ts
│       ├── store/                    # Zustand auth + job stores
│       └── types/                    # TypeScript interfaces
├── .github/workflows/
│   ├── ci.yml                        # Build & test (backend + frontend)
│   ├── codeql.yml                    # Static security analysis
│   ├── security.yml                  # OWASP, Trivy, npm audit
│   └── code-quality.yml              # SpotBugs + PMD
└── docker-compose.yml                # MongoDB
```

---

## Getting Started

### Prerequisites

| Requirement | Version |
|---|---|
| Java (JDK) | 21+ (LTS) |
| Maven | 3.9+ |
| Node.js | 20+ |
| Docker & Docker Compose | Latest |

### Environment Variables

Create `backend/src/main/resources/application.yml` (this file is gitignored — never commit it):

```yaml
spring:
  data:
    mongodb:
      uri: ${MONGODB_URI:mongodb://localhost:27017/kaddy_dev}

app:
  jwt:
    secret: <your-256-bit-secret>
    expiration-ms: 86400000
    refresh-expiration-ms: 604800000

  ai:
    claude:
      api-key: <anthropic-api-key>
    openai:
      api-key: <openai-api-key>
    gemini:
      api-key: <google-ai-api-key>
    # ... other providers

  job-apis:
    jsearch:
      api-key: <rapidapi-key>
    serpapi:
      api-key: <serpapi-key>
    adzuna:
      app-id: <adzuna-app-id>
      api-key: <adzuna-api-key>

  payment:
    razorpay:
      key-id: <razorpay-key-id>
      key-secret: <razorpay-key-secret>

  email:
    from: noreply@jobeasy.app

spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: <google-client-id>
            client-secret: <google-client-secret>
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Running Locally

**1. Start MongoDB and Redis**
```bash
docker-compose up -d
```

**2. Start the backend**
```bash
cd backend
mvn spring-boot:run
# API available at http://localhost:8080
# Actuator health: http://localhost:8080/actuator/health
```

**3. Start the frontend**
```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:3000
```

**4. Verify the setup**

```bash
# Health check
curl http://localhost:8080/actuator/health

# Sign up
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Password123!"}'
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Login, returns JWT + refresh token |
| `POST` | `/api/auth/logout` | Invalidate the current access token |
| `POST` | `/api/auth/refresh` | Exchange refresh token for new JWT |
| `GET` | `/api/auth/me` | Get current authenticated user |

### Jobs
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/jobs/search` | Search jobs (`?q=&location=&page=&size=`) |
| `GET` | `/api/jobs/{id}` | Get job details |

### Resumes
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/resumes/upload` | Upload PDF resume |
| `GET` | `/api/resumes` | List user resumes |
| `GET` | `/api/resumes/{id}/analysis` | Get ATS analysis for a resume |
| `POST` | `/api/resumes/generate` | AI-generated resume from profile |

### Cover Letters
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/cover-letters/generate` | Generate AI cover letter for a job |
| `GET` | `/api/cover-letters` | List user's cover letters |
| `PUT` | `/api/cover-letters/{id}` | Update cover letter content |

### Templates
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/templates` | List system + user templates |
| `POST` | `/api/templates` | Create custom template |
| `PUT` | `/api/templates/{id}` | Update template |
| `DELETE` | `/api/templates/{id}` | Delete template |

### Applications
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/applications` | Create application |
| `POST` | `/api/applications/bulk-apply` | Bulk apply to multiple jobs |
| `GET` | `/api/applications` | List user applications |
| `PUT` | `/api/applications/{id}/status` | Update application status |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/summary` | Overall stats |
| `GET` | `/api/analytics/timeline` | Application activity over time |
| `GET` | `/api/analytics/by-source` | Breakdown by job board |
| `GET` | `/api/analytics/by-status` | Breakdown by status |

---

## AI Providers

JobEasy supports 10 AI providers through a unified `AiProvider` interface. Configure your preferred provider in `application.yml`:

| Provider | Model Example |
|---|---|
| Anthropic Claude | `claude-3-5-sonnet-20241022` |
| OpenAI | `gpt-4o` |
| Google Gemini | `gemini-1.5-pro` |
| Groq | `llama-3.3-70b-versatile` |
| Mistral | `mistral-large-latest` |
| Cerebras | `llama-3.3-70b` |
| Together AI | `meta-llama/Llama-3-70b-chat-hf` |
| SambaNova | `Meta-Llama-3.3-70B-Instruct` |
| Novita AI | `meta-llama/llama-3.3-70b-instruct` |
| OpenAI-compatible | Any OpenAI-compatible endpoint |

The `AiProviderFactory` selects the provider based on the user's preference with automatic failover if the primary provider is unavailable.

---

## Job Sources

| Source | API | Notes |
|---|---|---|
| JSearch (RapidAPI) | `jsearch.p.rapidapi.com` | Aggregates Indeed + LinkedIn |
| SerpAPI | `serpapi.com` | Google Jobs results |
| Adzuna | `api.adzuna.com` | UK/US/AU job boards |
| CareerJet | `public.api.careerjet.com` | Global job aggregator |

The `ScraperOrchestrator` runs all configured scrapers in parallel, deduplicates results, and caches them in MongoDB with a 1-hour TTL.

---

## CI/CD & Quality Gates

Four GitHub Actions workflows run on every push and pull request to `main`:

| Workflow | Checks |
|---|---|
| **CI** (`ci.yml`) | Backend: `mvn verify` (compile + test + coverage). Frontend: lint, type check, build |
| **CodeQL** (`codeql.yml`) | Static security analysis for Java and JavaScript. Runs `security-extended,security-and-quality` queries. Also scheduled weekly |
| **Security** (`security.yml`) | OWASP Dependency Check (fails on CVSSv3 ≥ 7), npm audit (high/critical), Trivy secret scan, dependency review on PRs |
| **Code Quality** (`code-quality.yml`) | SpotBugs (Max effort, Medium threshold) + PMD analysis |

All SARIF results are uploaded to **GitHub Security → Code scanning** for unified visibility.

---

## Security

- **Authentication**: Stateless JWT with short-lived access tokens (24h) and long-lived refresh tokens (7d)
- **Authorization**: Method-level `@PreAuthorize` guards + Spring Security filter chain
- **Rate Limiting**: Bucket4j per-IP rate limits (10 req/min on auth endpoints, 60 req/min general)
- **Audit Logging**: AOP `@Around` advice logs all security-sensitive operations
- **Input Validation**: `@Valid` Bean Validation on all request bodies + `Optional`-guarded mandatory fields
- **Secret Management**: All credentials are environment-variable injected; `application.yml` is gitignored and never committed
- **Dependency Scanning**: OWASP Dependency Check runs on every push and weekly
- **Secret Scanning**: Trivy scans the full repository history for leaked secrets on every push

---

## License

This project is proprietary software. All rights reserved.

Copyright © 2025 Rajesh Singh Kadyan
