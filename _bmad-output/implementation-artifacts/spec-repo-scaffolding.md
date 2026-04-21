---
title: 'Repo Scaffolding — TurboRepo Monorepo Setup'
type: 'chore'
created: '2026-04-21'
status: 'done'
baseline_commit: 'NO_VCS'
context:
  - '_bmad-output/planning-artifacts/toolkit-architecture.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The IELTS Teacher Toolkit has no codebase yet — only planning artifacts and forked reference code. Every subsequent feature (auth, grading, dashboard) is blocked until the monorepo structure, build tooling, and dev workflow are in place.

**Approach:** Create a TurboRepo + pnpm monorepo with four workspace packages (`apps/api`, `apps/web`, `packages/db`, `packages/types`, `packages/ui`). Wire up TypeScript, ESLint, Tailwind, Shadcn, Prisma client export, and Vite so that `pnpm dev` starts both API and web in parallel with hot reload.

## Boundaries & Constraints

**Always:**
- Follow architecture doc conventions: PascalCase components, camelCase functions, kebab-case URLs
- TypeScript strict mode in all packages
- Use pnpm workspaces + TurboRepo for orchestration
- `packages/db` exports Prisma client only — schema stays minimal (just enough to validate the setup)
- Git initialized on `main` branch

**Ask First:**
- Adding any runtime dependency not mentioned in the architecture doc
- Any deviation from the directory structure in the architecture doc

**Never:**
- Install Firebase, Inngest, Polar, Resend, or any dependency the architecture explicitly excludes from MVP
- Create application logic (auth, grading, etc.) — this is scaffolding only
- Copy forked ClassLite code into packages yet (that happens in feature specs)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fresh clone + install | `pnpm install` | All deps installed, no errors | N/A |
| Dev server startup | `pnpm dev` | API on :3001, Web on :5173, both hot-reload | N/A |
| Build all | `pnpm build` | All packages compile, zero TS errors | N/A |
| Lint all | `pnpm lint` | Passes with zero warnings on scaffolded code | N/A |
| Type check | `pnpm typecheck` | Zero errors across all workspaces | N/A |

</frozen-after-approval>

## Code Map

- `package.json` -- Root: pnpm workspace scripts (dev, build, lint, typecheck)
- `pnpm-workspace.yaml` -- Workspace package definitions
- `turbo.json` -- TurboRepo pipeline config (build, dev, lint, typecheck)
- `tsconfig.base.json` -- Shared TS compiler options (strict, paths)
- `.gitignore` -- Node, build artifacts, env files, IDE files
- `.env.example` -- Required env vars listed (no values)
- `apps/api/` -- Fastify entry point with health check route
- `apps/web/` -- React + Vite + Tailwind + Shadcn shell with router
- `packages/db/` -- Prisma schema (minimal) + client export
- `packages/types/` -- Shared Zod schemas barrel export
- `packages/ui/` -- Shadcn/UI component library setup

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.env.example` -- Create root monorepo config files
- [x] `packages/types/` -- Initialize shared types package with package.json, tsconfig, empty barrel export
- [x] `packages/db/` -- Initialize Prisma package: schema with a minimal Teacher model, client export, package.json
- [x] `packages/ui/` -- Initialize Shadcn/UI package: Tailwind config, cn() utility, Button component as proof-of-life
- [x] `apps/api/` -- Fastify app with Zod type provider, health check at GET /api/health, env config loader, package.json, tsconfig
- [x] `apps/web/` -- React + Vite app with Tailwind, Shadcn preset, React Router, AppShell layout placeholder, package.json, tsconfig, vite.config
- [x] Root-level verification -- Run `pnpm install && pnpm build && pnpm lint && pnpm typecheck` and fix any issues

**Acceptance Criteria:**
- Given a fresh clone, when `pnpm install && pnpm dev` is run, then API serves GET /api/health returning `{ status: "ok" }` on :3001 and Web shows a placeholder page on :5173
- Given `pnpm build` is run, then all packages compile with zero TypeScript errors
- Given `packages/types` is imported in both `apps/api` and `apps/web`, then types resolve without errors

## Verification

**Commands:**
- `pnpm install` -- expected: exits 0, no peer dep errors
- `pnpm build` -- expected: exits 0, all packages compiled
- `pnpm lint` -- expected: exits 0, no warnings
- `pnpm typecheck` -- expected: exits 0
- `curl http://localhost:3001/api/health` -- expected: `{"status":"ok"}`

## Suggested Review Order

**Monorepo orchestration**

- TurboRepo pipeline: build, dev, lint, typecheck task definitions
  [`turbo.json:1`](../../turbo.json#L1)

- pnpm workspace package discovery
  [`pnpm-workspace.yaml:1`](../../pnpm-workspace.yaml#L1)

- Root scripts + approved build deps for Prisma/esbuild
  [`package.json:1`](../../package.json#L1)

- Shared strict TS config inherited by all packages
  [`tsconfig.base.json:1`](../../tsconfig.base.json#L1)

**Backend (Fastify API)**

- App builder: CORS, Zod compiler, health check route
  [`app.ts:1`](../../apps/api/src/app.ts#L1)

- Server entry point with graceful error handling
  [`index.ts:1`](../../apps/api/src/index.ts#L1)

- Zod-validated env config with sensible defaults
  [`env.ts:1`](../../apps/api/src/config/env.ts#L1)

**Frontend (React + Vite)**

- Router setup with TanStack Query, imports cross-package Button
  [`App.tsx:1`](../../apps/web/src/App.tsx#L1)

- Sidebar + Outlet layout shell
  [`AppShell.tsx:1`](../../apps/web/src/components/layout/AppShell.tsx#L1)

- Vite config: alias, proxy to API, React plugin
  [`vite.config.ts:1`](../../apps/web/vite.config.ts#L1)

- Tailwind + Shadcn CSS variable theming
  [`tailwind.config.ts:1`](../../apps/web/tailwind.config.ts#L1)

**Shared packages**

- Prisma schema: minimal Teacher model with @@map convention
  [`schema.prisma:1`](../../packages/db/prisma/schema.prisma#L1)

- Singleton Prisma client with dev-mode query logging
  [`client.ts:1`](../../packages/db/src/client.ts#L1)

- Shadcn Button component (proof-of-life for UI package)
  [`button.tsx:1`](../../packages/ui/src/components/button.tsx#L1)

- cn() utility (clsx + tailwind-merge)
  [`utils.ts:1`](../../packages/ui/src/lib/utils.ts#L1)
