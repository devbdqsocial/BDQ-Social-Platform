# Frontend Execution Plan

Status: execution started. P0 chrome stability is now in implementation.

This document converts the completed frontend polish audits into engineering packages and tracks
implementation progress after approval.

## Execution Log

| Date | Batch | Status | Notes |
|---|---|---|---|
| 2026-06-19 | P0 chrome stability batch 1 | In verification | Implemented cursor/menu layering, menu safe-area/touch fixes, public header layer tokens, footer IA cleanup, and final-sale phrase removal from public UI copy. |
| 2026-06-19 | P0.2 header contrast infrastructure | In progress | Added explicit header mode/color infrastructure and footer participation in color sync. Route-by-route `data-header-mode` assignment and visual screenshots are still pending. |

## Execution Rules

1. Work package by package. Each package should be a small commit or a tight commit series.
2. Do P0 chrome fixes before visual enrichment. Cursor, header, menu, and footer confidence come first.
3. Do not change backend, payment, webhook, database, auth, or pricing behavior unless a package says so.
4. Preserve the existing BDQ-inspired public/customer/vendor direction and the Geist/admin operational direction.
5. Every visual package must pass reduced-motion, keyboard, mobile, and contrast checks.
6. Use transform and opacity for motion. Avoid `transition: all`.
7. Keep rollback simple: each package should be revertible without removing unrelated work.

## Complexity And Risk Scale

| Value | Meaning |
|---|---|
| XS | Single file or copy/token tweak. |
| S | Small shared component or page group. |
| M | Several components with visual QA. |
| L | Shared system affecting many surfaces. |
| XL | Cross-platform sweep across public, customer, vendor, and admin. |

Risk levels: Low, Medium, High.

## Package Group 1: Chrome Fixes

### P0.1 Cursor Layer And Menu State

- Priority: P0
- Execution status: Implemented in batch 1; awaiting lint/typecheck/browser verification.
- Goal: Ensure the custom cursor never goes behind the menu, header, or public CTA.
- Files affected: `src/app/globals.css`, `src/components/motion/Cursor.tsx`, `src/components/nav/MenuOverlay.tsx`, `src/components/nav/PublicHeader.tsx`.
- Components affected: `Cursor`, `MenuOverlay`, `PublicHeader`, `MotionProviders`.
- Implementation details: Raise `#mouse` above header/menu via a named z-index token such as `--z-cursor`. Add a menu-open state by toggling `data-menu-open="true"` on `document.documentElement` while `MenuOverlay` is open. Add CSS for `#mouse.is-menu-open` or `html[data-menu-open="true"] #mouse` with high-contrast color against `var(--dark-blue)`. Keep `pointer-events: none`. Keep cursor hidden on coarse pointer and reduced motion. Do not alter GSAP follow behavior except state toggling.
- Acceptance criteria: Cursor is visible over the open menu, close button, menu links, header logo, and fixed "Let's talk" CTA. Cursor does not block clicks. Cursor is hidden on touch devices and reduced motion.
- Verification steps: Run `npm run lint`, `npm run typecheck`, open `/`, hover links, open menu, move across links and close button, verify cursor remains visible. Repeat with reduced motion enabled and mobile emulation.
- Rollback strategy: Revert this package commit; cursor returns to existing z-index and no menu-open state.
- Dependencies: None.
- Estimated complexity: S
- Risk level: Medium

### P0.2 Header Contrast Modes

- Priority: P0
- Execution status: In progress; core infrastructure implemented, section-by-section visual assignment and screenshots pending.
- Goal: Replace computed-only header color with explicit section-aware modes and fallbacks.
- Files affected: `src/components/motion/SectionColorSync.tsx`, `src/components/nav/PublicHeader.tsx`, `src/app/globals.css`, public/customer pages using `.bdq section`.
- Components affected: `SectionColorSync`, `PublicHeader`, page sections under `src/app/(public)` and `src/app/(customer)`.
- Implementation details: Support `data-header-mode="light|dark|accent|auto"` and optional `data-header-color`. Update `SectionColorSync` to prefer explicit data attributes before falling back to computed section color. Add CSS variables `--header-color`, `--header-bg`, `--header-shadow`, and `--header-backplate-opacity`. In `PublicHeader`, add a small optional backplate/scrim only when the active mode requires it. Add data attributes to image, gradient, and mixed-color sections first: landing hero, event detail hero, vendor detail hero, gallery, map/guide, footer.
- Acceptance criteria: Header logo, Tickets link, and menu lines are visible on light, dark, image, gradient, and footer sections. No visible flicker during fast scroll.
- Verification steps: Run lint/typecheck. Manual scroll routes `/`, `/events`, `/events/bdq-live`, `/vendors`, `/vendors/[id]`, `/gallery`, `/map`, `/guide`. Capture screenshots at top and mid-section at 390, 1024, and 1440.
- Rollback strategy: Revert data-attribute support and page attributes; header returns to computed section color.
- Dependencies: P0.1 recommended so cursor and menu tests happen together.
- Estimated complexity: L
- Risk level: High

### P0.3 Menu Layering, Safe Area, And Interaction

- Priority: P0
- Execution status: Implemented in batch 1; awaiting keyboard/mobile/reduced-motion verification.
- Goal: Make the full-screen menu reliable across desktop, mobile, keyboard, and safe-area devices.
- Files affected: `src/components/nav/MenuOverlay.tsx`, `src/components/nav/PublicHeader.tsx`, `src/app/globals.css`.
- Components affected: `MenuOverlay`, `PublicHeader`, `ThemeToggle`.
- Implementation details: Keep focus trap, Esc close, scroll lock, and inert behavior. Add `overscroll-behavior: contain` to the menu panel. Add safe-area padding to top and bottom. Ensure the close button is at least 44x44px. Ensure menu footer wraps cleanly under 430px. Keep z-index below cursor and above header. Do not add morphing menu shape until P4.3.
- Acceptance criteria: Menu opens/closes without background scroll, focus stays inside, close button is reachable, footer links do not overflow, cursor remains visible.
- Verification steps: Keyboard Tab/Shift+Tab/Escape test; mobile viewport 320/375/430; desktop hover test; reduced-motion test.
- Rollback strategy: Revert menu CSS/class changes only.
- Dependencies: P0.1.
- Estimated complexity: M
- Risk level: Medium

### P0.4 Footer IA And Copy Cleanup

- Priority: P0
- Execution status: Implemented in batch 1; awaiting responsive footer verification.
- Goal: Remove unwanted footer copy and turn the footer into an intentional brand close.
- Files affected: `src/app/(public)/layout.tsx`, `src/app/globals.css` if spacing helpers are needed.
- Components affected: Public footer, `WordmarkWall`, public layout.
- Implementation details: Remove footer "All sales are final" text. Remove `EN`. Replace bottom row with `© {year} BDQ Social · Vadodara, India` plus a contact/social link group. Keep giant "Let's talk" CTA. Rebalance nav columns into Explore, For guests, For partners, Company, Legal where space allows. Preserve legal links. Do not change legal policy behavior in this package.
- Acceptance criteria: Footer contains no `EN` and no "All sales are final". Footer still exposes all important links. Footer is readable at 320, 390, 768, 1440, and 1920.
- Verification steps: Run lint/typecheck. Search `rg -n "All sales are final|\\bEN\\b" src/app/(public)/layout.tsx`. Manual footer check on `/`, `/events`, `/vendors`, `/privacy`.
- Rollback strategy: Revert footer layout commit.
- Dependencies: None.
- Estimated complexity: S
- Risk level: Low

### P0.5 Global Navigation Consistency

- Priority: P0
- Execution status: Not started.
- Goal: Align public header, mobile tab bar, vendor rail, and admin sidebar interaction standards.
- Files affected: `src/components/nav/PublicHeader.tsx`, `src/components/nav/CustomerTabBar.tsx`, `src/components/vendor/VendorRail.tsx`, `src/components/nav/ZoneSidebar.tsx`, `src/components/admin/app-sidebar.tsx`.
- Components affected: Public, customer, vendor, admin navigation.
- Implementation details: Keep each navigation visually appropriate to its surface. Standardize focus-visible styles, active state clarity, 44px touch targets, safe-area spacing, and truncation. Ensure public/mobile nav does not overlap sticky buy bars or footer CTA. Ensure admin sidebar labels truncate safely and icon-only states have tooltips or accessible names.
- Acceptance criteria: Every navigation item has visible hover/focus/active state and no overlap at 320-430px. Admin collapsed nav remains usable.
- Verification steps: Keyboard and pointer QA on public, customer, vendor, and admin. Check `/tickets`, `/vendor/home`, `/admin/dashboard`, `/events/[slug]`.
- Rollback strategy: Revert navigation standardization commit.
- Dependencies: P0.2, P0.3.
- Estimated complexity: M
- Risk level: Medium

### P0.6 Color Visibility Test Harness

