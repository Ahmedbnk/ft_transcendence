# DevHub Backend — Full Microservices Spec (5 devs: 2 NestJS, 3 Spring Boot + Postgres)

6 deployable units total: 1 API Gateway + 5 domain services. Database-per-service. Internal
sync REST for must-be-consistent checks, RabbitMQ events for everything else (XP, notifications).

Port plan (adjust as needed): Gateway `3000`, Auth `3001`, Notification `3002`,
Project `8081`, Submission `8082`, Review `8083`, each with its own Postgres on `5433–5437`,
RabbitMQ on `5672`, MinIO/S3 (PDF storage) on `9000`.

---

## DEV A — NestJS — `auth-service` (port 3001, db `auth_db`)

### Schema
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'junior', -- junior | senior | admin
  xp            INT NOT NULL DEFAULT 0,
  linkedin      VARCHAR(255),
  avatar_url    VARCHAR(255),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE senior_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  status      VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  linkedin    VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at  TIMESTAMPTZ,
  decided_by  UUID
);
```

### Public REST API
| Method | Path | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/auth/register` | `{name, email, password}` | `{user, accessToken, refreshToken}` | none |
| POST | `/auth/login` | `{email, password}` | `{user, accessToken, refreshToken}` | none |
| POST | `/auth/refresh` | `{refreshToken}` | `{accessToken, refreshToken}` | none |
| POST | `/auth/logout` | `{refreshToken}` | `204` | user |
| GET | `/users/me` | — | `User` | user |
| PATCH | `/users/me` | `{name?, linkedin?, avatarUrl?}` | `User` | user |
| GET | `/users/:id` | — | `PublicUser` (name, role, avatar, linkedin) | any |
| POST | `/users/me/senior-request` | `{linkedin}` | `SeniorRequest` | junior |
| GET | `/leaderboard/juniors` | `?limit=` | `[{user, xp, subCount, approvedCount}]` | any |
| GET | `/leaderboard/seniors` | `?limit=` | `[{user, xp, avgRating, ratingCount}]` | any |

### Admin-only
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/users` | filter `?role=` |
| GET | `/admin/senior-requests?status=pending` | |
| POST | `/admin/senior-requests/:id/approve` | sets `role=senior`, publishes `user.senior_approved` |
| POST | `/admin/senior-requests/:id/reject` | |

### Internal (service-key only, not exposed via gateway)
| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/internal/users/:id/xp` | `{amount, reason}` | add/subtract XP |
| GET | `/internal/users/:id` | — | `{id, name, role, avatarUrl}` lookup for other services |
| GET | `/internal/users/batch?ids=1,2,3` | — | bulk lookup, avoids N+1 calls from gateway aggregation |

### Events
- **Publishes:** `user.registered`, `user.senior_approved { userId }`
- **Consumes:**
  - `submission.approved { juniorId, seniorId }` → `+50 XP` junior, `+30 XP` senior
  - `rating.submitted { seniorId, stars }` → no XP change, just available for future use

---

## DEV B — NestJS — `gateway` (port 3000, no DB) + `notification-service` (port 3002, db `notif_db`)

### 3a. Gateway responsibilities (no persistence)
- Reverse-proxy `/api/*` → correct downstream service (config-driven map, e.g.
  `{ '/api/auth': 'http://auth-service:3001', '/api/projects': 'http://project-service:8081', ... }`)
- Verify JWT on every request (public key fetched/cached from Auth), attach `x-user-id`,
  `x-user-role` headers before forwarding
- CORS, global rate limiting (e.g. `@nestjs/throttler`), request logging/correlation ID
- **Aggregation endpoints** (the only place allowed to call 2+ services for one response):
  - `GET /api/projects/:id/full` → Project (details) + Submission (`/internal/submissions/project/:id/count`) + Auth (`/internal/users/:id` for senior name + rating summary from Review service)
  - `GET /api/dashboard` → whatever the logged-in user's home screen needs, merged

