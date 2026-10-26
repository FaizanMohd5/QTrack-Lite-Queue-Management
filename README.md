# QTrack Lite

QTrack Lite is a single-shop digital queue. A customer opens a public link, enters a name and phone number, receives a token, and sees their place update automatically. The shop owner signs into a small dashboard to call the next customer.

The project is intentionally compact, but the queue mechanics are production-minded: daily token sequences, PostgreSQL transactions and row locks, database constraints, private customer lookup tokens, secure owner cookies, rate limiting, and structured logs.

## What is included

- Public customer page at `/q/habib-clinic`.
- Password-protected owner dashboard at `/dashboard`.
- Five-second polling with reduced work while a browser tab is hidden.
- Daily queue and token reset using the shop's timezone.
- Transaction-safe token allocation and queue advancement.
- Duplicate active-phone protection.
- Serving, waiting, completed, and no-show states.
- Idempotent development seed data.
- Structured request and domain-action logs.
- Docker Compose environment with PostgreSQL, API, and nginx-hosted React client.
- Unit tests and real-PostgreSQL concurrency tests.

## Stack

- React 19, Vite, TypeScript, React Router, Tailwind CSS
- Node.js 20, Express, TypeScript, Zod, Pino
- PostgreSQL 16, Prisma
- Vitest, Supertest-ready API test setup
- Docker Compose and nginx

## Quick start with Docker

Requirements: Docker Desktop with Compose support.

```bash
docker compose up --build
```

Wait until the server log says `QTrack API is listening`, then open:

- App home: <http://localhost:8080>
- Customer queue: <http://localhost:8080/q/habib-clinic>
- Owner dashboard: <http://localhost:8080/dashboard>
- API readiness: <http://localhost:3000/health/ready>

Development owner password:

```text
demo123456
```

The first startup applies migrations and seeds a shop named **Habib Clinic**. With `SEED_DEMO_QUEUE=true`, it also adds:

| Token | Customer | Initial status |
|---|---|---|
| #1 | Demo Patient 1 | Serving |
| #2 | Demo Patient 2 | Waiting |
| #3 | Demo Patient 3 | Waiting |

The seed is idempotent. Restarting the server updates shop configuration but does not delete or recreate a queue that already has entries.

Stop the stack without deleting data:

```bash
docker compose down
```

To deliberately delete the local PostgreSQL volume and begin with a fresh seed:

```bash
docker compose down -v
docker compose up --build
```

`down -v` permanently removes this project's local Docker database volume.

## Happy-path walkthrough

This walkthrough demonstrates the complete application without needing to know the code.

### 1. Start the application

Run:

```bash
docker compose up --build
```

Leave that terminal visible. It will show database migration, seed, request, and queue-action logs.

### 2. Open the customer queue

Visit <http://localhost:8080/q/habib-clinic>.

The summary initially shows token **#1** being served and two people waiting. Enter a new name and a phone number such as `98765 43210`, then select **Get my token**.

The customer receives token **#4** and sees how many active customers are ahead. The opaque lookup token is saved only in that browser's local storage, so refreshing the page restores the same view.

### 3. Open the owner dashboard

In a second browser window, visit <http://localhost:8080/dashboard> and sign in with:

```text
demo123456
```

The dashboard shows token #1 in the serving panel and the ordered waiting list below it.

### 4. Advance the queue

Select **Complete & call next**. Token #1 becomes completed and token #2 becomes serving.

Return to the customer page. Within five seconds its position decreases automatically. Continue advancing the queue to observe the customer move from `WAITING` to `SERVING` and finally to `DONE`.

### 5. Try a no-show

Select **No-show** beside a waiting entry, or **Mark current as no-show** in the serving panel. Confirm the action. The entry leaves the active queue; if it was the current entry, select **Call next** to serve the next waiting customer.

### 6. Inspect the logs

In another terminal, run:

```bash
docker compose logs -f migrate server
```

You will see compact JSON events similar to:

```json
{"event":"seed.shop_ready","slug":"habib-clinic","msg":"Demo shop is ready"}
{"event":"server.started","port":3000,"msg":"QTrack API is listening"}
{"req":{"method":"GET","url":"/api/v1/shops/habib-clinic/queue"},"res":{"statusCode":200},"responseTime":12}
{"event":"queue.entry_joined","shopId":"...","tokenNumber":4,"msg":"Customer joined queue"}
{"event":"owner.login_succeeded","shopId":"...","msg":"Owner signed in"}
{"event":"queue.advanced","nextTokenNumber":2,"msg":"Owner advanced queue"}
```

Passwords, session cookies, phone numbers, and customer lookup tokens are not logged. Each HTTP response also includes an `x-request-id` header that matches its request log.