- Priority: P0
- Execution status: Not started.
- Goal: Add repeatable verification for header, CTA, text, logo, and cursor visibility.
- Files affected: create `e2e/frontend-visibility.spec.ts`, optionally create `scripts/frontend-qa/contrast-notes.md` for manual notes.
- Components affected: Test suite only; no app component changes.
- Implementation details: Add Playwright checks that visit major public routes, set viewports 390 and 1440, open menu, and assert key elements are visible. Use screenshots for human comparison. Do not attempt perfect automated contrast for image backgrounds; record manual checklist points in the spec comments or QA notes.
- Acceptance criteria: Test visits routes without crashing and captures/validates header/menu/footer states.
- Verification steps: Run `npm run test:e2e -- e2e/frontend-visibility.spec.ts` or project-supported equivalent. Confirm screenshots/artifacts are useful.
- Rollback strategy: Delete the new spec and QA notes.
- Dependencies: P0.1 through P0.5.
- Estimated complexity: M
- Risk level: Low

### P0.7 Final-Sale Copy Removal Pass

- Priority: P0
- Execution status: Implemented in batch 1 for exact public UI phrase removal; legal meaning preserved with neutral wording.
- Goal: Remove the phrase "All sales are final" from non-legal marketing and chrome contexts, while keeping necessary policy information in legal pages.
- Files affected: `src/app/(public)/page.tsx`, `src/app/(public)/events/[slug]/page.tsx`, `src/app/(public)/refunds/page.tsx`, `src/app/(public)/vendor-terms/page.tsx`, `src/app/(public)/layout.tsx`.
- Components affected: Landing FAQ, event FAQ, refunds policy, vendor terms, footer.
- Implementation details: Footer removal happens in P0.4. Replace marketing FAQ wording with calmer support-forward copy. Suggested public FAQ replacement: question `Need help with a ticket?`; answer `Contact BDQ support with your order reference and we will guide you through the available options for your booking.` For legal pages, remove the exact phrase but keep policy meaning in neutral language: `Refunds and exchanges are handled according to this policy and the applicable event terms.`
- Acceptance criteria: `rg -n "All sales are final" src` returns no public UI occurrences. Legal pages still describe policy clearly.
- Verification steps: Run lint/typecheck, search phrase, manually read landing FAQ, event FAQ, refunds, vendor terms.
- Rollback strategy: Revert content-only copy commit.
- Dependencies: P0.4.
- Estimated complexity: S
- Risk level: Medium

## Package Group 2: Typography System

### P1.1 Typography Token Map

- Priority: P1
- Goal: Add named implementation tokens for public, invitation, and admin typography without changing visual output unexpectedly.
- Files affected: `src/app/globals.css`, `src/app/tokens/page.tsx`, `Docs/frontend-polish/typography-system.md` only if implementation notes need a link.
- Components affected: Global CSS, design tokens page.
- Implementation details: Add aliases such as `--type-xs`, `--type-sm`, `--type-base`, `--type-lg`, `--type-xl`, `--type-2xl`, `--type-3xl`, `--type-4xl`, `--type-5xl`, `--type-6xl`. Map public aliases to current BDQ tokens, admin aliases to restrained rem values, and invitation aliases to current coming-soon sizes. Add utility classes only if they reduce duplication; do not replace every existing class in this package.
- Acceptance criteria: Tokens exist, existing screens visually match before/after, token page documents them.
- Verification steps: Lint/typecheck; visual compare `/tokens`, `/`, `/coming-soon`, `/admin/dashboard`.
- Rollback strategy: Revert token additions.
- Dependencies: None.
- Estimated complexity: M
- Risk level: Medium

### P1.2 Public And Customer Heading Cleanup

- Priority: P1
- Goal: Ensure public and customer headings consistently use BDQ heading classes and balanced wrapping.
- Files affected: `src/app/(public)/**/*.tsx`, `src/app/(customer)/**/*.tsx`, `src/components/events/*.tsx`, `src/components/landing/*.tsx`, `src/components/tickets/*.tsx`.
- Components affected: Landing, event detail, wallet, map, guide, schedule, offers, gallery, vendor discovery/detail.
- Implementation details: Replace mixed Tailwind display sizes in BDQ surfaces with `.f-h*` classes or new aliases. Add `text-balance` or `text-pretty` to hero and section headings. Keep Exat display only for headings, logos, and spectacle text. Do not force admin heading style into public pages.
- Acceptance criteria: Public/customer headings follow the documented scale; no headline overflows at 320px; large headings remain readable at 1920px.
- Verification steps: Search for `text-2xl|text-3xl|text-4xl` under public/customer routes and justify or replace. Manual breakpoint screenshots.
- Rollback strategy: Revert heading cleanup commit.
- Dependencies: P1.1.
- Estimated complexity: L
- Risk level: Medium

### P1.3 Coming-Soon Invitation Typography Tokenization

- Priority: P1
- Goal: Replace ad-hoc coming-soon micro sizes with named invitation tokens.
- Files affected: `src/app/coming-soon/ComingSoonClient.tsx`, `src/app/coming-soon/InviteCountdown.tsx`, `src/app/globals.css`.
- Components affected: Coming-soon invitation, countdown, invitation form.
- Implementation details: Add classes or CSS variables for invitation micro, label, body, success, and metadata text. Replace `text-[0.58rem]`, `text-[0.6rem]`, `text-[0.62rem]`, `text-[0.7rem]`, `text-[0.72rem]`, `text-[0.8rem]`, `text-[0.9rem]`, and inline success clamp with named tokens. Keep the invitation mood and serif accent.
- Acceptance criteria: Coming-soon page visually matches intent, uses fewer size variants, and remains readable at 320px.
- Verification steps: Search for `text-[0.` in coming-soon files. Manual compare at 320, 390, 768, 1440.
- Rollback strategy: Revert coming-soon typography commit.
- Dependencies: P1.1.
- Estimated complexity: M
- Risk level: Low

### P1.4 Admin Operational Typography

- Priority: P1
- Goal: Standardize admin micro, label, body, heading, and numeric typography without making admin feel like marketing.
- Files affected: `src/components/admin/*.tsx`, `src/components/charts/*.tsx`, `src/components/data-table/*.tsx`, `src/app/admin/**/*.tsx`, `src/components/ui/sidebar.tsx`.
- Components affected: Admin sidebar, command palette, tables, charts, KPI cards, campaign builder, POS/check-in screens.
- Implementation details: Keep Geist. Replace one-off `text-[10px]`, `text-[11px]`, `text-2xs`, `text-3xs`, `text-4xs` usages with admin micro tokens/classes where present. Apply `tabular-nums` to numeric columns and KPIs. Use `truncate`, `break-words`, and `min-w-0` where labels can overflow.
- Acceptance criteria: Admin remains dense but consistent; no tiny text is illegible; numeric columns align.
- Verification steps: Search for bracket text sizes and custom micro classes under admin/components. Manual admin dashboard, tables, campaign builder, POS.
- Rollback strategy: Revert admin typography commit.
- Dependencies: P1.1.
- Estimated complexity: L
- Risk level: Medium

### P1.5 Reading Width And Line Height

- Priority: P1
- Goal: Make long copy comfortable and prevent overly wide paragraphs.
- Files affected: `src/components/legal/LegalPage.tsx`, `src/app/(public)/privacy/page.tsx`, `src/app/(public)/terms/page.tsx`, `src/app/(public)/refunds/page.tsx`, SEO pages, public guide/about pages, `src/app/globals.css`.
- Components affected: Legal pages, SEO pages, guide/about content, long descriptions.
- Implementation details: Use `--w-prose`, `max-width: 65ch`, and 1.5-1.65 line-height for long-form copy. Keep short marketing copy at existing BDQ line-height. Add `scroll-margin-top` to heading anchors where pages have in-page nav.
- Acceptance criteria: Long copy stays 45-75 characters per line on desktop and 35-50 on mobile. Headings do not hide under fixed header when anchored.
- Verification steps: Manual check legal/SEO/guide pages at 390, 1440, 1920. Run lint/typecheck.
- Rollback strategy: Revert prose/line-height commit.
- Dependencies: P1.1.
- Estimated complexity: M
- Risk level: Low

## Package Group 3: Alignment System

### P2.1 Purpose-Based Section Alignment

- Priority: P1
- Goal: Encode alignment choices by section purpose instead of arbitrary center/left usage.
- Files affected: public/customer page files, `src/components/landing/*.tsx`, `src/components/events/*.tsx`, `src/components/vendors/VendorDiscover.tsx`.
- Components affected: Landing sections, event detail, map/guide, schedule, offers, gallery, vendor discovery/detail, wallet.
- Implementation details: Add alignment helper classes or local class usage: `section--editorial-left`, `section--emotional-center`, `section--utility-left`, `section--mixed-grid`. Apply center only to emotional or celebratory sections. Keep forms and task sections left-aligned.
- Acceptance criteria: Every major public/customer section has intentional alignment. No centered long form text or centered form fields.
- Verification steps: Manual review routes and search `text-center` under public/customer. Justify remaining center usage.
- Rollback strategy: Revert section alignment commit.
- Dependencies: P1.2.
- Estimated complexity: M
- Risk level: Medium

