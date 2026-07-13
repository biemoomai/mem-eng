---
name: mem-eng-launch-pilot
description: Post-hardening launch workflow for Mem-eng. Use after the release candidate passes local checks to deploy and verify Supabase and Cloudflare, connect a domain, run a small beta, measure cost and retention, decide monetization, and prepare Capacitor, TestFlight, and App Store submission without exposing secrets or risking user data.
---

# Mem-eng Launch Pilot

Guide Mem-eng from a locally verified release candidate to a measured public beta and, only after the beta is stable, to the App Store. Lead the nontechnical owner one action at a time and perform every action that does not require the owner to sign in, spend money, approve a destructive operation, or accept a legal agreement.

## Operating Rules

- Work from `C:\Users\BoomBorriboon\.gemini\antigravity\scratch\mem-eng`.
- Read `GEMINI_FINAL_DEPLOY_HANDOFF.md` and the current Git history before acting. Treat code as authoritative when a document is stale, then update the document.
- Never ask the owner to paste passwords, access tokens, service-role keys, API keys, recovery codes, or card details into chat.
- Ask the owner to authenticate in the provider's own browser or CLI only when that provider is required.
- Ask for explicit approval before applying live database migrations, deleting live data, changing DNS nameservers, purchasing a domain or Apple membership, enabling billing, or submitting an App Store build.
- Keep the previous Cloudflare deployment available until the new production smoke test passes.
- Never force-push, rewrite shared history, or use destructive Git recovery commands.
- Never mix release deployment with unrelated redesigns or new product features.
- Report what changed, evidence, cost incurred, user action required, rollback, and next step after every phase.

## Entry Gate

Before any live deployment:

1. Confirm which Interactive Guide commit is the product choice. The current action-gated Guide performs real Save and rating actions; an older explanatory Guide does not. Do not deploy while the handoff describes a different version from the code.
2. Confirm the working tree is clean and the intended branch contains all release commits.
3. Run:

```text
npm run verify:release
npm run verify:fsrs
npm run lint
npm run build
npm audit --omit=dev
```

4. Confirm there are no open P0/P1 findings, private keys in the browser bundle, or uncommitted migrations.
5. Create a named Git checkpoint before touching production.

Stop and repair the release candidate if any entry gate fails.

## Provider Access

Request access only when its phase begins:

1. **GitHub**: authenticate the repository owner so the release branch can be pushed and merged. Do not request a personal access token in chat.
2. **Supabase**: authenticate to the existing Mem-eng project and confirm the project reference. Secrets must be entered directly in Supabase.
3. **Cloudflare**: authenticate to the Pages project that serves `mem-eng.pages.dev`.
4. **Domain registrar**: wait until the owner selects and approves a domain purchase. Prefer Cloudflare Registrar when suitable because DNS and Pages are already there.
5. **Apple**: wait until the web beta is stable. Require the owner's Apple Developer account and access to a Mac with Xcode or a trusted cloud Mac.
6. **Payments**: do not connect before beta evidence. For paid digital iOS features, use Apple In-App Purchase, commonly synchronized through RevenueCat.

Do not require GitHub CLI, Supabase CLI, or Wrangler to be installed globally. Use a repository-local or temporary CLI when practical.

## Phase 1: Freeze the Release Candidate

1. Resolve the final Interactive Guide choice and update every handoff statement to match.
2. Review the complete diff from `main` to the release branch.
3. Re-run the entry-gate commands.
4. Test desktop and phone-sized layouts for Translate, Flashcards, Library, Profile, Login, Privacy, and Terms.
5. Commit documentation and create a release-candidate checkpoint.

Exit only when the branch is clean and reproducible.

## Phase 2: Verify and Deploy Supabase

1. Inspect the live schema and migration history. Never infer live state only from repository files.
2. Capture a schema-only snapshot and list pending migrations.
3. Review every pending migration for backward compatibility and ownership policies.
4. Apply reviewed migrations in the order documented by `GEMINI_FINAL_DEPLOY_HANDOFF.md`.
5. Deploy or redeploy:
   - `get-word-details`
   - `save-dictionary-card`
   - `cleanup-anonymous-users`
   - `delete-account`
6. Configure secrets directly in Supabase. The browser host may receive only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
7. Set `ALLOWED_ORIGINS` for local development, `https://mem-eng.pages.dev`, and the final domain when known.
8. Run two-user negative tests proving one account cannot read, edit, or delete another account's deck, logs, profile, or uploaded images.
9. Test guest-to-Google/email linking and confirm the same user ID and deck survive.
10. Run guest cleanup in dry-run mode. Test deletion only with a deliberately created throwaway anonymous account older than 30 days, then schedule one daily cleanup path.

