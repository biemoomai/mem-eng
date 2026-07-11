---
name: mem-eng-release-hardening
description: Release-hardening workflow for the Mem-eng vocabulary app. Use when auditing, fixing, testing, securing, optimizing, or preparing Mem-eng for a public beta, Cloudflare deployment, domain, monetization, PWA, TestFlight, or App Store release. Covers React UI, non-destructive tutorial behavior, FSRS, Supabase Auth/RLS/Edge Functions, guest lifecycle, discovery collections, mobile performance, and release gates.
---

# Mem-eng Release Hardening

Work from:
`C:\Users\BoomBorriboon\.gemini\antigravity\scratch\mem-eng`

Read [references/EXECUTION_PLAN.md](references/EXECUTION_PLAN.md) before changing code. Treat that file as the release contract.

## Product Contract

Mem-eng must let a new visitor:

1. Enter as a guest without a login wall.
2. Translate an English word into a concise, trustworthy learning card.
3. Save words and review them with official FSRS scheduling.
4. Add five varied words from the selected curriculum.
5. Manage cards in Library without changing shared dictionary data.
6. Convert the guest account to a real account without losing the deck.

Do not add a paywall, payment SDK, App Store wrapper, or production deployment until every release gate in the execution plan passes.

## Non-Negotiable Safety Rules

- Never clear or replace a real deck as part of a tutorial, test, migration, or startup routine.
- Never use `git reset --hard`, discard unrelated changes, or force-push.
- Never expose service-role, AI, image-provider, cleanup, or payment secrets in `VITE_*`, client code, logs, screenshots, or Git.
- The Supabase anon key is public by design; security must come from RLS and trusted server functions.
- A client may read the shared dictionary but may not write arbitrary content to it.
- Manual card edits and uploaded images belong to the user record only.
- Keep signed-in account deletion available. Remove the separate guest-data deletion control; stale guests are removed by the scheduled backend policy.
- Do not run destructive cleanup against live users until a dry-run report has been reviewed by the user.
- Do not claim a test passed without recording the exact command or browser journey used.

## Baseline Before Any Phase

Run and record:

```text
git status --short
git branch --show-current
git log -5 --oneline
npm run build
npm run lint
npm audit --omit=dev
```

Known baseline on 2026-07-11:

- Branch: `main`
- HEAD: `b2347c7 feat: harden FSRS accounts and data lifecycle`
- Worktree: clean
- Build: passes
- Audit: 0 known production vulnerabilities
- Lint: fails with 1 error in `src/pages/Purge.jsx` near line 2303 (`index` is undefined), plus 15 hook warnings

If the observed baseline differs, stop and report the difference before editing.

## Agent Topology

Use one integration agent and read-only reviewers. Never let two agents edit the same worktree concurrently.

1. **Terra / Integrator**: owns edits, tests, commits, and phase status.
2. **Security reviewer**: read-only review of Auth, RLS, migrations, Edge Functions, secrets, storage, and abuse controls.
3. **Learning-engine reviewer**: read-only review of FSRS state conversion, ratings, due dates, Master behavior, and sync.
4. **Mobile UX reviewer**: read-only review of tutorial, gestures, overlays, iPhone layout, animation cost, and accessibility.
5. **Adversarial QA reviewer**: tests empty/error/offline/slow-network/guest/account cases after each implementation phase.

Reviewers return findings with severity, file/line, reproduction, and expected behavior. Terra fixes only confirmed issues, then reviewers re-run the focused check.

## Execution Loop

For every phase:

1. Inspect current code and reproduce the issue.
2. Save a named checkpoint branch or patch when risk is high.
3. Make the smallest coherent change.
4. Run focused tests for the changed behavior.
5. Run build and lint.
6. Test the changed flow in the browser at desktop and iPhone-sized viewports.
7. Ask the relevant read-only reviewer for a fresh pass without revealing the intended answer.
8. Fix confirmed findings and repeat until clean.
9. Commit only that phase with a descriptive message.
10. Report evidence and wait for user confirmation at the release checkpoints defined in the plan.

Do not mix security, tutorial, performance, and monetization in one commit.

## Phase Order

1. Baseline and release-blocking correctness.
2. Non-destructive Interactive Guide rewrite.
3. Recurring randomized discovery collections.
4. Trusted backend write path and database consistency.
5. Auth, RLS, guest conversion, cleanup, storage, and secret hardening.
6. FSRS and sync verification.
7. Automated tests and adversarial journeys.
8. Mobile performance and PWA correctness.
9. Beta release candidate and observability.
10. Public beta learning, then monetization design.
11. Capacitor/TestFlight/App Store only after the web beta is stable.

## Release Gates

The project is not ready to deploy unless all are true:

- `npm run build` passes.
- `npm run lint` has 0 errors and 0 warnings.
- `npm audit --omit=dev` reports 0 vulnerabilities.
- Automated FSRS, data merge, recommendation, and auth tests pass.
- Browser E2E passes for guest, upgraded account, signed-in account, and error paths.
- No blank screens or clipped/off-screen modals at 320, 375, 390, 430, 768, and 1440 px widths.
- No client bundle contains private API keys or service-role credentials.
- RLS negative tests prove one user cannot read or edit another user’s deck, logs, profile, or images.
- Tutorial completes and exits without changing deck, curriculum, FSRS state, or account data.
- Guest-to-Google/email conversion preserves the same user ID and deck.
- Scheduled guest cleanup has a dry-run mode and deletes only anonymous accounts inactive for more than 30 days.
- `+5` never duplicates a deck word, varies selections, and shows a completed state when a curriculum is exhausted.
- Translate, save, review, Master, Library edit/upload/delete/create, logout/login, Privacy, and Terms all work in the deployed preview.
- iPhone 12 mini testing shows responsive gestures and no repeated long-task freezes.

## Git Contract

Use small commits in this order where applicable:

```text
fix: clear release-blocking runtime and lint errors
fix: make interactive guide non-destructive
feat: refresh recurring discovery collections
fix: route dictionary writes through trusted backend
fix: enforce data ownership and guest lifecycle
test: cover fsrs and critical user journeys
perf: smooth mobile interactions
chore: prepare beta release candidate
```

Create an annotated beta tag only after every gate passes. Do not deploy from an uncommitted worktree.

## Required Handoff After Each Phase

Report:

- Commit hash and changed files.
- User-visible behavior changed.
- Commands/tests run and their results.
- Database or dashboard action still required.
- Remaining risks and the next phase.
- Local URL for user verification.