### P2.2 Form Alignment

- Priority: P1
- Goal: Align form labels, inputs, errors, and actions for faster completion.
- Files affected: `src/components/contact/ContactForm.tsx`, `src/components/tickets/TicketCheckout.tsx`, `src/components/auth/PhoneLogin.tsx`, `src/components/vendor/*.tsx`, `src/app/(customer)/profile/page.tsx`, admin form pages.
- Components affected: Contact, checkout, login, profile, vendor onboarding, admin forms.
- Implementation details: Labels left, errors directly below relevant field, primary action below active group, helper text near the field. Do not center input text except OTP/code fields. Ensure field groups have shared alignment and consistent max width.
- Acceptance criteria: Forms are scannable, errors are inline, primary action is tied to the active step.
- Verification steps: Manual form walkthroughs; keyboard-only test; mobile 390 check.
- Rollback strategy: Revert form alignment commit.
- Dependencies: P1.5.
- Estimated complexity: L
- Risk level: Medium

### P2.3 Editorial Visual Balance

- Priority: P1
- Goal: Balance text and media/shape/scene in storytelling sections.
- Files affected: `src/app/(public)/page.tsx`, `src/app/(public)/about/page.tsx`, `src/app/(public)/events/[slug]/page.tsx`, `src/app/(public)/vendors/[id]/page.tsx`, `src/components/motion/FestivalScene.tsx`.
- Components affected: Landing hero, event hero, vendor detail hero, about story sections.
- Implementation details: Keep editorial-left text when the visual column has meaningful content. Avoid hidden visual atmosphere on mobile for key emotional sections; use lightweight `BdqWorld` or `FestivalScene` variants where needed. Align CTA rows with text block start.
- Acceptance criteria: No hero feels left-heavy or visually dead on desktop; mobile retains some atmosphere without crowding.
- Verification steps: Screenshot 390, 1024, 1440. Check no layout shift and no text overlap.
- Rollback strategy: Revert page layout changes.
- Dependencies: P2.1, P4.1.
- Estimated complexity: L
- Risk level: Medium

### P2.4 Admin And Data Alignment

- Priority: P2
- Goal: Improve dense admin scanning without adding marketing decoration.
- Files affected: `src/components/data-table/data-table.tsx`, `src/components/charts/*.tsx`, `src/app/admin/**/*.tsx`, `src/components/admin/*.tsx`.
- Components affected: Data tables, dashboard cards, charts, admin pages.
- Implementation details: Left-align labels and text. Right-align or tabular-align numeric values where comparisons matter. Keep actions in consistent top-right or row-end locations. Ensure table empty states are centered only inside the table body.
- Acceptance criteria: Admin pages scan faster and actions are consistently placed.
- Verification steps: Manual admin dashboard/tables, horizontal overflow check.
- Rollback strategy: Revert admin alignment commit.
- Dependencies: P1.4.
- Estimated complexity: M
- Risk level: Low

## Package Group 4: Spacing System

### P3.1 Spacing Token Cleanup

- Priority: P1
- Goal: Reduce random bracket spacing and define route-appropriate spacing tokens.
- Files affected: `src/app/globals.css`, public/customer/vendor pages, coming-soon files.
- Components affected: BDQ surfaces, invitation page, forms, cards.
- Implementation details: Add missing tokens only when repeated at least three times. Replace near-duplicates such as `mt-[0.55rem]`, `mt-[0.6rem]`, `mt-[0.8rem]`, `mt-[0.9rem]` with named invitation or BDQ tokens. Keep Tailwind numeric spacing in admin where it is shadcn-compatible.
- Acceptance criteria: Repeated arbitrary spacing values are reduced and documented by role.
- Verification steps: Run `rg -n "mt-\\[0\\.|mb-\\[0\\.|gap-\\[5px\\]|px-\\[1\\.6rem\\]" src`. Manual visual compare.
- Rollback strategy: Revert spacing token commit.
- Dependencies: P1.1.
- Estimated complexity: L
- Risk level: Medium

### P3.2 Public Section Rhythm

- Priority: P1
- Goal: Remove dead space and crowding from public storytelling sections.
- Files affected: `src/app/(public)/page.tsx`, event/vendor/map/guide/schedule/offers/gallery pages, `src/app/(public)/layout.tsx`.
- Components affected: Landing, event detail, public footer, guide, map, schedule, offers, gallery.
- Implementation details: Use larger rhythm only where the section carries emotion or visual storytelling. Tighten utility/list/filter areas. Keep `min-h-[100svh]` only when content or visuals justify it. Add max-widths for ultra-wide.
- Acceptance criteria: Sections feel purposeful at 390, 1024, 1440, 1920; no empty full-screen blocks without visual reason.
- Verification steps: Page-by-page screenshot sweep; scroll through full public site.
- Rollback strategy: Revert section spacing commit.
- Dependencies: P2.1.
- Estimated complexity: L
- Risk level: Medium

### P3.3 Form And Checkout Spacing

- Priority: P1
- Goal: Make forms tighter where needed and more breathable where trust is needed.
- Files affected: `src/components/tickets/TicketCheckout.tsx`, `src/components/contact/ContactForm.tsx`, `src/components/vendor/*.tsx`, `src/components/auth/*.tsx`, admin form pages.
- Components affected: Checkout, contact, auth, vendor onboarding, admin forms.
- Implementation details: Group field label/input/error tightly. Separate major steps with larger gaps. Keep checkout summary near pay/verify actions. Ensure mobile sticky buy and checkout actions do not overlap content.
- Acceptance criteria: Forms have no floating errors/actions; checkout active step is visually grouped.
- Verification steps: Manual checkout with no tickets, selected tickets, coupon, phone, OTP. Vendor form and contact form mobile checks.
- Rollback strategy: Revert form spacing commit.
- Dependencies: P2.2.
- Estimated complexity: M
- Risk level: Medium

### P3.4 Footer And Ultra-Wide Spacing

- Priority: P1
- Goal: Make footer and wide-screen layouts intentional.
- Files affected: `src/app/(public)/layout.tsx`, `src/app/globals.css`.
- Components affected: Footer, wordmark wall, footer CTA/nav.
- Implementation details: Cap nav column width and footer content line length. Reduce full-height footer on small devices if content crowds. Use safe-area bottom padding. Ensure giant CTA does not overlap nav or legal row.
- Acceptance criteria: Footer works at 320, 390, 768, 1440, 1920, and ultra-wide.
- Verification steps: Screenshot footer across breakpoints; keyboard link traversal.
- Rollback strategy: Revert footer spacing commit.
- Dependencies: P0.4.
- Estimated complexity: M
- Risk level: Low

### P3.5 Card And Grid Spacing

- Priority: P1
- Goal: Standardize gaps and card padding across vendor cards, offers, gallery, wallet, admin cards.
- Files affected: `src/components/vendors/VendorDiscover.tsx`, `src/components/motion/BrandsCarousel.tsx`, `src/components/events/OffersClient.tsx`, `src/components/events/GalleryGrid.tsx`, `src/components/tickets/TicketCard.tsx`, admin card/table components.
- Components affected: Cards, grids, repeated item layouts.
- Implementation details: Use `--grid-gap` for public/vendor media grids. Use smaller admin gaps for operational cards. Avoid nested cards. Add `min-w-0` to card text containers and clamp/truncate long names.
- Acceptance criteria: Card grids feel consistent and do not overflow with long content.
- Verification steps: Long vendor names, long offer titles, gallery captions, admin dashboard cards. Mobile and desktop.
- Rollback strategy: Revert card spacing commit.
- Dependencies: P3.1.
- Estimated complexity: M
- Risk level: Medium

## Package Group 5: Shape System

### P4.1 Shape Utility Classes

- Priority: P1
- Goal: Expose approved missing shape utilities and normalize shape usage.
- Files affected: `src/app/globals.css`, `src/components/motion/MaskDefs.tsx`.
- Components affected: All masked media blocks.
- Implementation details: Add `.svg--form15` and `.svg--form15-mob` utilities if their aspect ratios are approved. Ensure all shape utilities define stable aspect ratio and clip-path. Do not remove existing shapes. Add comments mapping shape roles.
- Acceptance criteria: New utility classes render without layout shift and existing shapes still work.
- Verification steps: Create temporary local token page examples or add examples to `/tokens` if desired. Visual check shapes.
- Rollback strategy: Revert shape utility commit.
- Dependencies: None.
- Estimated complexity: S
- Risk level: Low

### P4.2 Page-Specific Shape Role Mapping

