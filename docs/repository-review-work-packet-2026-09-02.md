# CPM Repository Review and Work Packet

**Review date:** 2026-09-02 (Asia/Manila)  
**Reviewed revision:** `ebb590e` on `fix/cto-security-audit-remediation`  
**Scope:** Architecture, requirements alignment, security and correctness review, database/deployment consistency, and local quality gates. No application code was changed as part of this review.

## 1. Executive assessment

The repository contains a coherent, compact full-stack implementation of the CPM catering-order workflow. The main architecture is easy to follow: one Next.js application owns the React interface, HTTP route handlers, authentication, database access, filesystem storage, and raw PDF generation. Order creation and most state changes use PostgreSQL transactions, authentication is enforced centrally by the Next.js proxy, and recent work deliberately opened authenticated order read/download access across the organization while retaining owner/admin checks on edits and most state transitions.

The application is not ready to call production-complete. The largest risks are financial integrity, default production credentials, lifecycle enforcement, stale invoice artifacts, missing automated tests, and deployment drift. The current TypeScript check passes, but lint fails with 107 errors and 44 warnings. The documented QA strategy describes unit, integration, end-to-end, and performance tests, while the repository contains zero test files and no test command. Several requirements are enforced only in the browser, which means direct API callers can bypass them.

### Current readiness snapshot

| Area | Assessment | Main evidence |
| --- | --- | --- |
| Architecture clarity | Good | Clear App Router/API/database boundaries and a single shared schema |
| Type safety | Mixed | `tsc --noEmit` passes, but 81 explicit-`any` lint violations weaken the practical benefit |
| Functional correctness | At risk | Server trusts submitted rates; payment can skip required states; approved orders remain editable by admins |
| Security | At risk | Seed creates predictable `admin123`/`user123` accounts; rate limits are process-local |
| Data integrity | Mixed | Transactional aggregate writes and foreign keys exist, but documented check constraints and audit immutability do not |
| Testability | Poor | No unit, integration, or E2E tests; business logic is embedded in route handlers and large components |
| Deployment | At risk | Compose/docs disagree, SSL configuration is not propagated, and runtime migrations depend on files not copied by the image |
| Documentation | Useful but stale | Strong requirements coverage, with multiple implementation and path inconsistencies |

## 2. Architecture

### 2.1 Runtime topology

```text
Browser
  |
  | React client components, fetch(), cookie session
  v
Next.js 16 App Router application
  |-- src/proxy.ts: authenticates /api/* and protected file paths
  |-- src/app/api/**/route.ts: application/use-case layer (28 route files)
  |-- src/lib/auth*.ts: scrypt credentials and AES-GCM session envelope
  |-- src/lib/db/*.ts: Drizzle schema, pool, migration, seed
  |-- src/lib/pdf.ts: synchronous raw PDF assembly (1,110 lines)
  |-- src/lib/storage.ts: local attachment filesystem driver
  v
PostgreSQL + mounted ./storage directory
```

This is a modular monolith. There is no separate service layer: validation, authorization, state-machine decisions, pricing, persistence, and response formatting largely live inside route handlers. There is also no repository abstraction over Drizzle. This keeps the project small, but duplicates business rules between create/update routes and makes isolated testing difficult.

### 2.2 Presentation layer

- [`src/app/page.tsx`](../src/app/page.tsx) is the authenticated dashboard shell and coordinates session checks, data loading, filters, pagination, login/logout, modals, and the active tab.
- [`src/components/`](../src/components) contains order tables/KPIs, booking and client modals, catalog/client managers, and order detail views.
- [`src/app/orders/`](../src/app/orders) provides the dedicated order view/edit page.
- [`src/types.ts`](../src/types.ts) defines browser-facing DTO-like interfaces, but many components still opt out with `any`.

The three largest implementation files are the order view client (1,722 lines), booking wizard (1,172 lines), and PDF module (1,110 lines). These are change hotspots with multiple responsibilities.

### 2.3 API/application layer

The 28 route files fall into four groups:

- Authentication: login, logout, current session.
- Catalogs and clients: shared reads; admin-only item/menu/venue mutation; authenticated client mutation.
- Orders: list/create/read/update, seven lifecycle action endpoints, reports, and PDFs.
- Attachments: list/upload/download and admin approval.

The proxy decrypts the `token` cookie and overwrites `x-user-id`, `x-username`, and `x-role` before protected route handlers run. Read access to all orders, invoices, kitchen PDFs, reports, and attachments is intentionally organization-wide as of `ebb590e`; mutation rules remain a mixture of owner-only, owner-or-admin, and admin-only.

### 2.4 Domain and persistence model

[`src/lib/db/schema.ts`](../src/lib/db/schema.ts) models:

- Users and roles (`USER`, `ADMIN`).
- Clients and optional offices.
- Venues and service types.
- Menu packages, menu items, and package-item joins.
- Orders, unique order dates, meal periods, and custom meal-period items.
- Status catalog, order history, and uploaded attachments.

The central aggregate is `orders -> orderDays -> mealPeriods -> mealPeriodItems`. Create and update rewrite this aggregate inside a database transaction. Status changes update the order and append history inside transactions. Prices are frozen in `cpm_meal_periods.rate`, and the order stores a denormalized `grand_total`.

### 2.5 Cross-cutting behavior

- Authentication uses asynchronous scrypt password hashing and an encrypted AES-GCM cookie payload with a 12-hour timestamp check.
- Database access uses a module-level `pg.Pool` and Drizzle ORM.
- Startup instrumentation applies migrations and performs additional ad hoc status normalization.
- Attachments and approved-order PDFs use synchronous local filesystem I/O under `storage/`.
- Reports and PDFs are generated with handwritten PDF syntax and built-in Helvetica fonts, without a PDF dependency.

## 3. Confirmed findings

### P0 — address before any production deployment

#### P0-1: The seed command creates predictable privileged credentials