## Local development without containerized app servers

Use Docker only for PostgreSQL while Vite and Express run directly on the host.

Requirements:

- Node.js 20 or newer
- npm 10 or newer
- Docker Desktop

PowerShell setup:

```powershell
Copy-Item .env.example server/.env
npm install
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

Bash setup:

```bash
cp .env.example server/.env
npm install
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

The development servers are:

- React/Vite: <http://localhost:5173>
- Express API: <http://localhost:3000>

Vite proxies `/api` and `/health` to Express, so cookies and API calls behave like the Docker environment. Both server and client restart automatically after source edits.

### Seed behavior

The seed reads these values from `server/.env`:

- `SHOP_SLUG`
- `SHOP_NAME`
- `SHOP_TIMEZONE`
- `OWNER_PASSWORD`
- `SEED_DEMO_QUEUE`

Set `SEED_DEMO_QUEUE=false` when only the shop configuration should be created. The plaintext `OWNER_PASSWORD` is used only by the seed command to produce a bcrypt hash; the database stores the hash.

## Runtime logs

Pino writes newline-delimited JSON to standard output. Container platforms can ingest it directly, and local developers can follow it with:

```bash
docker compose logs -f server
```

Important domain events:

| Event | Meaning |
|---|---|
| `seed.shop_ready` | Shop configuration was created or updated. |
| `seed.demo_queue_created` | Initial serving and waiting entries were added. |
| `seed.demo_queue_skipped` | Existing queue data was preserved. |
| `server.started` | Express is accepting requests. |
| `owner.login_succeeded` | The owner password was accepted. |
| `owner.login_failed` | A login attempt was rejected. |
| `queue.entry_joined` | A new customer token was committed. |
| `queue.advanced` | The serving customer was completed and the next was called. |
| `queue.entry_no_show` | An active entry was marked as a no-show. |
| `request.unhandled_error` | An unexpected API error occurred. |

Normal request-completion logs include request ID, method, URL, status code, and response time. Set `LOG_LEVEL=debug`, `info`, `warn`, or `error` as needed.

## Configuration

Copy `.env.example` to `server/.env` for host development. Docker Compose provides its own local defaults.

| Variable | Purpose | Development default |
|---|---|---|
| `NODE_ENV` | Runtime mode | `development` |
| `PORT` | Express port | `3000` |
| `DATABASE_URL` | PostgreSQL connection URL | Local Compose database |
| `FRONTEND_ORIGIN` | Allowed browser origin | `http://localhost:5173` |
| `SESSION_SECRET` | Signs owner session tokens; use 32+ random characters | Insecure local value |
| `SESSION_TTL_HOURS` | Owner session lifetime | `12` |
| `SHOP_SLUG` | Public URL slug | `habib-clinic` |
| `SHOP_NAME` | Display name | `Habib Clinic` |
| `SHOP_TIMEZONE` | IANA timezone used for daily queues | `Asia/Kolkata` |
| `OWNER_PASSWORD` | Seed-time owner password | `demo123456` |
| `SEED_DEMO_QUEUE` | Add sample entries when today's queue is empty | `true` |
| `LOG_LEVEL` | Minimum structured log level | `debug` |
| `TRUST_PROXY` | Trust one reverse proxy for client IP detection | `false` on host, `true` in Compose |

Never use the sample password or session secret in production.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Express and Vite in watch mode. |
| `npm run build` | Create production server and client builds. |
| `npm run start:production` | Apply migrations, seed shop configuration, and start the single-service production app. |
| `npm run typecheck` | Type-check both workspaces. |
| `npm run lint` | Lint both workspaces. |
| `npm test` | Run unit tests; DB tests remain skipped unless enabled. |
| `npm audit --omit=dev --omit=optional` | Audit the dependency set shipped in the API runtime. |
| `npm run db:migrate` | Create/apply a local Prisma migration. |
| `npm run db:seed` | Upsert the configured shop and optional demo queue. |
| `docker compose up --build` | Build and run the complete application. |
| `docker compose ps` | Show container and health status. |
| `docker compose logs -f migrate server` | Follow migrations, seed, request, and action logs. |

## Tests

Run fast unit tests:

```bash
npm test
```

The concurrency suite is deliberately executed against PostgreSQL rather than an in-memory substitute. Start the database and enable it explicitly.

PowerShell:

```powershell
docker compose up -d postgres
$env:RUN_DB_TESTS = "true"
$env:DATABASE_URL = "postgresql://qtrack:qtrack@localhost:5432/qtrack"
npm run test -w server
Remove-Item Env:RUN_DB_TESTS
```