- Priority: P1
- Goal: Prevent repeated shape fatigue by assigning shapes by page role.
- Files affected: `src/components/vendors/VendorDiscover.tsx`, `src/components/motion/BrandsCarousel.tsx`, `src/app/(public)/vendors/[id]/page.tsx`, `src/components/events/GalleryGrid.tsx`, `src/components/events/OffersClient.tsx`, landing/event pages.
- Components affected: Vendor cards, brand carousel, vendor detail media, gallery cards, offers, hero visuals.
- Implementation details: Use a deterministic shape cycle based on item index and role. Example: vendor cards cycle form2/form10/form14; featured brand hero uses form11/form12; gallery can use rectangular or form13 only when crop is safe; offers use smaller accent shapes only if they do not obscure text. Keep text outside masked media unless contrast is guaranteed.
- Acceptance criteria: Shape usage varies by role and page while remaining cohesive.
- Verification steps: Visual check vendor grid, brand carousel, vendor detail, offers, gallery at 390 and 1440.
- Rollback strategy: Revert shape mapping commit.
- Dependencies: P4.1, P3.5.
- Estimated complexity: M
- Risk level: Medium

### P4.3 Menu And Footer Shapes

- Priority: P2
- Goal: Add BDQ-inspired menu/footer shape moments after core chrome stability is complete.
- Files affected: `src/components/nav/MenuOverlay.tsx`, `src/app/(public)/layout.tsx`, `src/app/globals.css`, `src/components/motion/MaskDefs.tsx`.
- Components affected: Menu overlay, footer, wordmark wall, optional shape component.
- Implementation details: Add non-blocking decorative shape layers that do not affect focus order. Menu shape should sit behind links and never reduce contrast. Footer shape should support the CTA/nav close. Use transform/opacity animation only. Respect reduced motion.
- Acceptance criteria: Menu/footer feel richer, but link readability and keyboard use remain unchanged.
- Verification steps: Keyboard menu test, reduced motion, header/footer screenshots, contrast check.
- Rollback strategy: Remove decorative shape component/classes.
- Dependencies: P0.1-P0.6, P4.1.
- Estimated complexity: M
- Risk level: Medium

### P4.4 Shape QA And Crop Safety

- Priority: P2
- Goal: Ensure all masked media crops remain useful and accessible.
- Files affected: `e2e/frontend-visibility.spec.ts` or QA notes, `src/components/motion/MaskDefs.tsx` examples.
- Components affected: Masked media across public/vendor/customer.
- Implementation details: Add QA checklist for shape crop: subject visible, no text clipped, no severe CLS, fallback initial visible when image missing, alt text correct.
- Acceptance criteria: Shape QA checklist exists and is used during visual QA.
- Verification steps: Manual shape QA on vendor/gallery/offers/event pages.
- Rollback strategy: Remove QA checklist additions.
- Dependencies: P4.2.
- Estimated complexity: XS
- Risk level: Low

## Package Group 6: UX Hierarchy

### P5.1 CTA Hierarchy System

- Priority: P1
- Goal: Make primary, secondary, tertiary, and destructive actions visually distinct.
- Files affected: `src/app/globals.css`, `src/components/ui/button.tsx`, BDQ CTA usages in public/customer/vendor components.
- Components affected: `.btn`, shadcn `Button`, link underlines, quantity buttons.
- Implementation details: Keep BDQ `.btn` for brand primary CTAs. Use shadcn `Button` for admin/ops. Define visual roles: primary, accent, secondary link, ghost link, destructive. Ensure disabled states explain or are near missing requirement. Do not use identical style for primary and secondary actions in the same section.
- Acceptance criteria: Every major page has one obvious primary action per section.
- Verification steps: Page-by-page CTA review and keyboard focus check.
- Rollback strategy: Revert CTA style/usage commits.
- Dependencies: P1.2, P2.1.
- Estimated complexity: L
- Risk level: Medium

### P5.2 Checkout Hierarchy

- Priority: P1
- Goal: Reduce purchase anxiety and make the active step dominant.
- Files affected: `src/components/tickets/TicketCheckout.tsx`, `src/components/events/StickyBuyBar.tsx`, event detail page.
- Components affected: Ticket selection, coupon, phone/OTP, pay/verify buttons, sticky buy bar.
- Implementation details: Order hierarchy: ticket choice -> summary -> phone/OTP -> payment. Keep trust/support text near checkout summary but not above primary action. Use inline errors next to fields. Ensure sticky buy does not obscure ticket form.
- Acceptance criteria: User can identify next step within 2 seconds on mobile and desktop.
- Verification steps: Manual checkout states: empty, selected, sold out, coupon error, OTP sent, payment busy, error.
- Rollback strategy: Revert checkout layout commit.
- Dependencies: P2.2, P3.3, P5.1.
- Estimated complexity: L
- Risk level: High

### P5.3 Wallet And Success Hierarchy

- Priority: P1
- Goal: Preserve celebration while clarifying the next action.
- Files affected: `src/app/(customer)/tickets/page.tsx`, `src/components/tickets/TicketReveal.tsx`, `src/components/tickets/TicketCard.tsx`, `src/components/tickets/TicketShare.tsx`.
- Components affected: Wallet, reveal, ticket card, share dialog.
- Implementation details: Keep reveal as peak moment. Wallet hierarchy: upcoming pass -> share/arrival guide -> secondary actions. Empty state CTA should point to events. Share modal should have close, preview, share/download action, and error/status text with clear priority.
- Acceptance criteria: Empty, confirming, reveal, and ticket-list states each have one primary next action.
- Verification steps: Use seeded orders if available; manual route states via query params; mobile card flip.
- Rollback strategy: Revert wallet/success commit.
- Dependencies: P5.1, P8.5.
- Estimated complexity: M
- Risk level: Medium

### P5.4 Event Page Hierarchy

- Priority: P1
- Goal: Move event detail from information-first to desire-first while keeping ticket action clear.
- Files affected: `src/app/(public)/events/[slug]/page.tsx`, `src/components/events/StickyBuyBar.tsx`, related event components.
- Components affected: Event hero, tickets section, FAQ, vendor strip, schedule/offers blocks.
- Implementation details: Hero should prioritize event name/date/place/primary CTA. Move logistics and policy copy below desire/ticket decision. Keep sticky buy only after hero threshold. Ensure secondary links do not compete with Get Tickets.
- Acceptance criteria: Get Tickets is the dominant action on initial viewport and ticket section.
- Verification steps: Manual event page desktop/mobile; sticky buy behavior; screenshot top and ticket section.
- Rollback strategy: Revert event hierarchy commit.
- Dependencies: P0.7, P5.1, P2.3.
- Estimated complexity: M
- Risk level: Medium

### P5.5 Vendor Onboarding Hierarchy

- Priority: P1
- Goal: Make vendor portal show one current step and one primary next action.
- Files affected: `src/app/vendor/(app)/home/page.tsx`, `src/components/vendor/OnboardingStepper.tsx`, `src/components/vendor/BrandForm.tsx`, `src/components/vendor/ContractSign.tsx`, `src/components/vendor/KycForm.tsx`, `src/components/vendor/PayStep.tsx`, vendor pages.
- Components affected: Vendor home, brand profile, contract, KYC, stall reservation, add-ons, leads.
- Implementation details: Current step should be visually dominant. Completed steps should compress. Future steps should be muted but visible. Primary CTA: complete current step. Secondary: preview/contact/help. Avoid several equal links in one card.
- Acceptance criteria: Vendor always knows the next required step.
- Verification steps: Test vendor states with seeded profiles; mobile and desktop.
- Rollback strategy: Revert vendor hierarchy commit.
- Dependencies: P5.1, P2.2, P3.3.
- Estimated complexity: L
- Risk level: Medium

### P5.6 Admin Action Hierarchy

- Priority: P2
- Goal: Make admin primary, secondary, export, and destructive actions predictable.
- Files affected: admin pages under `src/app/admin/(console)`, `src/components/admin/*.tsx`, `src/components/data-table/*.tsx`.
- Components affected: Admin dashboard, events, tickets, finance, vendors, map designer, campaign builder.
- Implementation details: Top-right action area for page primary actions. Row-end for row actions. Destructive actions require confirmation or undo. Export actions are secondary. Filters/search are above tables and reflected in URL where shareable.
- Acceptance criteria: Admin pages have consistent action placement and no immediate destructive action.
- Verification steps: Admin route manual QA; search for destructive buttons; keyboard focus.
- Rollback strategy: Revert admin action hierarchy commit.
- Dependencies: P1.4, P2.4.
- Estimated complexity: XL
- Risk level: Medium

### P5.7 Empty, Error, And Success States

- Priority: P1
- Goal: Standardize user guidance in empty/error/success states.
- Files affected: `src/components/landing/BdqLoading.tsx`, `src/components/ui/*`, event/customer/vendor/admin components with empty states.
- Components affected: Loading, empty, success, error, toast/status, ticket reveal.
- Implementation details: Empty state includes title, short reason, primary action. Error state includes fix/next step. Success state confirms result and offers one next action. Add `aria-live="polite"` for async status. Keep celebratory motion only for meaningful success.
- Acceptance criteria: No broken blank states; status messages are readable and announced where async.
- Verification steps: Search empty/error strings; manual state forcing where easy.
- Rollback strategy: Revert state component/content changes.
- Dependencies: P5.1, P7.3.
- Estimated complexity: L
- Risk level: Medium