[`src/lib/db/seed.ts:296`](../src/lib/db/seed.ts#L296) hashes literal `user123` and `admin123`, then creates `user` and `admin` if absent. [`README.md:27`](../README.md#L27) tells operators to run the seed command without warning that it creates these accounts.

**Impact:** A newly deployed or restored environment has a known administrator password unless an operator notices and changes it through an out-of-band database operation; the application has no password-change workflow.

**Root cause:** Demo fixtures and deployment bootstrap share one seed path.

**Required outcome:** Production seeding must never create a known credential. Separate catalog/demo seeds, require injected bootstrap credentials, and fail closed when a secure admin bootstrap mechanism is absent.

#### P0-2: Financial totals are recalculated from untrusted client-supplied rates

The browser sends each meal's `rate` ([`BookingWizardModal.tsx:417`](../src/components/BookingWizardModal.tsx#L417)). The create handler validates only that it is non-negative, sums it, and persists it ([`orders/route.ts:362`](../src/app/api/orders/route.ts#L362), [`orders/route.ts:396`](../src/app/api/orders/route.ts#L396), [`orders/route.ts:432`](../src/app/api/orders/route.ts#L432)). The update handler repeats the same pattern ([`orders/[id]/route.ts:260`](../src/app/api/orders/%5Bid%5D/route.ts#L260), [`orders/[id]/route.ts:294`](../src/app/api/orders/%5Bid%5D/route.ts#L294)).

An authenticated caller can submit a catalog menu with an arbitrary rate, or submit item IDs and an arbitrary custom rate. This violates FR-3.4 and FR-4.3/4.4, which require the server to freeze the catalog rate or sum authoritative item prices.

**Impact:** Underbilling, overbilling, incorrect invoices, and unreliable sales KPIs.

**Root cause:** Calculation happens in UI state, while the server treats the derived field as source data.

**Required outcome:** Resolve menu/item records in the transaction, derive every persisted rate server-side, reject inactive/missing references, use decimal-safe arithmetic, and test tampered payloads.

### P1 — high-priority correctness and operational risks

#### P1-1: The payment endpoint bypasses the documented state machine

[`pay/route.ts:44`](../src/app/api/orders/%5Bid%5D/pay/route.ts#L44) accepts `COMPLETED`, `APPROVED`, or `DELIVERED`, although FR-6 and US-5.5 permit only `COMPLETED -> PAID`.

**Impact:** An admin can close an order before delivery or signed-receipt completion, invalidating operational and financial audit semantics.

**Required outcome:** Permit only `COMPLETED`, with a route-level integration test for every disallowed source state.

#### P1-2: Approved invoices can become stale and approval can report a PDF that was not generated

Admins may edit `PENDING_APPROVAL` and `APPROVED` orders because the admin lock list excludes both ([`orders/[id]/route.ts:138`](../src/app/api/orders/%5Bid%5D/route.ts#L138)). That update replaces all line items but neither invalidates nor regenerates the stored invoice. The PDF endpoint serves an existing `invoice_<id>.pdf` without checking order revision ([`pdf/route.ts:66`](../src/app/api/orders/%5Bid%5D/pdf/route.ts#L66)).

The approval route commits `pdf_generated_flag = true` before writing the file, then generates after the transaction ([`approve/route.ts:93`](../src/app/api/orders/%5Bid%5D/approve/route.ts#L93), [`approve/route.ts:118`](../src/app/api/orders/%5Bid%5D/approve/route.ts#L118)). A filesystem failure therefore leaves the database claiming success. Direct admin creation with `initialStatus: APPROVED` does not generate or flag an invoice at all ([`orders/route.ts:336`](../src/app/api/orders/route.ts#L336)).

**Impact:** Downloaded invoices can disagree with the database; approval state can be committed without its required artifact.

**Required outcome:** Enforce the documented lock/return workflow, model PDF generation as a consistent post-commit job/state, and version or invalidate PDFs when invoice-relevant data changes.

#### P1-3: Lifecycle updates are vulnerable to concurrent stale-state transitions

Each action reads the status before opening a transaction, then updates by `order.id` only. For example, submit reads at [`submit/route.ts:32`](../src/app/api/orders/%5Bid%5D/submit/route.ts#L32) and unconditionally updates at [`submit/route.ts:70`](../src/app/api/orders/%5Bid%5D/submit/route.ts#L70). The same structure is repeated across approve, return, cancel, deliver, complete, and pay.

**Impact:** Two simultaneous actions can both validate the same old status, overwrite one another, and append contradictory history entries.

**Required outcome:** Make transitions compare-and-set (`WHERE id = ? AND status_id = ?`) in one transaction, require exactly one updated row, and cover competing transitions with an integration test.

#### P1-4: The documented database integrity layer is missing

The requirements claim database check constraints and immutable history. The seven migrations create foreign keys, one order-day uniqueness constraint, and indexes, but no checks for roles, client types, positive pax/rates/capacity, attachment types, or order statuses; no trigger or privilege rule blocks update/delete on `cpm_order_history`.

**Impact:** Bugs, scripts, or direct database access can create states the application assumes are impossible. Audit records are not immutable at the database level.

**Required outcome:** Add forward-only migrations for checks and audit immutability after a data-cleanup/preflight query. Mirror constraints in Drizzle schema where supported.

#### P1-5: Container deployment does not match its documented or runtime requirements

- [`README.md:43`](../README.md#L43) says Compose starts PostgreSQL and the app; [`docker-compose.yml`](../docker-compose.yml) defines only the app and requires a pre-existing external network.
- `.env.example` defines `DB_SSL=true`, but Compose does not pass `DB_SSL`, so the app pool silently uses no TLS ([`db.ts:18`](../src/lib/db/db.ts#L18)).
- Startup instrumentation loads SQL migrations from `<cwd>/drizzle` ([`instrumentation.ts:19`](../src/instrumentation.ts#L19)), while the final Docker stage copies only `public`, `.next/standalone`, and `.next/static` ([`Dockerfile:32`](../Dockerfile#L32)). The `drizzle/` migration directory is not explicitly copied.
- [`migrate.ts:7`](../src/lib/db/migrate.ts#L7) has a built-in database credential fallback, ignores `DB_SSL`, and differs from the application pool.
- The startup ad hoc legacy-status migration compares bigint IDs with `text[]` (`ANY($2::text[])`) at [`instrumentation.ts:55`](../src/instrumentation.ts#L55), which will fail when legacy rows actually exist.

**Impact:** First startup can fail or skip required security settings; the quick-start deployment is not reproducible as described.

**Required outcome:** Choose and document one topology, copy migrations into the runner or run them as a separate release step, remove credential fallbacks, propagate SSL settings consistently, and smoke-test a clean image against a clean database.

#### P1-6: There is no automated regression safety net and lint is red

The repository has zero `*.test.*`/`*.spec.*` files and no `test` script. `npm run lint` reports 107 errors and 44 warnings across 38 files:

- 81 `no-explicit-any`
- 20 `prefer-const`
- 42 unused variables
- 8 React hook/compiler findings, including impure `Math.random()` during render and functions accessed before declaration

TypeScript succeeds partly because many domain boundaries are typed as `any`. The project plan nevertheless labels the API and schema “fully tested” and defines tests as part of Done.

**Impact:** State-machine, authorization, pricing, upload, and PDF regressions can ship unnoticed; current CI would either fail lint or omit it.

**Required outcome:** Establish a test stack and a green baseline before broad refactoring. Treat React correctness rules separately from mechanical lint cleanup.

### P2 — important inconsistencies and maintainability gaps

#### P2-1: Upload behavior disagrees across requirements, UI, and API

FR-5.2 promises PDF/PNG/JPG/DOC/DOCX up to 15 MB, and both file inputs advertise those formats ([`functional-requirements.md:100`](functional-requirements.md#L100), [`BookingWizardModal.tsx:713`](../src/components/BookingWizardModal.tsx#L713)). The API accepts only PDF/PNG/JPG/JPEG and enforces 10 MB ([`attachments/route.ts:115`](../src/app/api/orders/%5Bid%5D/attachments/route.ts#L115), [`attachments/route.ts:134`](../src/app/api/orders/%5Bid%5D/attachments/route.ts#L134)).

The booking wizard does not inspect the attachment response before closing successfully ([`BookingWizardModal.tsx:444`](../src/components/BookingWizardModal.tsx#L444)), so an advertised DOCX purchase order is silently rejected after the order itself is created. The file is written before attachment/history persistence and those writes are not one transaction, permitting orphaned files or incomplete history.

**Required outcome:** Decide the supported contract, share it between UI/server/docs, surface partial failures, and add compensating cleanup or a staged storage transaction.

#### P2-2: Several server-side validations promised by requirements are absent

- Catering event name is validated only in the UI; create/update APIs do not enforce it.
- Client `phone` is required but the promised minimum seven digits is never checked ([`clients/route.ts:151`](../src/app/api/clients/route.ts#L151)).
- Secondary email is stored without validation.
- Menu/item foreign references are not validated as a complete set before insert; invalid IDs often become generic 500 responses.
- Dynamic route IDs are converted directly with `BigInt(id)`, so malformed identifiers return 500 rather than 400.

**Required outcome:** Extract shared request schemas and server-side domain validators; browser validation remains a usability layer only.

#### P2-3: Delivery does not enforce its receipt prerequisite

Completion correctly requires an approved signed delivery receipt ([`complete/route.ts:51`](../src/app/api/orders/%5Bid%5D/complete/route.ts#L51)). Delivery has no corresponding check for a delivery receipt ([`deliver/route.ts:44`](../src/app/api/orders/%5Bid%5D/deliver/route.ts#L44)), despite the requirements describing DR-backed delivery.

**Required outcome:** Product owner must clarify whether DR approval is mandatory or merely supported, then align route/UI/docs and tests.

#### P2-4: Login normalization and rate limiting are inconsistent

The login route computes a trimmed lowercase username for rate-limit keys, but queries with the original, untrimmed input ([`login/route.ts:20`](../src/app/api/auth/login/route.ts#L20), [`login/route.ts:39`](../src/app/api/auth/login/route.ts#L39)). Rate limits live in a module-local `Map` ([`rate-limiter.ts:6`](../src/lib/rate-limiter.ts#L6)), so counters reset on restart and are not shared across replicas. The IP key trusts forwarded headers without a configured trusted-proxy boundary.

**Impact:** Confusing case/whitespace behavior and weak brute-force protection in horizontally scaled or frequently restarted deployments.

**Required outcome:** Define canonical username semantics and use a shared rate-limit store or upstream gateway with explicit proxy trust.

#### P2-5: Error response behavior is inconsistent and sometimes leaks internals

Many routes return `error.message` directly for unexpected exceptions, while others return a generic message. Database errors may expose constraint names or implementation details. Authentication responses use generic credentials messaging, which is good, but the broader API has no common error contract or correlation ID.

**Required outcome:** Centralize safe error mapping/logging; return stable client codes and retain details only in server logs.

#### P2-6: PDF and synchronous filesystem design has scaling and fidelity limits

Raw PDF generation and attachment reads/writes use synchronous filesystem operations in request paths. Built-in Helvetica has no embedded Unicode font, while client/event data may contain non-ASCII Philippine names and addresses. The PDF module is 1,110 lines and opts out of meaningful typing at the file level.

**Required outcome:** Add fixture-based PDF validation (parseable document, expected text, Unicode sample, multipage overflow), typed renderer inputs, and an explicit decision on local-volume versus object storage semantics.

### P3 — documentation and repository hygiene

#### P3-1: Documentation contains stale absolutes and contradictory claims

Numerous docs links point to `file:///home/ronald/projects/cpm/...`, not this repository. Authentication is variously called a JWT and an encrypted session; the implementation is an opaque AES-GCM envelope. The cookie is documented as `SameSite=Lax` but configured `strict`. Requirements say uploads live in `public/uploads`, while implementation and Compose use `storage/uploads`. Compose is described as including PostgreSQL and named volumes, but it does neither.

#### P3-2: Generated storage is not ignored by Git

`.gitignore` excludes `.env` and `.next` but not `/storage/`. Once the app saves invoices or uploads, customer documents can appear as untracked repository files and be committed accidentally.

**Required outcome:** Ignore runtime storage and document backup/retention separately.

#### P3-3: Dependency verification is incomplete

`npm audit --omit=dev` could not reach the npm advisory service in the review environment. `npm ls --depth=0` also reports six extraneous WASM/image packages, suggesting the installed tree is not a perfectly clean representation of the lockfile. The installed `drizzle-orm@0.45.2` is the patched release for GHSA-gpj5-g38j-94v9; no claim is made here about the rest of the dependency graph until audit runs in CI or an unrestricted environment.

## 4. Verification results

| Check | Result | Interpretation |
| --- | --- | --- |
| `git status --short` before packet creation | Clean | Findings are against committed application code |
| `npx tsc --noEmit` | Pass | Current source satisfies TypeScript compiler settings |
| `npm run lint` | Fail: 107 errors, 44 warnings | Quality gate is not green; eight findings concern React correctness/hooks |
| Test discovery | 0 files | No automated test suite exists |
| `npx drizzle-kit check` | Pass | Migration journal structure is internally valid; this does not prove schema parity or migration execution |
| `npm run build` | Inconclusive/environment-blocked | Turbopack panicked while trying to bind an internal local port (`EPERM`), both in default and escalated execution |
| `npx next build --webpack` diagnostic fallback | Fail before compilation | Next reported that it could not parse TypeScript `--showConfig`, while a direct `npx tsc --showConfig` returned valid JSON; this does not establish whether application code can build |
| `npm audit --omit=dev --json` | Inconclusive/network-blocked | npm registry lookup failed with `EAI_AGAIN` |
| Database migration/seed execution | Not run | It would mutate the configured database and was outside a read-only review |
| Docker image/Compose smoke test | Not run | No disposable database topology is defined by current Compose configuration |

## 5. Recommended target architecture

Keep the modular monolith, but introduce explicit domain seams:

```text
Route handler
  -> request schema + authenticated actor
  -> domain service (pricing / lifecycle / client validation)
  -> Drizzle transaction/repository functions
  -> stable response/error mapper

Order mutation
  -> authoritative catalog lookup
  -> decimal calculation
  -> aggregate persistence
  -> revision/event record
  -> artifact generation state/job
```

Recommended modules:

- `src/domain/orders/pricing.ts`: derive frozen meal rates and totals from authoritative catalog records.
- `src/domain/orders/state-machine.ts`: one transition matrix and role/prerequisite rules.
- `src/domain/orders/validation.ts`: order input schema and catering/address/date rules.
- `src/domain/clients/validation.ts`: client/contact validation.
- `src/server/auth/actor.ts`: typed actor extraction and authorization helpers.
- `src/server/errors.ts`: safe HTTP error mapping.
- `src/server/orders/repository.ts`: transaction-scoped aggregate and compare-and-set operations.
- `src/server/attachments/policy.ts`: extension, signature, size, and document-type contract.
- `tests/unit`, `tests/integration`, and `tests/e2e`: risk-layered verification.

Do not begin with a framework rewrite, microservices split, state library migration, or PDF library replacement. The present shape can be stabilized by extracting the rules that carry money, authorization, lifecycle, and deployment risk.

## 6. Execution work packet

> **For agentic workers:** Use `superpowers:test-driven-development` for every behavior change and `superpowers:verification-before-completion` before closing a task. Execute tasks in order unless the dependency notes say they are independent.

### Workstream A — secure bootstrap and production configuration

**Files:** `src/lib/db/seed.ts`, new catalog/demo seed modules, `package.json`, `.env.example`, `README.md`, `Dockerfile`, `docker-compose.yml`, `src/instrumentation.ts`, `src/lib/db/migrate.ts`, `.gitignore`.

**Deliverable:** A clean environment can be deployed reproducibly without known credentials, missing migrations, or silent TLS downgrades.

Acceptance criteria:

1. Catalog seeding is idempotent and contains no user passwords.
2. Admin bootstrap requires explicit secret input, enforces length, and never logs the password.
3. Migration code has no fallback credential and honors the same TLS policy as the application pool.
4. The final image contains everything its startup path reads, or startup migration is removed in favor of a documented one-shot release command.
5. Compose either provisions PostgreSQL with health checks and persistence or clearly requires an external database; README matches the selected topology.
6. `/storage/` is ignored by Git.
7. A container smoke test starts from an empty database, applies migrations once, creates a bootstrap admin safely, logs in, and persists an uploaded fixture across restart.

Suggested tests/commands:

```bash
npm run test:integration -- tests/integration/bootstrap.test.ts
docker compose config
docker compose up --build --wait
docker compose restart app
npm run smoke:container
```

### Workstream B — authoritative pricing and order validation

**Files:** create `src/domain/orders/pricing.ts`, `src/domain/orders/validation.ts`, and unit tests; modify both order create/update routes and relevant request types.

**Deliverable:** The server is the sole authority for frozen rates and totals.

Acceptance criteria:

1. A menu meal freezes the active menu's database `baseRate`; a submitted different rate cannot change it.
2. A custom-item meal freezes the exact decimal sum of the selected database item prices.
3. Missing, duplicate, inactive, or invalid menu/item references return a stable 400/409 error before persistence.
4. Decimal operations do not use binary floating point for stored financial totals.
5. Catering event-name rules, valid dates, positive integer pax, address rules, and time formats are enforced by the API.
6. Create and update share the same validator/calculator.
7. Tests cover tampered rates, `0.1 + 0.2`-style precision, duplicate dates/items, and rollback on an invalid nested record.

Suggested commands:

```bash
npm run test:unit -- tests/unit/orders/pricing.test.ts tests/unit/orders/validation.test.ts
npm run test:integration -- tests/integration/orders-write.test.ts
```

### Workstream C — state machine, concurrency, and audit integrity

**Files:** create `src/domain/orders/state-machine.ts` and repository helpers; modify all seven lifecycle routes; add a forward migration for checks/audit protection.

**Deliverable:** Every order transition is authorized, prerequisite-aware, atomic, and auditable.

Acceptance criteria:

1. One typed transition table is the source of truth for route and UI action availability.
2. `PAID` is reachable only from `COMPLETED` by an admin.
3. Approved and later orders cannot be line-item edited; revision requires the explicit return flow selected by product policy.
4. Competing transitions from one source state allow exactly one commit.
5. Delivery/receipt prerequisites reflect an explicitly approved product decision.
6. History append and status compare-and-set occur in the same transaction.
7. Database constraints reject invalid roles, enumerations, negative financial/headcount values, and history update/delete operations.
8. Migration includes preflight queries and a reversible rollout note; no existing invalid rows are silently discarded.

Suggested commands:

```bash
npm run test:unit -- tests/unit/orders/state-machine.test.ts
npm run test:integration -- tests/integration/order-transitions.test.ts
npm run test:integration -- tests/integration/order-transition-race.test.ts
```

### Workstream D — invoice consistency and PDF verification

**Files:** typed PDF input module(s), approval/order update/PDF routes, PDF tests and fixtures.

**Deliverable:** PDF artifact state cannot disagree with order state or revision.

Acceptance criteria:

1. The database never claims a PDF exists when artifact generation failed.
2. Direct admin create-and-approve follows the same artifact path as later approval.
3. Each invoice records or derives the order revision it represents; stale artifacts are not served.
4. Failed artifact generation is retryable and observable without rolling an order into an ambiguous state.
5. PDF fixtures cover multi-day pagination, long addresses, parentheses/backslashes, empty optional values, and Filipino/non-ASCII names.
6. A parser opens every generated PDF and validates page count and required text; kitchen documents contain no price tokens.

Suggested commands:

```bash
npm run test:unit -- tests/unit/pdf.test.ts
npm run test:integration -- tests/integration/invoice-lifecycle.test.ts
```

### Workstream E — attachment contract and storage safety

**Files:** create a shared attachment policy, modify upload components/route/storage driver, and add integration tests.

**Deliverable:** UI, API, and docs expose one upload contract with recoverable failure behavior.

Acceptance criteria:

1. Product explicitly chooses whether DOC/DOCX is supported and whether the limit is 10 or 15 MB.
2. Browser `accept`, user copy, server extension/MIME/signature checks, and docs match exactly.
3. The wizard does not report full success when purchase-order upload failed; it presents the saved order ID and a retry action.
4. A failed database insert does not leave an unreferenced file; a failed history write cannot produce a partially committed attachment record.
5. Filenames in `Content-Disposition` are safely encoded, and downloads resolve only stored attachment records rather than arbitrary files present in an order directory.
6. Tests cover spoofed extensions, polyglot/invalid signatures, oversized and empty files, Unicode filenames, and cross-order filename attempts.

### Workstream F — test platform and quality gates

**Files:** `package.json`, test-runner configuration, CI workflow, test directories; then lint fixes in existing source.

**Deliverable:** A repeatable green gate for lint, types, tests, migrations, build, and dependency audit.

Acceptance criteria:

1. Add `test:unit`, `test:integration`, `test:e2e`, and aggregate `test` scripts.
2. Integration tests use an isolated PostgreSQL database and apply the real migrations.
3. E2E covers login, staff draft/submit, admin approve/return, receipt upload/approval, delivery, completion, and payment.
4. Fix all eight React correctness/hook findings with behavior-preserving tests before mechanical `any`/unused cleanup.
5. Replace `any` at HTTP, database relation, and component boundaries with shared DTO/domain types.
6. CI runs `npm ci`, lint, typecheck, tests, clean migration, production build, and `npm audit --omit=dev` (or an approved advisory scanner).
7. The build runs in an environment where Turbopack worker networking is permitted; retain the review's EPERM result as an environment limitation, not an application pass/fail.

Suggested gate:

```bash
npm ci
npm run lint
npx tsc --noEmit
npm test
npm run db:migrate:test
npm run build
npm audit --omit=dev
```

### Workstream G — documentation reconciliation

**Files:** `README.md`, `docs/functional-requirements.md`, `docs/project-plan.md`, `docs/user-stories.md`, and an operator runbook.

**Deliverable:** Documentation describes the tested product and deployment, not the intended one.

Acceptance criteria:

1. Replace all machine-specific `file://` links with repository-relative links.
2. Use precise authentication terminology and match cookie behavior.
3. Align state-machine permissions and cancellation/receipt rules across FRS, user stories, UI, and API.
4. Align storage paths, upload formats/limits, Compose topology, SSL, migration ownership, backups, and bootstrap procedure.
5. Mark performance targets as targets until reproducible load/PDF benchmarks exist; publish results once measured.
6. Add recovery steps for database restore, attachment/PDF volume restore, credential rotation, and failed migrations.

## 7. Proposed sequencing

1. **Release blocker:** Workstream A secure bootstrap/configuration.
2. **Money and audit blocker:** Workstream B authoritative pricing.
3. **Workflow blocker:** Workstream C lifecycle/concurrency/database integrity.
4. **Artifact correctness:** Workstreams D and E; these can proceed in parallel after C establishes revision/state semantics.
5. **Continuous gate:** Establish the minimal part of F first, add regression tests with every preceding workstream, then finish lint/CI cleanup.
6. **Handoff:** Workstream G after product decisions are made and behavior is green.

Recommended delivery slices:

- Slice 1: test harness + secure seeding + container migration smoke test.
- Slice 2: pricing/validation module + create/update integration tests.
- Slice 3: state machine + compare-and-set transitions + constraint migration.
- Slice 4: invoice revision semantics + upload/storage transaction behavior.
- Slice 5: React correctness, typing cleanup, full E2E, docs/runbook, performance baseline.

## 8. Decisions required from product/operations

These choices should be settled before their dependent workstream begins:

1. Is every authenticated employee allowed to view/download every order and attachment? The latest commit says yes; privacy classification and audit expectations should explicitly confirm it.
2. Is a delivery receipt required—and must it be admin-approved—before `APPROVED -> DELIVERED`?
3. May an admin cancel every active state, including approved/delivered/completed, or only pending approval?
4. Are DOC/DOCX uploads genuinely required? If so, what malware scanning/conversion policy applies?
5. Should an admin ever edit an approved order directly, or must every revision transition through `FOR_UPDATE`/a dedicated amendment state?
6. Is local mounted storage the production target, or is object storage required for multi-replica deployment?

## 9. Definition of recovery

The repository can be considered release-candidate ready when:

- No known default credential can be deployed.
- Server-derived price tests prove payload tampering cannot alter totals.
- The entire state-transition matrix and a concurrent-transition case pass against PostgreSQL.
- Database constraints and immutable history protections are migrated and verified.
- Invoice revision/artifact consistency and attachment failure recovery are tested.
- Lint, typecheck, unit, integration, E2E, clean migration, production build, container smoke test, and dependency advisory scan all pass in CI.
- README, requirements, deployment manifests, and operator runbook describe the same tested behavior.

## 10. Review limitations

- No configured database was mutated, so data-dependent behavior and existing-row migration compatibility were assessed statically.
- Production build could not be adjudicated because the review runtime denied Turbopack's internal port binding even after escalated execution.
- npm advisory lookup was unavailable due registry DNS/network restrictions. The dependency graph needs a successful CI audit before release.
- Performance claims (`<300 ms` API, `<50 ms` PDF) were not measured because there is no load fixture or disposable database environment.