### 3b. Notification Service schema
```sql
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  text       VARCHAR(500) NOT NULL,
  kind       VARCHAR(10) NOT NULL DEFAULT 'acc', -- acc | ok | bad
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Notification REST + WS
| Method | Path | Notes |
|---|---|---|
| GET | `/notifications` | mine, paginated, newest first |
| PATCH | `/notifications/:id/read` | |
| DELETE | `/notifications` | clear all mine |
| WS | `/ws/notifications` (Socket.IO namespace, JWT in handshake) | server pushes `notification.new` event to the connected user's socket room |

### Internal
| Method | Path | Body |
|---|---|---|
| POST | `/internal/notifications` | `{userId, text, kind}` — fallback for direct calls if not using the event bus |

### Events consumed → each becomes a row + a `notification.new` websocket push
- `submission.subscribed` → notify the senior
- `submission.submitted` → notify the senior
- `submission.approved` / `submission.changes_requested` → notify the junior
- `rating.submitted` → notify the senior
- `senior_request.created` → notify all admins
- `user.senior_approved` → notify the promoted user

---

## DEV C — Spring Boot — `project-service` (port 8081, db `project_db`)

### Schema
```sql
CREATE TABLE projects (
  id            VARCHAR(10) PRIMARY KEY,       -- e.g. P-01
  senior_id     UUID NOT NULL,
  title         VARCHAR(150) NOT NULL,
  description   TEXT NOT NULL,
  slots         INT NOT NULL,
  discord_invite VARCHAR(255),
  pdf_name      VARCHAR(255),
  pdf_url       VARCHAR(500),                  -- points at S3/MinIO object
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### REST API
| Method | Path | Body/Params | Auth |
|---|---|---|---|
| POST | `/projects` | multipart: `title, description, slots, discordInvite, pdf` | senior |
| GET | `/projects` | `?open=true&senior=` | any |
| GET | `/projects/:id` | — | any |
| GET | `/projects/mine` | — | senior (own postings) |
| PATCH | `/projects/:id` | any subset of fields | owner senior |
| DELETE | `/projects/:id` | — | owner senior, only if 0 subscribers |
| GET | `/projects/:id/requirements` | — | any (redirects to signed PDF URL) |

### Internal
| Method | Path | Purpose |
|---|---|---|
| GET | `/internal/projects/:id` | Submission service validates project exists + gets `seniorId`/`slots` |

### Events
- **Consumes:** `submission.subscribed` / unsubscribed-equivalent → optional: keep a cached
  `filled_slots` counter column updated for fast list rendering (or just call Submission's
  internal count endpoint on read — simpler to start with, optimize later).

---

## DEV D — Spring Boot — `submission-service` (port 8082, db `submission_db`)

### Schema
```sql
CREATE TABLE submissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  VARCHAR(10) NOT NULL,
  junior_id   UUID NOT NULL,
  repo_url    VARCHAR(500),
  status      VARCHAR(20) NOT NULL DEFAULT 'working', -- working | submitted | approved | changes
  feedback    TEXT,
  rated       BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, junior_id)
);
```

### REST API
| Method | Path | Body | Auth |
|---|---|---|---|
| POST | `/submissions` | `{projectId}` | junior — calls Project's internal endpoint to check slots/existence first |
| GET | `/submissions/mine` | — | junior |
| GET | `/submissions/project/:projectId` | — | owner senior |
| GET | `/submissions/:id` | — | owner senior or submission's junior |
| PATCH | `/submissions/:id/repo` | `{repoUrl}` | junior, own submission → status `submitted` |
| POST | `/submissions/:id/resubmit` | — | junior, own submission after `changes` → status `submitted` |
| POST | `/submissions/:id/review` | `{verdict: approved\|changes, feedback}` | owner senior → status updates, `rated=false` reset |

### Internal
| Method | Path | Purpose |
|---|---|---|
| GET | `/internal/submissions/project/:projectId/count` | Project service / gateway slot display |

### Events
- **Publishes:** `submission.subscribed {projectId, juniorId, seniorId}`,
  `submission.submitted {projectId, juniorId, seniorId}`,
  `submission.approved {submissionId, projectId, juniorId, seniorId}`,
  `submission.changes_requested {submissionId, projectId, juniorId, seniorId, feedback}`

---

## DEV E — Spring Boot — `review-service` (port 8083, db `review_db`)

The junior's *star rating on the senior's review*, separate from the approve/reject verdict
(that lives in Submission service).

### Schema
```sql
CREATE TABLE senior_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id     UUID NOT NULL,
  junior_id     UUID NOT NULL,
  project_id    VARCHAR(10) NOT NULL,
  submission_id UUID NOT NULL UNIQUE,   -- one rating per submission
  stars         SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### REST API
| Method | Path | Body | Auth |
|---|---|---|---|
| POST | `/reviews` | `{submissionId, stars, comment}` | junior, only for their own approved/changes submission, only once |
| GET | `/reviews/senior/:seniorId` | paginated | any (senior's profile page) |
| GET | `/reviews/senior/:seniorId/summary` | — | any → `{avg, count}` for badges/leaderboard |

### Events
- **Publishes:** `rating.submitted {seniorId, juniorId, submissionId, stars}`
- **Consumes:** `submission.approved` / `submission.changes_requested` — to know a submission
  is now eligible to be rated (or just check via internal call to Submission service at rating time)

---

## Cross-cutting checklist (all 5 devs)

- [ ] JWT: Auth signs RS256, publishes its public key at `GET /auth/.well-known/jwks.json` —
      every other service (and the gateway) verifies locally, no per-request call to Auth.
- [ ] Internal routes (`/internal/*`) require a shared `X-Service-Key` header, **never** routed
      by the gateway — only reachable service-to-service on the docker network.
- [ ] RabbitMQ: one topic exchange `devhub.events`; each service declares its own queue bound
      to the routing keys it consumes (e.g. `notification-service` binds to `submission.*`,
      `rating.submitted`, `senior_request.*`, `user.senior_approved`).
- [ ] Each service ships its own `Dockerfile` + `.env.example`; root `docker-compose.yml` wires
      up gateway + 5 services + 5 Postgres + RabbitMQ + MinIO.
- [ ] Agree an OpenAPI file per service in `docs/api/<service>.yaml` before coding starts, so
      Node and Java devs aren't blocked on each other's exact response shape.
- [ ] HTTPS termination at the gateway (or a reverse proxy in front of it); internal traffic
      between services can stay plain HTTP inside the docker network.

## Suggested repo layout
```
devhub/
  docker-compose.yml
  gateway/                 (Dev B, NestJS)
  services/
    auth-service/           (Dev A, NestJS)
    notification-service/   (Dev B, NestJS)
    project-service/         (Dev C, Spring Boot)
    submission-service/      (Dev D, Spring Boot)
    review-service/          (Dev E, Spring Boot)
  docs/
    api/
      auth-service.yaml
      notification-service.yaml
      project-service.yaml
      submission-service.yaml
      review-service.yaml
```