## Package Group 7: Responsive Excellence

### P6.1 Responsive QA Checklist And Screenshots

- Priority: P1
- Goal: Create a repeatable responsive checklist for every major page.
- Files affected: create `Docs/frontend-polish/responsive-qa-checklist.md` or extend `frontend-execution-plan.md` after implementation; optional Playwright spec.
- Components affected: QA process only.
- Implementation details: Checklist must cover 320, 375, 390, 430, 768, 1024, 1440, 1920, ultra-wide for major pages. Include typography, spacing, header, footer, nav, cards, forms, maps, cursor/touch behavior.
- Acceptance criteria: Checklist exists and each package references it during QA.
- Verification steps: Confirm checklist route matrix is complete.
- Rollback strategy: Delete checklist doc/spec.
- Dependencies: None.
- Estimated complexity: S
- Risk level: Low

### P6.2 Public And Customer Responsive Pass

- Priority: P1
- Goal: Fix public/customer responsive layout issues after typography/alignment/spacing packages.
- Files affected: `src/app/(public)/**/*.tsx`, `src/app/(customer)/**/*.tsx`, public/customer components.
- Components affected: Coming soon, landing, event detail, checkout, success, wallet, map, guide, schedule, offers, gallery, vendors.
- Implementation details: Address overflow, hidden hero atmosphere, CTA wrapping, sticky buy overlap, footer stacking, menu fit, card grids, long text, and safe-area bottom spacing.
- Acceptance criteria: All public/customer major pages pass 320 through ultra-wide checklist.
- Verification steps: Manual screenshot sweep and Playwright visual test where available.
- Rollback strategy: Revert responsive pass commit series by page.
- Dependencies: P0-P5 packages.
- Estimated complexity: XL
- Risk level: High

### P6.3 Vendor And Admin Responsive Pass

- Priority: P1
- Goal: Keep vendor/admin usable on mobile/tablet/desktop without sacrificing density.
- Files affected: `src/app/vendor/**/*.tsx`, `src/components/vendor/*.tsx`, `src/app/admin/**/*.tsx`, admin/nav/ui/table components.
- Components affected: Vendor portal, admin portal, map designer, POS/check-in.
- Implementation details: Vendor mobile: one task at a time, rail/menu safe area. Admin mobile: tables get horizontal scroll or stacked summaries where needed; controls wrap; action bars do not overflow. Map designer controls stay reachable.
- Acceptance criteria: Vendor portal works at 390 and 1024; admin core pages do not horizontally break except intentional table scroll.
- Verification steps: Manual vendor/admin breakpoints; admin table overflow check.
- Rollback strategy: Revert vendor/admin responsive commits.
- Dependencies: P5.5, P5.6.
- Estimated complexity: XL
- Risk level: High

### P6.4 Map And Canvas Responsive Controls

- Priority: P1
- Goal: Keep public map and admin map designer usable across device widths.
- Files affected: `src/components/map/*.tsx`, `src/components/map/designer/*.tsx`, map pages.
- Components affected: Public map guide, Konva map canvas, designer controls, inspector, toolbar.
- Implementation details: Public map: filters/search usable above/beside map, sheet does not cover controls unexpectedly. Admin designer: toolbar wraps, side panels scroll, canvas controls stay accessible, no fixed overlay hides cursor or buttons.
- Acceptance criteria: Public map works at 390, 768, 1440; designer works at 1024+ and degrades clearly on smaller screens.
- Verification steps: Manual map interaction: zoom, reset, open sheet, search, designer panel.
- Rollback strategy: Revert map responsive commit.
- Dependencies: P6.2, P6.3.
- Estimated complexity: L
- Risk level: High

## Package Group 8: Accessibility

### P7.1 Contrast Fixes

- Priority: P1
- Goal: Ensure text, CTAs, header, footer, badges, and admin muted text pass contrast.
- Files affected: `src/app/globals.css`, header/footer/components with low-opacity text, admin theme tokens.
- Components affected: Header, footer, buttons, badges, admin muted labels, offer/status components.
- Implementation details: Avoid low-opacity text where it drops below AA. Use explicit accessible colors for lavender/yellow/pink small text. Validate footer and menu contrast. Keep decorative colors out of small body text.
- Acceptance criteria: Normal text passes 4.5:1 and large text passes 3:1 in tested contexts.
- Verification steps: Manual contrast tool plus screenshot inspection; route checks.
- Rollback strategy: Revert contrast token/class changes.
- Dependencies: P0.2, P0.4.
- Estimated complexity: M
- Risk level: Medium

### P7.2 Focus And Keyboard Navigation

- Priority: P1
- Goal: Make every interactive element keyboard reachable and visibly focused.
- Files affected: `src/app/globals.css`, nav components, forms, modals/dialogs, admin controls.
- Components affected: Public menu, tab bar, forms, checkout, gallery lightbox, offers dialog, map controls, admin dropdowns.
- Implementation details: Replace `outline-none` without local focus styling. Use `:focus-visible`. Ensure custom clickable elements are buttons/links. Keep menu focus trap. Ensure gallery/offers dialogs close with Escape if not already.
- Acceptance criteria: Keyboard-only user can navigate major flows and see focus at every step.
- Verification steps: Tab through major pages; run lint/typecheck; inspect custom controls.
- Rollback strategy: Revert focus/keyboard commit.
- Dependencies: P0.3.
- Estimated complexity: L
- Risk level: Medium

### P7.3 Input Accessibility

- Priority: P1
- Goal: Standardize labels, names, autocomplete, input modes, errors, and async status.
- Files affected: `src/components/auth/*.tsx`, `src/components/tickets/TicketCheckout.tsx`, `src/components/contact/ContactForm.tsx`, `src/components/vendor/*.tsx`, admin forms, UI inputs.
- Components affected: Login, checkout, contact, vendor forms, admin forms.
- Implementation details: Each input has a label or aria-label, meaningful `name`, correct `type`, `inputMode`, `autoComplete`, inline error, and status announcement where async. Disable spellcheck on codes/usernames/emails where appropriate.
- Acceptance criteria: No unlabeled critical inputs; errors appear near fields; first error focus behavior where feasible.
- Verification steps: Manual screen-reader/light keyboard pass; search inputs.
- Rollback strategy: Revert input accessibility commit.
- Dependencies: P2.2.
- Estimated complexity: L
- Risk level: Medium

### P7.4 Modal, Dialog, Drawer, And Menu Accessibility

- Priority: P1
- Goal: Standardize overlay semantics and behavior.
- Files affected: `src/components/nav/MenuOverlay.tsx`, `src/components/events/GalleryGrid.tsx`, `src/components/events/OffersClient.tsx`, `src/components/tickets/TicketShare.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`.
- Components affected: Menu, gallery lightbox, offers dialog, share dialog, shadcn dialog/sheet.
- Implementation details: Ensure `role="dialog"`, `aria-modal`, accessible name, Escape close, focus management, overscroll contain, safe-area padding, and background inert/scroll lock where appropriate.
- Acceptance criteria: Overlays are keyboard usable and do not trap focus incorrectly.
- Verification steps: Open/close each overlay with mouse and keyboard; mobile scroll test.
- Rollback strategy: Revert overlay accessibility commit.
- Dependencies: P0.3, P7.2.
- Estimated complexity: M
- Risk level: Medium

### P7.5 Reduced Motion And Cursor Accessibility

- Priority: P1
- Goal: Preserve the reduced-motion contract across cursor, menu, reveals, cards, loading, and success states.
- Files affected: motion components, `src/app/globals.css`, cursor/menu/footer motion packages.
- Components affected: Cursor, Reveal, SplitReveal, Parallax, Magnetic, Marquee, PageLoader, TicketReveal.
- Implementation details: Verify each motion component exits early or uses static fallback under `prefers-reduced-motion: reduce`. Disable custom cursor under reduced motion. Keep essential feedback without motion where needed.
- Acceptance criteria: Reduced-motion mode has no continuous decorative animation and remains fully usable.
- Verification steps: Browser emulation with reduced motion; manual public/customer/vendor flows.
- Rollback strategy: Revert reduced-motion adjustments.
- Dependencies: P8 packages.
- Estimated complexity: M
- Risk level: Medium

## Package Group 9: Motion System

### P8.1 Motion Token And State Catalog

- Priority: P2
- Goal: Document and encode shared motion durations, easings, and state roles.
- Files affected: `src/lib/motion.ts`, `src/app/globals.css`, motion components, optional doc update.
- Components affected: Reveal, SplitReveal, Magnetic, MenuOverlay, PageLoader, TicketReveal.
- Implementation details: Centralize names for `instant`, `micro`, `standard`, `expressive`, and `page` timing. Keep existing `EASE` and `STAGGER` patterns. Do not change visuals broadly in this package; make future packages consistent.
- Acceptance criteria: Motion constants/classes are discoverable and used by new motion work.
- Verification steps: Lint/typecheck; inspect imports.
- Rollback strategy: Revert token catalog commit.
- Dependencies: None.
- Estimated complexity: S
- Risk level: Low

