# Deferred Work

## Deferred from: code review of 1-1-initialize-monorepo-and-deploy-backend-skeleton (2026-04-22)

- **W1:** Migration not idempotent — `createTable` without `ifNotExists`. kysely-ctl tracks migration state so this is safe for now, but consider adding guards for resilience.
- **W2:** DATABASE_URL validated only as `z.string()` — a malformed URL passes env validation but fails at first pool connection. Low impact (fails fast at startup).
- **W3:** DECIMAL(2,1) not used for individual band score columns — JSONB stores full BandScores object. If per-criteria columns are added later, use DECIMAL(2,1).
- **W4:** No separate 30/hr grading rate limit — only global 200/hr configured. Per-route 30/hr grading tier deferred to Story 3.1 when POST /grade is implemented.
