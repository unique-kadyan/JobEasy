<div align="center">

# Kaddy Auto-Apply

### AI-Powered Automated Job Application Platform

_Aggregate. Personalise. Apply. Track — all in one place._

[![CI — Build & Test](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/ci.yml/badge.svg)](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/ci.yml)
[![CodeQL](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/codeql.yml/badge.svg)](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/codeql.yml)
[![Security Scan](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/security.yml/badge.svg)](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/security.yml)
[![Code Quality](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/code-quality.yml/badge.svg)](https://github.com/rajeshsinghkadyan/auto_apply_with_kaddy/actions/workflows/code-quality.yml)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](#license)

**Live:** [kaddy-frontend.onrender.com](https://kaddy-frontend.onrender.com)

</div>

---

## Overview

**Kaddy Auto-Apply** is a production-grade, full-stack platform that automates the end-to-end job application workflow. It aggregates live job listings from multiple major boards, generates personalised cover letters using AI, submits applications on behalf of the user, and provides real-time analytics on application progress — all secured behind enterprise-grade authentication and rate-limiting infrastructure.

---

## Key Features

| Domain                    | Capabilities                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Authentication**        | JWT-based auth, OAuth2 (Google/LinkedIn), email verification, password reset, session management            |
| **Resume Management**     | PDF upload, AI-powered text extraction, ATS scoring, structured profile parsing, AI resume generation       |
| **Job Search**            | Multi-source job aggregation, AI-generated search keywords, salary and recency filters, match scoring       |
| **AI Cover Letters**      | Personalised cover letter generation with automatic failover, custom templates, inline editing              |
| **Career Path Analysis**  | AI-driven career progression analysis with role suggestions, checkpoints, and skill roadmaps (Gold+)        |
| **Mock Interview Prep**   | AI-generated role-specific interview questions with answer evaluation and session scoring (Gold+)            |
| **Resume Optimiser**      | AI-powered resume enhancement targeting specific job descriptions (Gold+)                                   |
| **Application Tracking**  | Full application lifecycle management, bulk apply, status history audit trail                               |
| **Auto Search Scheduler** | Background scheduled job search with AI-driven queries and automatic scoring (Platinum)                     |
| **Analytics**             | Application funnel metrics, activity timeline, breakdown by source and status                               |
| **Payments & Refunds**    | Subscription billing with a smart 7-day refund policy based on feature usage                                |
| **Security**              | OWASP-aligned security headers, rate limiting, input sanitisation, prompt injection protection              |

---

## Subscription Tiers

| Capability               | Free | Gold | Platinum  |
| ------------------------ | ---- | ---- | --------- |
| Job results per search   | 2    | 10   | Unlimited |
| Cover letters per day    | 3    | 25   | Unlimited |
| Resumes stored           | 2    | 10   | Unlimited |
| Smart resume generation  | —    | ✓    | ✓         |
| Career path analysis     | —    | ✓    | ✓         |
| Mock interview prep      | —    | ✓    | ✓         |
| Resume optimiser         | —    | ✓    | ✓         |
| Resume translator        | —    | ✓    | ✓         |
| Priority job scoring     | —    | ✓    | ✓         |
| Auto-apply               | —    | —    | ✓         |
| Scheduled auto-search    | —    | —    | ✓         |
| Smart refund (7-day)     | —    | ✓    | ✓         |

---

## Tech Stack

| Layer          | Technology                                          |
| -------------- | --------------------------------------------------- |
| Backend        | Java 25 LTS · Spring Boot 4.0.3 · Virtual Threads   |
| Frontend       | Next.js 16 · TypeScript · Tailwind CSS v4           |
| Database       | MongoDB Atlas                                       |
| Cache          | Redis 7                                             |
| Load Balancer  | Nginx                                               |
| CI/CD          | GitHub Actions                                      |
| Hosting        | Render                                              |

---

## Getting Started

### Prerequisites

- Java 25 LTS ([Eclipse Temurin](https://adoptium.net/) recommended)
- Node.js 20 LTS
- Docker Desktop (for Redis)

### Running Locally

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Configure environment (see Environment section below)

# 3. Start backend
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# 4. Start frontend
cd frontend
npm install
npm run dev
```

| Service         | URL                                   |
| --------------- | ------------------------------------- |
| Frontend        | http://localhost:3000                 |
| Backend API     | http://localhost:8080/api             |
| API Docs        | http://localhost:8080/swagger-ui.html |
| Health check    | http://localhost:8080/actuator/health |

### Running with Load Balancer

```bash
docker compose up -d
docker compose -f docker-compose.yml -f docker-compose.lb.yml up --scale api=3 -d
```

---

## Environment Configuration

All secrets are provided via environment variables — nothing is committed to source control.

### Backend

```bash
# Required
MONGODB_URI=<your-mongodb-atlas-uri>
JWT_SECRET=<random-secret>

# At least one AI provider key is required for AI features
# See application.yml for the full list of supported providers

# Email (optional)
RESEND_API_KEY=
BREVO_API_KEY=

# OAuth2 (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Payments (optional — dev mode works without keys)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

### Frontend

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

---

## Deployment

The project ships with a `render.yaml` Blueprint for one-click deployment on [Render](https://render.com).

1. Push the repository to GitHub.
2. Render dashboard → **New** → **Blueprint** → connect the repo.
3. Set the required environment variables when prompted.
4. After the first deploy, set `NEXT_PUBLIC_API_URL` on the frontend service to the backend URL + `/api`.

**Required variables on Render:**

| Variable              | Service  | Description                    |
| --------------------- | -------- | ------------------------------ |
| `MONGODB_URI`         | Backend  | MongoDB Atlas connection string |
| `CORS_ORIGINS`        | Backend  | Frontend URL                   |
| `FRONTEND_URL`        | Backend  | Frontend URL (for email links) |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend URL + `/api`           |

---

## Security

- HTTPS enforced with HSTS
- Stateless JWT authentication with Redis-backed token revocation
- Role-based access control with resource ownership enforcement
- Redis + Nginx dual-layer rate limiting
- Magic-byte file validation, path-traversal prevention
- OWASP-aligned security headers on all responses
- OWASP Dependency Check and Trivy container scanning in CI
- CodeQL static analysis on every PR

---

## CI/CD

| Workflow         | Trigger        | Checks                                              |
| ---------------- | -------------- | --------------------------------------------------- |
| Build & Test     | Every push     | Maven build, full test suite, Next.js lint + build  |
| CodeQL           | PRs + weekly   | Static security analysis                            |
| Security Scan    | PRs + weekly   | Dependency vulnerabilities, secrets, container scan |
| Code Quality     | PRs + weekly   | SpotBugs, PMD                                       |

---

## License

Proprietary — all rights reserved. See [LICENSE](LICENSE) for details.