### P8.2 Hover And Transition Cleanup

- Priority: P1
- Goal: Remove `transition: all` and standardize hover feedback.
- Files affected: `src/app/globals.css`, UI components using broad `transition-all`, public/vendor/admin components.
- Components affected: BDQ `.btn`, links, cards, tabs, toggles, admin campaign builder buttons.
- Implementation details: Replace `transition: all` with explicit properties. For BDQ `.btn__text`, transition `bottom`, `left`, `width`, `height`, `color`, `transform` only if used. Keep hover states more prominent than rest states. Avoid expensive properties for continuous motion.
- Acceptance criteria: No critical brand styles use `transition: all`; hover remains smooth.
- Verification steps: `rg -n "transition:\\s*all|transition-all" src`; justify remaining Tailwind `transition-all` or replace.
- Rollback strategy: Revert transition cleanup commit.
- Dependencies: P8.1 recommended.
- Estimated complexity: M
- Risk level: Medium

### P8.3 Section Reveals And Page Transitions

- Priority: P2
- Goal: Apply reveals consistently without slowing utility flows.
- Files affected: public/customer pages, `src/components/motion/Reveal.tsx`, `SplitReveal.tsx`, `template.tsx`.
- Components affected: Landing, event, offers, gallery, vendors, guide, schedule, wallet.
- Implementation details: Use `Reveal` for body blocks, `SplitReveal` for key headings, and avoid reveal delays in admin or urgent utility screens. Keep page transitions simple and reduced-motion safe.
- Acceptance criteria: Marketing/storytelling routes feel cohesive; forms/admin do not feel delayed.
- Verification steps: Manual scroll and navigation; reduced-motion check.
- Rollback strategy: Revert reveal usage commit.
- Dependencies: P8.1, P7.5.
- Estimated complexity: L
- Risk level: Medium

### P8.4 Cursor, Menu, And Footer Motion Enrichment

- Priority: P2
- Goal: Add richer interaction states inspired by the BDQ reference after stability fixes.
- Files affected: `Cursor.tsx`, `MenuOverlay.tsx`, public footer, `globals.css`, `MaskDefs.tsx`.
- Components affected: Cursor, menu, footer.
- Implementation details: Cursor: add CTA/media/menu state transitions. Menu: optional decorative shape or label stagger refinement. Footer: subtle shape/wordmark/CTA hover motion. Use transform/opacity; no motion dependency should block navigation or focus.
- Acceptance criteria: Chrome feels premium without hurting accessibility or performance.
- Verification steps: Visual QA, reduced-motion, keyboard menu, performance check.
- Rollback strategy: Revert enrichment commit; P0 fixes remain.
- Dependencies: P0.1-P0.6, P4.3, P7.5.
- Estimated complexity: L
- Risk level: Medium

### P8.5 Loading, Success, And Error Motion

- Priority: P2
- Goal: Standardize motion feedback for async states and outcomes.
- Files affected: `BdqLoading.tsx`, `TicketReveal.tsx`, checkout/vendor/admin async components, UI skeleton/toast components.
- Components affected: Loading skeletons, ticket reveal, checkout busy states, admin save states, vendor upload states.
- Implementation details: Loading uses skeleton/shimmer with reduced-motion fallback. Success uses confirmation and one next action. Error uses color/focus, not long shake animation. Async statuses use `aria-live`.
- Acceptance criteria: Async feedback appears within 400ms and is accessible.
- Verification steps: Manual async flows; reduced-motion; screen reader spot check.
- Rollback strategy: Revert motion feedback commit.
- Dependencies: P5.7, P7.5.
- Estimated complexity: M
- Risk level: Medium

### P8.6 Reference Motion Director

- Priority: P1
- Goal: Convert the BDQ reference animation audit into a single BDQ motion state system instead of scattered animation tweaks.
- Files affected: `src/lib/motion.ts`, `src/components/motion/SectionColorSync.tsx`, `src/app/globals.css`, public layouts, optional `MotionDirector` component.
- Components affected: Header, cursor, menu, footer, hero sections, pinned sections, page transitions.
- Implementation details: Create a state layer for active section, menu open, overlay open, route type, pointer type, and reduced motion. Outputs should include page color, header color, menu color, cursor state, section label, and active shape family. Use explicit `data-motion-*` or `data-header-*` attributes where computed color is unreliable.
- Acceptance criteria: Header, cursor, menu, footer label, and page color all follow the same active section state without flicker.
- Verification steps: Visual QA on `/`, `/events`, `/vendors`, `/map`, `/guide`, footer, menu open, reduced motion.
- Rollback strategy: Revert state director and fall back to existing `SectionColorSync`.
- Dependencies: P0.1, P0.2, P8.1.
- Estimated complexity: L
- Risk level: Medium

### P8.7 Cursor State Matrix

- Priority: P0
- Goal: Fix the cursor-behind-menu bug and add BDQ-inspired cursor states.
- Files affected: `src/components/motion/Cursor.tsx`, `src/app/globals.css`, `MenuOverlay.tsx`, public cards/media components.
- Components affected: Cursor, menu, CTAs, media cards, slider/video affordances.
- Implementation details: Raise `#mouse` to a named top interaction layer. Toggle `html[data-menu-open="true"]` when menu opens. Add states for default, link, CTA, media view, slider, video, menu, and disabled. Keep `pointer-events: none`, hide on touch and reduced motion, and preserve the GSAP follow loop.
- Acceptance criteria: Cursor remains visible over the open menu, close button, menu links, footer CTA, image sections, and dark/light backgrounds.
- Verification steps: Playwright menu-open screenshot, manual pointer test, reduced-motion check, coarse-pointer emulation.
- Rollback strategy: Revert cursor state additions while keeping core pointer behavior.
- Dependencies: P0.1, P7.5.
- Estimated complexity: M
- Risk level: Medium

### P8.8 Morphing Menu Surface And Preview System

- Priority: P2
- Goal: Upgrade the public menu from a simple slide panel into a signature shaped interaction while preserving accessibility.
- Files affected: `src/components/nav/MenuOverlay.tsx`, `src/components/motion/MaskDefs.tsx`, `src/app/globals.css`, public media assets.
- Components affected: Menu overlay, menu button, cursor, menu preview images, mobile nav.
- Implementation details: Keep dialog semantics, focus trap, Esc close, scroll lock, safe-area padding, and keyboard access. Add a decorative shaped surface layer behind links. Animate small menu trigger -> expanded surface -> hamburger to X -> link mask-rise -> optional desktop preview panel. Lazy-load previews after menu opens. Mobile may use simpler full-height shape.
- Acceptance criteria: Menu feels richer but links are instantly usable, readable, keyboard reachable, and never hidden by decorative layers.
- Verification steps: Desktop/mobile screenshots, keyboard traversal, focus trap, reduced motion, cursor over close and links.
- Rollback strategy: Disable decorative surface and previews; keep accessible overlay.
- Dependencies: P0.3, P4.3, P8.7.
- Estimated complexity: L
- Risk level: Medium

### P8.9 BDQ Shape Morph Library

- Priority: P2
- Goal: Replace repeated generic shape usage with a BDQ-specific shape motion language.
- Files affected: `src/components/motion/MaskDefs.tsx`, `src/app/globals.css`, shape documentation, hero/menu/footer components.
- Components affected: Hero masks, cards, menu previews, footer CTA, loader/transition shapes.
- Implementation details: Add named shape families with aspect ratios and safe zones: ticket shard, market canopy, stage beam, food stall tag, festival flag, editorial block. Support static clip masks first; use GSAP morph or crossfade only where paths are compatible and performance is acceptable.
- Acceptance criteria: Shape usage feels varied by section purpose and no text/media is cropped unpredictably.
- Verification steps: Screenshot each shape at 390, 768, 1440; inspect text/image safe areas; reduced-motion fallback.
- Rollback strategy: Keep existing mask set and remove new families from usage.
- Dependencies: P4.1-P4.3, P8.1.
- Estimated complexity: M
- Risk level: Medium

### P8.10 Hero Motion Sequence

- Priority: P2
- Goal: Build one flagship BDQ hero sequence inspired by the BDQ reference hero: shape, words, media, and colors move as one composition.
- Files affected: landing hero components, `MaskDefs.tsx`, `src/lib/motion.ts`, `globals.css`, public content/media.
- Components affected: Public home hero and optional campaign/event hero.
- Implementation details: Define 3 to 5 motion states with shape family, text anchor, media layer, color pair, and CTA visibility. Use true morph only when safe; otherwise crossfade masks. Keep primary CTA visible and avoid arbitrary center/left text switches.
- Acceptance criteria: First viewport remains readable, subject imagery is visible, CTA is obvious, motion does not cause layout shift.
- Verification steps: Capture initial, mid-sequence, final state at desktop/mobile; reduced-motion static state.
- Rollback strategy: Restore static hero composition.
- Dependencies: P8.6, P8.9, P2.1-P2.4.
- Estimated complexity: L
- Risk level: Medium