Stop on any unexplained policy, migration, or account-linking failure. Do not delete real user data to prove cleanup.

## Phase 3: Deploy Cloudflare Pages

1. Push and merge the approved release branch without rewriting history.
2. Confirm Cloudflare Pages uses `npm run build` and output directory `dist`.
3. Configure only the public Supabase URL and anon key in Pages.
4. Preserve SPA routing for `/purge`, `/library`, `/profile`, `/login`, `/privacy`, and `/terms`.
5. Deploy a preview first, then run the full production smoke journey.
6. Promote to production only after the preview passes.
7. Keep the prior deployment as rollback until production is verified on desktop, iPhone, and iPad.

The smoke journey must cover guest entry, cached and uncached translation, Save, randomized +5, recurring discovery collections, every FSRS rating, manual Master, Library create/edit/image/remove, Thai and English Guide, account linking, direct-route refresh, and provider/error states.

## Phase 4: Domain and PWA

1. Help the owner choose a short, pronounceable domain only after the production preview is stable.
2. Ask for purchase approval, then connect DNS to Cloudflare Pages.
3. Wait for TLS, verify redirects, and add the domain to Supabase Auth redirect URLs and Edge Function origin allowlists.
4. Verify the manifest, icons, standalone safe areas, service-worker updates, direct routes, old-cache eviction, and offline shell on a real phone.
5. Do not enable HSTS until HTTPS and subdomain behavior are confirmed.

## Phase 5: Small TOEIC Beta

Release free to a small TOEIC group before adding payment. Run the beta for two to four weeks and collect only the minimum events needed to evaluate the product. Do not record vocabulary text, translations, emails, or card content in analytics.

Measure:

- visitor to first translation
- first saved card
- first completed review
- +5 and collection usage
- account-link conversion
- day-1 and day-7 return
- reviewed words per active learner
- error-free sessions and API failures
- AI and infrastructure cost per active learner

Add a visible support/feedback route and keep a rollback path. Fix crashes, data loss, account-linking, scheduling, and quota failures before expanding the beta.

## Phase 6: Monetization Decision

Do not add billing merely because the app can charge. Add it only after real learners return and actual cost data identifies a sustainable limit.

Keep basic review and access to an existing deck free. Candidate paid value includes higher new-AI-word limits, premium curricula, custom image generation, advanced statistics, and personalized study insights. Avoid ads during study.

Start with one simple offer. Recalculate pricing from observed AI cost, payment fees, tax, support burden, and target margin. Do not hard-code a price before this calculation.

## Phase 7: TestFlight and App Store

1. Keep the React/Supabase backend contract and wrap the stable web app with Capacitor.
2. Build on a Mac with Xcode using a unique bundle identifier.
3. Add native notifications and secure storage only when their product behavior is defined.
4. Verify icons, launch screen, safe areas, keyboard, offline behavior, authentication callbacks, privacy permission strings, and account deletion.
5. If paid digital features exist, implement StoreKit purchases, restore purchases, and server-side entitlement sync. Use Apple In-App Purchase rather than an external checkout inside iOS.
6. Complete App Privacy details from actual data behavior, not guesses.
7. Provide support, Privacy, and Terms URLs plus clear App Review notes for guest mode, account linking, and subscriptions.
8. Test with TestFlight before public submission.
9. Ask the owner for explicit approval immediately before submitting to App Review.

## Go/No-Go Gates

Do not advance when any relevant condition fails:

- Build, lint, FSRS, release verification, or production audit fails.
- A private secret appears in source or built assets.
- Live RLS isolation is unproven.
- Guest upgrade can lose the deck.
- The Guide mutates data contrary to the chosen product behavior.
- +5 duplicates or repeatedly returns a fixed first batch.
- Production smoke testing has a blank screen, clipped modal, or unrecoverable provider failure.
- Guest cleanup lacks a reviewed dry run.
- The owner has not approved a paid, destructive, DNS, or App Store action.

## Completion Report

At the end of each phase, provide:

```text
Phase:
Completed:
Evidence:
Live changes:
Cost incurred:
Owner action required:
Rollback:
Remaining risks:
Next step:
```

Call the launch complete only when the production web beta is verified, operations and rollback are documented, and the owner knows whether the next evidence-based step is iteration, monetization, or TestFlight.
