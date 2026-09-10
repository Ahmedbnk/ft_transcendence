# DevHub — Learn by Building, Reviewed by Seniors

A platform where **senior developers post real projects** and **juniors build them** in their own GitHub repos to get a full code review. Seniors get free dev work; juniors get real experience, feedback, and XP.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Demo Accounts](#demo-accounts)
7. [User Roles & Workflows](#user-roles--workflows)
8. [XP & Leaderboard System](#xp--leaderboard-system)
9. [Configuration](#configuration)
10. [Connecting a Real Backend](#connecting-a-real-backend)
11. [Troubleshooting](#troubleshooting)
12. [Roadmap](#roadmap)
13. [License](#license)

---

## Overview

DevHub simulates a realistic mentorship workflow:

    Senior posts project (PDF requirements + Discord channel + slots)
            |
            v
    Junior subscribes -> builds in own GitHub repo -> submits repo link
            |
            v
    Senior reviews code --> APPROVED (+XP, junior rates the review)
                        --> CHANGES REQUESTED (feedback, junior re-submits)

The current version is a **fully functional front-end demo** with a localStorage mock API. All data (users, projects, submissions, reviews, notifications) persists in the browser — no backend required to try it.

---

## Features

### General
- Authentication: register, login, session persistence (sessionStorage)
- Light / dark theme toggle (persisted)
- Fully responsive — mobile burger menu + drawer navigation
- In-app notification center with unread badge
- Toast notifications for every action
- Animated UI: rising hero, floating blob, confetti on approval, toast slides

### Juniors
- Browse & search projects, filter by open/full/subscribed
- Subscribe to a project (respects max slots)
- Submit a GitHub repo link for review
- Receive feedback; re-submit after changes are requested
- Earn XP; track progress toward the senior track (500 XP)
- Request senior promotion (requires a LinkedIn URL, approved by an admin)
- Rate the senior's review (1–5 stars + comment)

### Seniors
- Post projects with: title, description, PDF requirements upload, slot count, Discord invite
- Manage subscribers; view each junior's submitted repo
- Review submissions with a verdict: Approve or Request changes + written feedback
- Receive ratings from juniors; average rating shown on projects & leaderboard
- Earn XP when submissions are approved

### Admins
- Platform stats dashboard (users, projects, subscriptions, pending requests)
- Approve / reject senior promotion requests
- Force-promote juniors to seniors
- Reset all demo data

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19 |
| Build tool | Vite 7 |
| Styling | Plain CSS (custom properties, theming, animations) |
| State | React Context + hooks (no external state library) |
| Data | localStorage mock API (src/api.js) — swap-ready for a real backend |
| Fonts | Space Grotesk + JetBrains Mono (Google Fonts) |
| Linter | Oxlint |

---

## Project Structure

    devhub-react/
    ├── index.html              # HTML entry, loads Google Fonts
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx            # Root render, imports styles.css
        ├── App.jsx             # Header, routing, toasts, mobile drawer
        ├── store.jsx           # AppProvider: user, route, modal, theme context
        ├── api.js              # Mock API (localStorage) — the ONLY file to change for a real backend
        ├── styles.css          # Full stylesheet (design system)
        ├── ui.jsx              # Reusable components + modals (pills, stars, ProjectModal, ReviewModal…)
        └── views.jsx           # Page views (Landing, Login, Dash, Projects, Leaderboard, Profile, Admin…)

**Key principle:** views and components never touch localStorage directly — they only call functions from `api.js`. When the real backend exists, only `api.js` changes.

---

## Getting Started

### Prerequisites

- Node.js >= 18 — check with:

        node -v
        npm -v

### Install & run

    # 1. Install dependencies
    npm install

    # 2. Start the dev server
    npm run dev

Open the printed URL (usually `http://localhost:5173`).

### Production build

    npm run build      # outputs to dist/
    npm run preview    # serve the production build locally

### Disk-space note (school machines)

If your home directory is full (ENOSPC errors), move npm's cache elsewhere:

    npm config set cache /goinfre/$USER/.npm-cache
    rm -rf ~/.npm

---

## Demo Accounts

All demo accounts use the password: **demo1234**

| Role | Email | What they can do |
|---|---|---|
| Senior | senior@dev.io | Post projects, review submissions, get rated |
| Junior | junior@dev.io | Subscribe, build, submit repos, rate reviews |
| Admin | admin@dev.io | Approve senior requests, force-promote, reset data |

You can also register any new account (it starts as a junior).

---

## User Roles & Workflows

### Junior workflow

    Browse projects -> Subscribe -> (ask questions on the project's Discord)
    -> Build in your own GitHub repo -> Submit repo link
    -> Wait for review
       |- APPROVED -> +XP, rate the senior's review
       |- CHANGES REQUESTED -> read feedback -> fix -> re-submit

### Senior workflow

    Desk -> Post new project (title, description, PDF requirements, slots, Discord invite)
    -> Juniors subscribe -> Juniors submit repos
    -> Review each submission -> Approve (junior gains XP) or Request changes (with feedback)
    -> Receive star ratings from juniors

### Admin workflow

    Admin panel -> Review pending senior requests (approve / reject)
    -> Optionally force-promote juniors
    -> Reset demo data if needed

### Submission statuses

| Status | Meaning |
|---|---|
| working | Junior subscribed, building |
| submitted | Repo submitted, awaiting senior review |
| changes | Senior asked for changes; junior can re-submit |
| approved | Senior approved the work; XP awarded |

---

## XP & Leaderboard System

| Event | XP |
|---|---|
| Junior submission approved | XP_JUNIOR_APPROVED (see src/api.js constants) |
| Senior submission validated | XP_SENIOR_VALIDATED |

- Leaderboards rank juniors (by XP) and seniors (by XP + rating) with progress bars.
- Juniors reaching **500 XP** can request promotion to the senior track (LinkedIn required, admin-approved).
- Senior ratings come only from juniors whose submission the senior actually reviewed — one rating per submission.

---

## Configuration

### Theme

Toggle via the theme button in the header; persisted in localStorage (`devhub_theme`). All colors are CSS custom properties in `src/styles.css`:

    :root { --acc: #2E5BFF; --ok: #1E9E5A; }
    html.dark { --acc: #7B93FF; }

### Demo data

Seeded automatically on first load. To wipe everything and start fresh:

- UI: Admin panel -> Danger zone -> Reset demo data
- Console: `localStorage.clear()` then refresh

---

## Connecting a Real Backend

The app was designed around a microservices spec. Replace the mock in **`src/api.js`** with fetch calls — every function maps 1:1 to a service:

| api.js function | Backend endpoint |
|---|---|
| login, register, me | auth-service: POST /auth/login, /auth/register, GET /auth/me |
| updateMe, requestSenior | user-service |
| createProject, listProjects, subsOf | project-service (+ MinIO for PDFs -> return pdfUrl instead of base64) |
| subscribe, submitRepo, resubmit, sendReview | submission-service |
| submitRating, reviewsForSenior | review-service |
| myNotifs, clearNotifs | notification-service (later: WebSocket push) |

Example migration pattern:

    // before (mock)
    export async function login(email, pw) { /* localStorage logic */ }

    // after (real)
    export async function login(email, pw) {
      const r = await fetch(`${GATEWAY}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pw }),
      });
      if (!r.ok) throw new Error((await r.json()).message || 'Login failed');
      const { token, user } = await r.json();
      sessionStorage.setItem('token', token);
      return user;
    }

**No views or components need to change.**

### Suggested architecture (matches the spec)

    React SPA --> API Gateway --> auth-service (JWT)
                             --> user-service
                             --> project-service --> MinIO (PDF requirements)
                             --> submission-service --> PostgreSQL
                             --> review-service
                             --> notification-service (WebSocket)

---

## Troubleshooting

| Problem | Fix |
|---|---|
| ENOSPC: no space left on device | `npm config set cache /goinfre/$USER/.npm-cache && rm -rf ~/.npm` |
| Failed to resolve import "./styles.css" | The file doesn't exist in src/ — create it or rename index.css |
| Duplicated export 'SubDetailModal' | Delete the placeholder stub in ui.jsx; keep the full version |
| api is not defined | Add `import * as api from './api';` to the top of ui.jsx |
| Broken template literal errors in api.js | Restore `${...}` syntax — e.g. backtick strings with proper placeholders |
| Styles look unstyled/broken | Old template CSS (App.css, index.css) still loaded — delete it |
| Port already in use | `npm run dev -- --port 3000` |
| Session lost | Sessions use sessionStorage — they persist per-tab, not across tabs (demo behavior) |

---

## Roadmap

- [ ] Real backend (microservices + PostgreSQL + MinIO)
- [ ] GitHub OAuth — auto-verify repos and commit activity
- [ ] WebSocket notifications (live review alerts)
- [ ] In-app PDF viewer (no window.open)
- [ ] Discord webhook integration (post reviews to the project channel)
- [ ] Badges & achievement system on top of XP
- [ ] Junior profiles with public portfolio of approved projects

---

## License

MIT — free to use, modify, and distribute.

---

*Built as a learning-platform demo. Seniors post real work; juniors ship real code.*