### P8.11 Wall Transition And Footer Finale

- Priority: P3
- Goal: Reuse the wordmark wall as a premium transition/footer close, not only a loader texture.
- Files affected: `WordmarkWall.tsx`, `PageLoader.tsx`, `template.tsx`, public footer, `globals.css`.
- Components affected: Loader, route transition, footer, large footer CTA.
- Implementation details: Add a GSAP wall variant with row intro, opposing horizontal motion, blur/depth, and collapse. Use it for footer entrance first; route transitions only if performance remains clean. Footer CTA can add a shape hover/morph after footer IA is fixed.
- Acceptance criteria: Footer feels like a final scene; transitions do not delay navigation, LCP, or reduced-motion users.
- Verification steps: Footer screenshots, route-change test, Lighthouse/manual performance pass, reduced-motion check.
- Rollback strategy: Disable enhanced wall variant and retain static/CSS wall.
- Dependencies: P0.4, P3.4, P8.1, P8.5.
- Estimated complexity: L
- Risk level: Medium

### P8.12 Motion QA Harness

- Priority: P1
- Goal: Add visual/video testing for animation states that normal lint/typecheck cannot see.
- Files affected: `e2e/frontend-motion.spec.ts`, screenshot/video artifacts, optional QA notes.
- Components affected: Loader, hero, menu, cursor, scroll color, footer, mobile menu, reduced motion.
- Implementation details: Use Playwright to record short `.webm` clips and capture key frames: home load, hero after 2 seconds, menu open, menu hover, cursor over menu close, scroll section color change, footer entry, mobile menu, reduced motion. Include assertions for visibility and non-overlap where possible, and keep videos plus sampled frames for human review.
- Acceptance criteria: Motion regressions are visible in video/frame artifacts before release.
- Verification steps: Run `npm run test:e2e -- frontend-motion` or equivalent project command.
- Rollback strategy: Remove the spec; production code unaffected.
- Dependencies: P0.6, P8.6-P8.8.
- Estimated complexity: M
- Risk level: Low

## Package Group 10: Frontend Consistency

### P9.1 Button System

- Priority: P1
- Goal: Define and apply button roles across BDQ and admin systems.
- Files affected: `src/app/globals.css`, `src/components/ui/button.tsx`, BDQ CTA usages, qty buttons.
- Components affected: Brand CTAs, admin buttons, quantity steppers, icon buttons.
- Implementation details: Map roles: BDQ brand primary, BDQ accent, text link, shadcn primary, shadcn outline, destructive, icon, quantity. Ensure icon buttons have aria-label and touch target. Do not replace shadcn admin buttons with BDQ buttons.
- Acceptance criteria: Same action importance has same visual treatment within each surface.
- Verification steps: Button inventory search; visual QA.
- Rollback strategy: Revert button system commit.
- Dependencies: P5.1, P7.2.
- Estimated complexity: L
- Risk level: Medium

### P9.2 Input System

- Priority: P1
- Goal: Normalize input styles and behavior by context.
- Files affected: `src/components/ui/input.tsx`, `textarea.tsx`, `select.tsx`, BDQ field components, vendor/admin forms.
- Components affected: BDQ underline inputs, shadcn inputs, invitation inputs, map controls.
- Implementation details: Keep visual differences by context, but standardize label/error/focus/disabled behavior. Ensure 16px mobile input floor in BDQ and invitation. Preserve admin density.
- Acceptance criteria: Forms feel consistent and accessible while remaining surface-appropriate.
- Verification steps: Form walkthrough and input attribute search.
- Rollback strategy: Revert input system commit.
- Dependencies: P7.3.
- Estimated complexity: L
- Risk level: Medium

### P9.3 Card And Badge System

- Priority: P1
- Goal: Clarify card and badge usage across public/customer/vendor/admin.
- Files affected: public/vendor card components, `src/components/ui/card.tsx`, status badge utilities, admin cards.
- Components affected: Vendor cards, offer cards, ticket cards, admin KPI cards, badges.
- Implementation details: Cards are for repeated items, tools, and framed content only. Avoid nested cards. Badge colors reflect semantic status and pass contrast. Use `tabular-nums` for numeric badges.
- Acceptance criteria: Cards and badges are consistent and readable.
- Verification steps: Visual QA across vendors/offers/tickets/admin dashboard.
- Rollback strategy: Revert card/badge commit.
- Dependencies: P3.5, P7.1.
- Estimated complexity: M
- Risk level: Medium

### P9.4 Modal, Drawer, Table, And Navigation System

- Priority: P2
- Goal: Standardize complex UI primitives without redesigning every screen.
- Files affected: `src/components/ui/dialog.tsx`, `sheet.tsx`, `table.tsx`, `dropdown-menu.tsx`, navigation components, data-table.
- Components affected: Admin tables/dropdowns, public overlays, vendor modals/sheets.
- Implementation details: Shared primitives must have consistent focus, z-index, animation, safe area, and overflow behavior. Tables need empty/loading states and horizontal overflow strategy. Navigation must expose active states consistently.
- Acceptance criteria: Primitives behave consistently across surfaces.
- Verification steps: Keyboard and responsive tests for dialogs/sheets/tables/dropdowns/navigation.
- Rollback strategy: Revert primitive standardization commit.
- Dependencies: P7.4, P6.3.
- Estimated complexity: L
- Risk level: Medium

### P9.5 State Component System

- Priority: P2
- Goal: Standardize loading, empty, success, and error presentations.
- Files affected: create or update shared state components under `src/components/ui` or `src/components/motion`, then replace local copies gradually.
- Components affected: Loading, empty, success, error states across public/customer/vendor/admin.
- Implementation details: Provide small shared primitives: `EmptyState`, `InlineError`, `AsyncStatus`, `SuccessPanel`, or equivalent following repo patterns. Do not over-abstract if local component is clearer. Replace repeated local empty/error patterns in high-traffic pages first.
- Acceptance criteria: High-traffic empty/error/loading states are consistent and accessible.
- Verification steps: Manual state checks; lint/typecheck.
- Rollback strategy: Revert shared component and replacements.
- Dependencies: P5.7, P8.5.
- Estimated complexity: L
- Risk level: Medium

## Page-By-Page Implementation Blueprint

| Page / area | Keep | Improve | Rebuild | Remove | Exact implementation work |
|---|---|---|---|---|---|
| Coming Soon | Invitation mood, frame, countdown, waitlist form. | Tokenized type, form spacing, contrast, mobile rhythm. | Replace ad-hoc text sizes with invitation tokens. | Tiny near-duplicate font sizes. | P1.3, P3.1, P7.3; verify 320-1440 and reduced motion. |
| Landing | BDQ palette, FestivalScene, primary CTA, brand sections. | Header modes, CTA hierarchy, section rhythm, shape variety. | Any section that still depends on dead decorative space. | Final-sale phrase in FAQ. | P0.2, P0.7, P2.3, P3.2, P4.2, P5.1. |
| Event Detail | Event hero, ticket CTA, sticky buy, vendor/schedule links. | Desire-first hierarchy, ticket section spacing, policy copy placement. | Hero/logistics order if CTA is not dominant. | Final-sale phrase in FAQ. | P5.2, P5.4, P0.7, P6.2. |
| Checkout | Existing ticket/payment logic. | Active step hierarchy, trust grouping, form spacing, errors. | Visual grouping around ticket -> summary -> phone/OTP -> pay. | Competing secondary actions near pay. | P5.2, P2.2, P3.3, P7.3. |
| Success | TicketReveal peak moment. | Next action clarity, reduced-motion fallback. | None unless share flow blocks completion. | Decorative motion that runs under reduced motion. | P5.3, P8.5, P7.5. |
| Wallet | Ticket cards, reveal, share, empty action. | Arrival hierarchy, card spacing, empty/confirming states. | State layout if multiple actions compete. | Any generic empty state. | P5.3, P3.5, P5.7, P6.2. |
| Map | Public exploration framing and map data layer. | Search/filter alignment, sheet accessibility, responsive controls. | Mobile control layout if map is hard to use. | Dead space around filters. | P6.4, P2.1, P7.4. |
| Guide | Content structure and internal links. | Reading width, section alignment, header modes. | Long copy layout if too wide. | Over-wide paragraphs. | P1.5, P2.1, P6.2. |
| Schedule | Now/next logic and timeline. | Mobile hierarchy, card spacing, current state emphasis. | Empty state if it is too flat. | Crowded horizontal scroll. | P5.7, P3.5, P6.2. |
| Offers | Offer dialog and redemption action. | Urgency hierarchy, modal accessibility, card shape/spacing. | Dialog layout if focus/close is weak. | Equal visual weight for all offers if live offer exists. | P5.1, P7.4, P4.2. |
| Gallery | Grid/lightbox. | Crop safety, lightbox keyboard, captions, shape variety. | Lightbox focus behavior if needed. | Images without stable sizing where fixable. | P4.4, P7.4, P3.5. |
| Vendor Discovery | Search/filter and vendor grid. | Shape variety, long name handling, empty state. | Card shape cycle. | Repeated single shape everywhere. | P4.2, P3.5, P5.7. |
| Vendor Detail | Brand story and contact links. | Hero balance, media crop, CTA hierarchy. | Hero visual if dead/repetitive. | Competing equal links. | P2.3, P4.2, P5.1. |
| Vendor Portal | BDQ vendor shell and onboarding steps. | One next action, form alignment, mobile rail/menu. | Onboarding state grouping. | Equal-weight step actions. | P5.5, P2.2, P6.3. |
| Admin Portal | Geist/shadcn operational density. | Action hierarchy, table overflow, micro type, focus. | Only pages with broken responsive behavior. | Decorative marketing patterns. | P1.4, P2.4, P5.6, P6.3. |

