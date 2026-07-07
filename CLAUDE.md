# CLAUDE.md — BDQ Social

Premium curated lifestyle festival + night-market portal. One Next.js app, four subdomains
(landing, customer, vendor, admin/staff). Greenfield: docs first, code in `src/` (P0+).

## Docs are the source of truth (read before building)
All in `Docs/`: `project.md` (spec), `ARCHITECTURE.md` (system design), `SCHEMA.md` (Prisma),
`API.md` (contracts), `BUSINESS-RULES.md` (values/policies), `design.md` (UI/UX), `plan.md`
(build roadmap P0-P4), `suggested-features.md` (backlog), `sponsorship-deck.md`.
Follow them; if code and a doc disagree, flag it — don't silently diverge.

## Working guidelines
Token-efficient: no fluff, no preamble, no restating the prompt. Answer or act.
1. **Think before coding.** State assumptions. If unclear or multiple interpretations exist, stop
   and ask — don't pick silently. If a simpler approach exists, say so; push back when warranted.
2. **Simplicity first.** Minimum code that solves it. Nothing speculative — no unasked features,
   no single-use abstractions, no handling for impossible cases. If 200 lines could be 50, rewrite.
3. **Surgical changes.** Touch only what the task needs. Match existing style; don't refactor or
   reformat unrelated code. Remove only orphans your change created; flag pre-existing dead code,
   don't delete it. Every changed line traces to the request.
4. **Goal-driven execution.** Turn tasks into verifiable goals (write the failing test/check
   first). Verify before claiming done (run it / hit the route / check the row). Report failures
   honestly.

## Project code rules
- TypeScript strict. Small, focused, named functions. DRY — extract shared logic.
- External SDKs only via adapters in `src/lib/` (razorpay, firebase-admin, interakt, resend,
  cloudinary, qr, totp, ratelimit). Swappable behind one interface.
- Mutations go through the wrappers: `withAuth(role|perm)` → `withValidation(zod)` → `withAudit()`.
- UI uses shadcn/ui + **semantic design tokens** (admin/app console). Customer-facing surfaces
  (landing, public, customer + vendor portals) add the **BDQ `.bdq` token layer** in `globals.css`
  — palette, fluid Exat type scale, `BDQ section/surface` colour-blocked sections, clip-path masks.
- Validate every input + webhook with Zod. Server-side authz on every mutation (middleware isn't enough).

## Locked rules (never violate)
- **Money = integer paise.** Never floats.
- **All prices are dynamic** — entered by admin per event (tickets, stalls, bulk %, early-bird).
  Never hardcode a price.
- **No refunds** (all sales final). **No GST** (KYC is verify-only). No such endpoints/flows.
- **Fulfilment is webhook-driven + idempotent** (by `gatewayRef`); never trust client payment callback.
- **One active booking per stall** (DB partial-unique index + transactional holds). No double-book.
- **Audit every admin/staff mutation** (append-only `AuditLog`, before/after) via `withAudit()`.
- **Customer-facing brand = BDQ identity** (owner-approved override of the old
  clay/pine/gold + no-purple rule; `design.md` §3 superseded for these surfaces): navy `#01065B` +
  lavender `#868EFF` / green / yellow / pink / red colour-blocked `BDQ section/surface` sections,
  Exat-Bold display + Inter body, in the `.bdq` layer of `globals.css`. **The admin console stays
  neutral OKLCH and keeps the no-purple rule** — never apply BDQ colours or the `.bdq` zone there.
  Owner-approved refinement (2026-07): vendor-portal *functional* forms use bordered inputs +
  solid buttons (`.bdq-input`/`.bdq-btn`), not the underline/clip-path marketing style — that
  stays on public/customer marketing surfaces.
- Vendor approval requires a **team call-back**; admin (SUPER_ADMIN) requires **TOTP 2FA**.

## Stack
Next.js 15 (App Router, server actions + route handlers) · TS · Tailwind v4 + shadcn · Prisma +
Neon Postgres · Firebase phone OTP + app session · Razorpay · react-konva (map) · Interakt
(WhatsApp) · SendGrid (email) · Cloudinary (assets) · Vercel + cron · PWA.

## Conventions
- Subdomain routing in `src/middleware.ts` (host → zone). Domain logic in `src/server/<module>/`.
- Branch per feature: `feature/{slug}`. Add tests with each task, not after.
