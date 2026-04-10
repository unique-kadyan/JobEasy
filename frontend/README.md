# Kaddy Auto-Apply — Frontend

Next.js 16 (App Router) · TypeScript 6 · Tailwind CSS 4 · React 19

This is the frontend for the [Kaddy Auto-Apply](../README.md) platform. See the root README for full architecture, API reference, and deployment instructions.

## Development

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Set `NEXT_PUBLIC_API_URL` in a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

## Available Scripts

| Script        | Description                              |
| ------------- | ---------------------------------------- |
| `npm run dev` | Start Next.js development server         |
| `npm run build` | Production build                       |
| `npm run start` | Start production server                |
| `npm run lint` | Run ESLint across `src/`               |

## Key Directories

| Path | Purpose |
| ---- | ------- |
| `src/app/(auth)/` | Login, signup, forgot-password, reset-password, verify-email |
| `src/app/(dashboard)/` | Dashboard, jobs, applications, resumes, cover-letters, profile, settings, smart-resume |
| `src/app/onboarding/` | 3-step onboarding wizard |
| `src/components/` | Shared UI components and feature-specific components |
| `src/hooks/` | Data-fetching hooks (TanStack Query) |
| `src/lib/api.ts` | Axios client with JWT interceptors |
| `src/lib/tier-features.ts` | Subscription tier feature gates |
| `src/store/` | Zustand stores (auth, theme) |
| `src/types/` | TypeScript interfaces |
| `src/proxy.ts` | Edge route protection (session-based redirects) |
