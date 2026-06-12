# AGENT_RULES.md — Governance for every AI agent session

> Spec 17. Read this before touching code. These rules exist so ten different agent sessions
> produce ONE product. They override agent judgment: when an agent "has a better idea," the
> idea goes into a doc proposal, not into code.

## The prime rule

**The spec decides, not the developer.** If a question is not answered by the docs below, STOP
and ask the owner — do not pick silently. If it IS answered, do exactly that, even if you
disagree; file disagreement as a note in the PR description.

## Which doc answers which question

| Question type | Authority |
| --- | --- |
| Is this feature in scope / cut / V2? | changes.md §3 (feature spec — owner-confirmed verdicts) |
| Color, spacing, type size, radius, shadow, easing, duration, component anatomy | design-system.md |
| Page layout at a breakpoint, touch targets, nav patterns | mobile.md |
| Customer screen content/states/copy | customer-portal.md |
| Vendor screen content/states/copy | vendor-portal.md |
| Admin IA, screens, Command Center, admin counterparts | admin-portal.md |
| Map: entities, designer, scoring, pricing assist, views, exports | map-system.md |
| Wow moments (ticket reveal, share art, scan moment, concierge) | delight.md |
| Folder structure, module boundaries, error contract, mutation pipeline, state machines | architecture.md |
| Auth/RBAC/payments/uploads/headers | security.md |
| Budgets, caching, bundle rules | performance.md |
| Known inconsistencies being eliminated | consistency.md + design-debt.md |
| Package scope, hours, acceptance, schema ledger | implementation-roadmap.md |
| Step-by-step task order, commands, verify proofs | build-plan.md |
| Go-live gates | launch-readiness.md |

## Hard prohibitions (never, in any package)

1. **Never invent a color, spacing value, font size, radius, shadow, or easing.** Every visual
   value must exist in design-system.md / `globals.css` tokens. New token = doc change first.
2. **Never create a new page/route** that is not in a portal spec or the roadmap.
3. **Never add a dependency.** The V1 dep set is closed (performance.md). A new dep requires
   an owner-approved roadmap amendment (the only standing exceptions are the ones the roadmap
   itself names, e.g. satori/resvg spike in R6.2, Sentry SDK in R0.5).
4. **Never change `prisma/schema.prisma`** outside a migration listed in the roadmap's schema
   ledger (M1–M7; map phase is JSON-only by spec). Additive-first, destructive one deploy
   later; migrate prod (ep-dry-sunset) BEFORE deploying dependent code.
5. **Never hardcode a price, fee, discount, or quantity of money.** Integer paise, admin-entered,
   server-computed. Scoring/pricing assist SUGGESTS; admin APPLIES (map-system §9.2).
6. **Never violate the locked business rules:** no refunds, no GST, webhook-only fulfilment
   (idempotent by gatewayRef), one active booking per stall, audit every admin mutation, vendor
   call-back approval, SUPER_ADMIN TOTP, RPA brand on customer+vendor surfaces / neutral OKLCH
   admin (no purple in admin).
7. **Never bypass the mutation pipeline** (`withAuth` → validation → service → `withAudit`) or
   return a second error shape (one `Result<T>` contract, architecture.md).
8. **Never weaken a security control** (CSP nonce, rate limits, origin checks, env enforcement)
   to make something work. Fix the something.
9. **Never commit secrets, .env files, or test bypass flags** (`DEV_ADMIN`, `ADMIN_NO_2FA_EMAILS`
   stay dev-only and empty in prod).
10. **Never mark a task done without running its Verify line** (build-plan.md). Failing
    verify = the task is not done; report honestly.

## Required behaviors (every package)

- One package = one verified commit **directly on `rebuild/main`** (owner amendment
  2026-06-12: no PR ceremony while a single agent + owner work together; revisit if parallel
  agents start). Commit messages: `<area>(<pkg>): <what>` e.g.
  `map(R2.5.2): underlay calibration modal`.
- Tests land **in the same PR** as the code they cover. Pure logic (pricing, scoring, geometry,
  schemas) always gets unit tests.
- Close the loop on debt: if your package touches a file listed in design-debt.md, fix that
  row in the same PR and tick it.
- Match house style: kebab-case libs, PascalCase components, named exports, no `any`,
  no `@ts-ignore`, comments only for non-obvious constraints.
- Every changed line traces to the package scope. No drive-by refactors, no "improvements"
  to adjacent code, no reformatting.
- Before ending a session: `npm run typecheck && npm run lint && npm run test:run` green,
  build-plan.md ticks updated, session log row appended (build-plan §session log).

## The flagship priority rule (map work)

When a map trade-off is not covered by map-system.md, optimize in this order:
**vendor sales → admin usability → event operations → customer discovery** — never developer
convenience. Then record the decision as a map-system.md amendment in the same PR.