Bash:

```bash
docker compose up -d postgres
RUN_DB_TESTS=true DATABASE_URL=postgresql://qtrack:qtrack@localhost:5432/qtrack npm run test -w server
```

The integration suite verifies that:

- five simultaneous joins receive tokens 1–5 exactly once;
- two owner advances based on the same observed queue state cannot both succeed.

Integration tests create a uniquely named shop and remove it afterward. They do not modify the seeded `habib-clinic` shop.

## API summary

All JSON API routes use the `/api/v1` prefix.

| Method | Route | Access | Purpose |
|---|---|---|---|
| `GET` | `/shops/:slug/queue` | Public | Shop and active queue summary. |
| `POST` | `/shops/:slug/queue/entries` | Public, rate-limited | Join today's queue. |
| `GET` | `/shops/:slug/queue/entries/:entryToken` | Public token | Read one customer's safe status. |
| `POST` | `/owner/session` | Public, rate-limited | Verify password and create owner cookie. |
| `DELETE` | `/owner/session` | Public | Clear owner cookie. |
| `GET` | `/owner/queue` | Owner | Read contact details and active queue. |
| `POST` | `/owner/queue/next` | Owner | Complete current entry and call the next. |
| `POST` | `/owner/queue/entries/:entryId/no-show` | Owner | Mark an active entry as no-show. |
| `GET` | `/health/live` | Public | Process liveness. |
| `GET` | `/health/ready` | Public | PostgreSQL readiness. |

API errors use a consistent envelope:

```json
{
  "error": {
    "code": "QUEUE_STATE_CHANGED",
    "message": "The queue changed before this action completed. Refresh and try again.",
    "requestId": "...",
    "details": null
  }
}
```

## How concurrency is handled

Joining and advancing lock the current `QueueDay` row with `SELECT ... FOR UPDATE`.

For a join:

1. PostgreSQL creates the daily row with `INSERT ... ON CONFLICT DO NOTHING`.
2. The transaction locks that row.
3. It rejects a duplicate active phone.
4. It increments the stored counter and inserts the entry.
5. Unique indexes remain the final guard against duplicate tokens and active phones.

For **Next**, the client sends the ID of the serving entry it currently sees. After obtaining the lock, the API confirms that the same entry is still serving. A concurrent retry based on stale state receives `409 QUEUE_STATE_CHANGED`, so it cannot skip another customer.

## Project structure

```text
.
├── client/                 React app, Tailwind styles, nginx image
│   └── src/
│       ├── api/            Typed fetch wrapper
│       ├── components/     Shared interface elements
│       ├── hooks/          Visibility-aware polling
│       ├── pages/          Home, customer queue, owner dashboard
│       └── utils/          Presentation helpers and tests
├── server/                 Express API and production image
│   ├── prisma/             Schema, migration, and seed entry point
│   ├── src/
│   │   ├── config/         Validated environment and logger
│   │   ├── middleware/     Authentication and error handling
│   │   ├── routes/         Public and owner HTTP routes
│   │   ├── services/       Transactional queue behavior
│   │   └── utils/          Date, phone, and token helpers
│   └── tests/              Unit and PostgreSQL integration tests
├── docker-compose.yml
└── .env.example
```

## Production checklist

Before a real deployment:

- Set `NODE_ENV=production`.
- Replace `SESSION_SECRET` with at least 32 random bytes.
- Replace the sample owner password and rerun the seed once.
- Set `SEED_DEMO_QUEUE=false`.
- Use a managed PostgreSQL connection with TLS and backups.
- Set `FRONTEND_ORIGIN` to the exact HTTPS frontend origin.
- Set `TRUST_PROXY` according to the hosting topology.
- Run `prisma migrate deploy` as a release step.
- Confirm `/health/ready` through the platform health check.
- Retain structured logs while applying an appropriate privacy and retention policy.

In production, Express serves the compiled React application and the `/api` routes from the same origin. Direct visits and refreshes on `/dashboard` and `/q/:shopSlug` fall back to the React entry point. Run `npm run build` before `npm run start:production`.

## Troubleshooting

### The owner password changed but login still uses the old password

Run the seed again so it updates the bcrypt hash:

```bash
npm run db:seed
```

For Docker, recreate the server after changing its environment:

```bash
docker compose up -d --build --force-recreate server
```

### A customer refresh does not restore their token

The raw customer lookup token lives in that browser's local storage. A private window, cleared site data, or a different device will not have it. The owner can still see the entry in the dashboard.

### Database is not ready

Check:

```bash
docker compose ps
docker compose logs postgres
docker compose logs server
```

The API waits for the PostgreSQL health check before applying migrations and starting.