## File-By-File Execution Index

| File / pattern | Packages | Action | Potential regressions |
|---|---|---|---|
| `src/app/globals.css` | P0.1, P0.2, P1.1, P3.1, P4.1, P7.1, P8.2 | Add z-index/type/spacing/header/shape tokens and cleanup transitions. | Global visual shifts; reduced-motion side effects. |
| `src/components/motion/Cursor.tsx` | P0.1, P8.4, P7.5 | Add menu-open/state handling and accessible fallbacks. | Cursor hidden or stuck state. |
| `src/components/nav/PublicHeader.tsx` | P0.2, P0.5 | Header mode/backplate support and nav consistency. | Header color mismatch, CTA overlap. |
| `src/components/nav/MenuOverlay.tsx` | P0.1, P0.3, P4.3, P7.4, P8.4 | Layering, safe area, accessibility, later visual enrichment. | Focus trap break, scroll lock issues. |
| `src/app/(public)/layout.tsx` | P0.4, P3.4, P4.3 | Footer IA/copy/spacing and later shape enrichment. | Missing legal links, footer overflow. |
| `src/app/(public)/page.tsx` | P0.7, P2.3, P3.2, P4.2, P5.1 | Landing hierarchy, spacing, shape, copy. | Hero imbalance, CTA regression. |
| `src/app/(public)/events/[slug]/page.tsx` | P0.7, P5.2, P5.4 | Event hierarchy and copy. | Ticket purchase path regression. |
| `src/components/tickets/TicketCheckout.tsx` | P2.2, P3.3, P5.2, P7.3 | Checkout visual/form hierarchy. | Payment flow UI regression; do not change payment logic. |
| `src/app/(customer)/tickets/page.tsx` and ticket components | P5.3, P3.5, P8.5 | Wallet/success/share states. | Reveal/share regressions. |
| `src/app/coming-soon/*` | P1.3, P3.1, P7.3 | Tokenize invitation type/spacing. | Waitlist form visual regression. |
| `src/components/vendors/VendorDiscover.tsx` | P3.5, P4.2, P5.7 | Shape cycle, spacing, empty state. | Image crop and grid layout. |
| `src/app/(public)/vendors/[id]/page.tsx` | P2.3, P4.2, P5.1 | Vendor detail hero/media/actions. | Social/contact link regression. |
| `src/components/events/OffersClient.tsx` | P4.2, P7.4, P5.7 | Offer cards/dialog/accessibility. | Dialog close/focus issues. |
| `src/components/events/GalleryGrid.tsx` | P4.4, P7.4, P3.5 | Lightbox, crop, captions. | Image loading/click behavior. |
| `src/components/events/ScheduleTimeline.tsx` | P3.5, P5.7, P6.2 | Now/next and empty state polish. | Timeline filter behavior. |
| `src/components/map/**/*.tsx` | P6.4, P7.4 | Responsive controls and sheets. | Canvas interaction regression. |
| `src/app/vendor/**/*.tsx`, `src/components/vendor/*.tsx` | P5.5, P2.2, P6.3, P9.2 | Vendor onboarding/forms/responsive. | Onboarding/payment contract UI regression. |
| `src/app/admin/**/*.tsx`, `src/components/admin/*.tsx` | P1.4, P2.4, P5.6, P6.3 | Admin typography/action/responsive pass. | Dense tools become too spacious or actions move unexpectedly. |
| `src/components/ui/*.tsx` | P7.2-P7.4, P9.1-P9.5 | Shared primitive consistency. | Wide blast radius; test public/vendor/admin. |
| `e2e/frontend-visibility.spec.ts` | P0.6, P6.1 | Create visual/visibility coverage. | Test flake if selectors are fragile. |

Files to create:

| File | Purpose |
|---|---|
| `e2e/frontend-visibility.spec.ts` | Header/menu/footer/cursor responsive visibility checks. |
| `Docs/frontend-polish/responsive-qa-checklist.md` | Manual responsive checklist if not kept inside this plan. |
| Optional shared state components under `src/components/ui` | Only if repeated loading/empty/error patterns justify them. |

Files to remove:

| File | Decision |
|---|---|
| None planned. | Remove text/classes/usages, not files, unless future implementation discovers dead assets already approved for deletion. |

Files requiring review:

| File / area | Review owner |
|---|---|
| Legal/refund/vendor terms copy | Product/legal owner before final copy lands. |
| Checkout/payment components | Engineering owner to ensure no payment logic changes. |
| Admin campaign builder/POS/check-in | Ops owner to verify dense workflow remains fast. |

## Implementation Order

### Sprint 1: P0 Chrome Stability

Packages: P0.1, P0.2, P0.3, P0.4, P0.5, P0.6, P0.7.

Outcome: Navigation, cursor, header, menu, footer, and sales-copy issues are stable and testable.

### Sprint 2: Type, Alignment, Spacing Foundation

Packages: P1.1-P1.5, P2.1-P2.4, P3.1.

Outcome: Shared text/alignment/spacing rules are in code and ready for page sweeps.

### Sprint 3: Public And Customer Experience

Packages: P3.2, P3.3, P3.5, P5.1-P5.4, P6.2.

Outcome: Landing, event, checkout, success, wallet, map, guide, schedule, offers, gallery, vendors improve under the same system.

### Sprint 4: Vendor And Admin Experience

Packages: P1.4, P2.4, P5.5, P5.6, P6.3, P6.4.

Outcome: Vendor and admin remain operational but gain consistency, hierarchy, and responsive polish.

### Sprint 5: Shape, Motion, Accessibility

Packages: P4.1-P4.4, P7.1-P7.5, P8.1-P8.12.

Outcome: Visual richness increases after accessibility and reduced-motion safety are locked.

### Sprint 6: System Consistency And Final QA

Packages: P9.1-P9.5 plus any remaining responsive checklist fixes.

Outcome: Shared primitives and states are consistent across the platform.

## Global Verification Matrix

Run for every sprint:

| Check | Command / method | Required result |
|---|---|---|
| Lint | `npm run lint` | No new errors. Existing warnings must not increase without reason. |
| Typecheck | `npm run typecheck` | Pass. |
| E2E | `npm run test:e2e` | Pass or document unrelated existing failures. |
| Public smoke | `/`, `/events`, `/events/bdq-live`, `/vendors`, `/map`, `/schedule`, `/offers`, `/gallery`, `/guide` | Render and interact without crash. |
| Customer smoke | `/login`, `/tickets`, `/profile`, checkout path | Forms, ticket states, and nav work. |
| Vendor smoke | `/vendor/login`, `/vendor/home`, `/vendor/events`, `/vendor/profile` | Onboarding nav and forms work. |
| Admin smoke | `/admin/login`, `/admin/dashboard`, key table pages, map designer | Dense tools remain usable. |
| Responsive QA | 320, 375, 390, 430, 768, 1024, 1440, 1920, ultra-wide | No unwanted horizontal overflow or overlap. |
| Accessibility QA | Keyboard, focus-visible, labels, dialog close, reduced motion | Pass manual checklist. |
| Performance QA | No avoidable CLS, no expensive continuous animation | Acceptable visual performance. |
| Cross-browser QA | Chromium, WebKit, Firefox via Playwright where available | Core flows pass. |

## Completion Checklist

The frontend polish program is complete when:

1. All P0 packages are shipped and verified.
2. Footer no longer contains `EN` or "All sales are final".
3. Cursor is visible above the open menu and hidden appropriately on touch/reduced motion.
4. Header visibility passes light, dark, image, gradient, and footer sections.
5. Typography, spacing, alignment, shape, motion, and consistency packages are either complete or explicitly deferred.
6. Page-by-page responsive checklist is complete for all major surfaces.
7. Lint, typecheck, and e2e pass.
8. Manual QA confirms public, customer, vendor, and admin flows remain usable.
