# Mem-eng Release Hardening Execution Plan

## Contents

1. Current State and Risk Register
2. Phase 0: Preserve and Baseline
3. Phase 1: Correctness Blockers
4. Phase 2: Interactive Guide
5. Phase 3: Discovery Collections
6. Phase 4: Data Write Architecture
7. Phase 5: Security and Guest Lifecycle
8. Phase 6: FSRS and Sync
9. Phase 7: Test System
10. Phase 8: Mobile Performance and PWA
11. Phase 9: Beta Release Candidate
12. Phase 10: Product Validation and Monetization
13. Phase 11: App Store Path
14. Acceptance Matrix

## 1. Current State and Risk Register

### Verified baseline on 2026-07-11

- Repository: `https://github.com/biemoomai/mem-eng.git`
- Branch: `main`
- HEAD: `b2347c7`
- Worktree: clean
- Production build passes.
- Production dependency audit reports 0 vulnerabilities.
- Lint fails with 1 error and 15 warnings.
- Largest current chunks are approximately:
  - app index 252 kB raw / 77 kB gzip
  - Supabase 194 kB raw / 52 kB gzip
  - Purge 145 kB raw / 31 kB gzip
  - Motion 124 kB raw / 41 kB gzip
- PWA files exist (`manifest.json`, `sw.js`), but PWA correctness and cache updates still require release testing.

### P0 risks

1. `src/pages/Purge.jsx` uses an undefined `index` in a mapped status-card key. Lint fails and the status modal can crash at runtime.
2. `src/components/Tutorial.jsx` calls `clearDeckAndResetStats()` and changes curriculum on close. A guide must never destroy user data.
3. Tutorial logic is spread across AddWord, Purge, Profile, App, localStorage flags, timers, mock cards, and synthetic clicks. This creates race conditions and stale mock data.
4. `src/context/VocabContext.jsx` still inserts/updates `global_dictionary` from the client. The release migration removes that permission, so production saves can silently become local-only.
5. Accepting client-supplied `richData` into `save-dictionary-card` can poison the shared dictionary. Shared cache writes must be generated or validated server-side.
6. Image and AI provider keys appear in client-facing `VITE_*` paths, including NongMem’s Gemini key. Any such key is recoverable from the bundle.

### P1 risks

1. The release-hardening migration exists locally but is not evidence that the live project has applied it.
2. Existing schema files and migration policy definitions differ. Live schema must be inspected rather than inferred from files.
3. Guest cleanup code exists but scheduling, secrets, dry-run behavior, cascade effects, and live deployment are unverified.
4. Public user image storage can expose personal uploads by URL. Decide private signed access or explicitly disclose public behavior.
5. Client operations frequently update local state before remote success and log errors without reconciling. This can create “saved on this phone only” cards.
6. Hook warnings in core components indicate stale closure risk in auth, navigation, translation, tutorial, and review flows.

### P2 risks

1. No dedicated automated test command exists.
2. No reliable error/latency/AI quota monitoring is visible.
3. Continuous blur, shadow, and Framer Motion work can still stutter on iPhone 12 mini.
4. PWA cache policy needs a real update/rollback test.
5. Privacy copy still mentions deleting guest data from the menu, conflicting with the desired UI.

## 2. Phase 0: Preserve and Baseline

### Actions

1. Confirm the user and Terra are not editing simultaneously.
2. Run the baseline commands from `SKILL.md`.
3. Create branch `terra/release-hardening` from the confirmed clean `main`.
4. Record the live Supabase project ref without printing keys.
5. Export a schema-only snapshot of the live Supabase database.
6. Capture screenshots of the four main routes at 390x844 before changes.
7. Record a guest test account ID and a signed-in test account ID. Never use a personal production account for destructive testing.

### Exit criteria

- Clean branch exists and baseline output is recorded.
- No production data was modified.
- Differences between repository schema and live schema are listed.

## 3. Phase 1: Correctness Blockers

### Scope

- `src/pages/Purge.jsx`
- all 15 hook warnings
- `AppErrorBoundary`
- user-facing async errors

### Actions

1. Fix the undefined status-card key by using the actual map index or a stable unique card ID. Prefer a stable ID without the index when possible.
2. Resolve every hook warning by stabilizing callbacks or correcting dependencies. Do not suppress the ESLint rule globally.
3. Audit all `setTimeout`, `setInterval`, event listeners, and async effects for cleanup on unmount.
4. Ensure network actions expose success only after the intended persistence layer confirms success.
5. Give recoverable errors a retry action; do not leave a blank phone frame.
6. Verify `AppErrorBoundary` can recover to a safe route without clearing data.

### Tests

- Open every route directly and via bottom navigation.
- Open each SRS stage modal with 0, 1, and many cards.
- Rapidly open/close menus and modals ten times.
- Navigate while translation/image requests are pending.
- Build, lint, audit.

### Exit criteria

- 0 lint errors and 0 warnings.
- No blank screen in the tested journeys.
- Commit: `fix: clear release-blocking runtime and lint errors`.

## 4. Phase 2: Interactive Guide

### Product behavior

The guide begins only when the user taps `Interactive Guide Tour`. It asks Thai or English, then explains the real app without writing data or requiring perfect demo state.

### Required coverage

1. Translate input.
2. Translate result and content sections.
3. Save/back gestures.
4. Four-page navigation and page swipes.
5. `+5` word loading and exhausted state.
6. Discovery collections.
7. Three reveal taps on a flashcard.
8. Again/Hard/Normal/Easy buttons and four swipe directions.
9. Manual one-second Master hold and how to recover it in Library.
10. Quick dictionary, sound, related words, and Add to Deck.
11. Library search and SRS filters.
12. Manual card creation.
13. Edit text, search/upload/regenerate image, and remove card.
14. Curriculum selection.
15. Memory stages and due dates.
16. Progress.
17. Settings, reminders, Privacy/Terms, guest sign-in, and signed account deletion.

### Engineering design

1. Replace the event-driven mock tutorial with a declarative step array.
2. Render the overlay through `createPortal(document.body)` so transformed route containers cannot clip it.
3. Highlight stable `data-tour` or ID targets; missing targets show explanatory fallback and never block Next.
4. Navigate between routes explicitly. Do not synthesize clicks on Save, Easy, curriculum, or account controls.
5. Never invoke translation, image generation, review update, reset, delete, or database writes.
6. Remove tutorial-only fake cards and tutorial-specific mutations from AddWord, Purge, and Profile.
7. Keep only one running flag and one language preference. Close/skip must clean timers, listeners, overlays, and flags.
8. Finishing marks the guide complete but leaves the current route and all user state intact.
9. Add an accessibility label to every guide button and trap focus inside the guide card while active.

### Test matrix

- Guest with empty deck.
- Guest with due cards.
- Signed-in user with populated deck.
- Thai and English, from every starting route.
- Next/back/skip/close/restart.
- 320x568 and 390x844 mobile sizes.
- Confirm deck JSON, curriculum, FSRS fields, and Supabase row counts are identical before and after.

### Exit criteria

- All guide journeys pass without data changes or console errors.
- Commit: `fix: make interactive guide non-destructive`.

## 5. Phase 3: Discovery Collections

### Product behavior

- Remove the visible `Browse word collections` pill under the caught-up screen.
- Keep the `Expand Your Vocabulary` modal.
- Offer it after a review round reaches caught-up state and again on a later caught-up visit, not continuously during one session.
- Randomize category order and candidate words.
- Avoid the user’s most recent recommendations and every word already in the deck.
- Show no separate Delete Guest Data button in Settings.

### Data model

Prefer explicit tables instead of pretending discovery categories are study curricula:

```text
word_collections
- id uuid primary key
- slug text unique
- title text
- active boolean
- is_premium boolean default false

word_collection_items
- collection_id uuid references word_collections on delete cascade
- word text
- weight integer default 1
- active boolean default true
- primary key (collection_id, word)
```

Public clients may read active collections/items. Only service role may write. Seed Movie, Music, and Business with at least 30 reviewed words each.

### Selection algorithm

1. Load active collection items from Supabase.
2. Remove deck words.
3. Remove the last 12 suggested words for that collection when at least 3 alternatives remain.
4. Cryptographically shuffle locally or use a trusted RPC.
5. Prefer global dictionary cache hits for speed, but reserve diversity so the same cached trio does not dominate.
6. Return 3 preview cards. Import only checked cards.
7. If no words remain, show `Collection complete` and do not call AI.
8. Cache generated details server-side once; later users reuse them.

### Failure behavior

- Loading state is visible.
- Timeout returns to collection selection with Retry.
- A partially failed set shows available cards and reports the missing count.
- Closing the modal must not immediately reopen it.

### Exit criteria

- 20 fresh guest sessions do not show a fixed first trio.
- No duplicates within a deck.
- Backend fallback works when collection tables are unavailable in local development.
- Commit: `feat: refresh recurring discovery collections`.

## 6. Phase 4: Data Write Architecture

### Target architecture

1. `get-word-details` authenticates the caller, applies quota, fetches lexical references, calls providers, validates/sanitizes output, and stores the trusted result in `global_dictionary` with service role.
2. The browser never inserts or updates `global_dictionary`.
3. `addWordToDeck` receives a trusted dictionary ID and inserts only the user’s `user_decks` row.
4. Manual cards and personal edits stay in user-owned fields or a dedicated user-card table. They never enter the global cache automatically.
5. All mutations return structured errors and are idempotent.

### Actions

1. Consolidate `save-dictionary-card` into the trusted generation path or make it accept only a server-issued signed result token. Do not trust arbitrary client `richData`.
2. Replace direct client writes in `VocabContext.jsx` with Edge Function/RPC calls.
3. Make `addWordToDeck` return failure when remote persistence fails for an online authenticated session; provide explicit Retry/Keep locally behavior if offline mode is intentionally supported.
4. Add an idempotency key for generation and deck insertion.
5. Reconcile duplicate conflicts by selecting the existing row.
6. Define one mapping layer between database snake_case and client camelCase FSRS fields.

### Exit criteria

- No `.insert`, `.update`, or `.upsert` to `global_dictionary` exists in browser code.
- A malicious client cannot poison a shared definition.
- Save/retry/duplicate behavior is deterministic.
- Commit: `fix: route dictionary writes through trusted backend`.

## 7. Phase 5: Security and Guest Lifecycle

### Auth and RLS

1. Verify anonymous auth is enabled intentionally.
2. Test guest-to-email and guest-to-Google identity linking preserves the same auth user ID.
3. Add `WITH CHECK` to ownership policies where needed.
4. Confirm RLS on `users`, `user_decks`, `user_review_logs`, usage tables, collection tables, and storage.
5. Run negative tests using two users: each cross-user select/update/delete must fail.
6. Keep signed account deletion in the menu for App Store compliance.
7. Remove guest delete UI; update Privacy copy accordingly.

### Guest cleanup

1. Add `dryRun=true` support that returns candidate IDs/counts without deletion.
2. Criteria: `is_anonymous`, no email, no linked non-anonymous identity, and `last_sign_in_at` older than 30 full days.
3. Process pagination safely and cap deletions per run.
4. Protect the scheduled function with a random secret stored only in backend secrets.
5. Verify cascading deletes for profiles, decks, logs, usage rows, and storage objects.
6. Schedule daily only after a fake old guest passes dry-run and real deletion tests.

### Secrets and providers

1. Allow only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as necessary public config.
2. Move Gemini, Groq, Cerebras, Pexels, Pixabay, Giphy, Hugging Face, FAL/Flux, cleanup, and future payment keys behind Edge Functions or remove unused integrations.
3. Remove or fully isolate NongMem so its `VITE_GEMINI_API_KEY` cannot enter production bundles.
4. Search source, Git history where practical, and built `dist` for key patterns.
5. Rotate any key ever exposed in a frontend build.

### Network and content hardening

1. Allowlist production and local origins in Edge Function CORS.
2. Add strict input lengths, schemas, timeouts, provider response size limits, and output sanitization.
3. Add per-user quotas and coarse abuse protection. Do not trust a client-provided user ID.
4. Configure Cloudflare security headers: CSP, HSTS after HTTPS is stable, X-Content-Type-Options, Referrer-Policy, and frame protection.
5. Audit rendered generated text for unsafe HTML usage.
6. Decide whether user images are private. Prefer private bucket plus signed URLs for personal uploads.

### Exit criteria

- Security reviewer reports no P0/P1 finding.
- RLS negative tests and secret scan pass.
- Guest cleanup dry-run and fake-user deletion pass.
- Commit: `fix: enforce data ownership and guest lifecycle`.

## 8. Phase 6: FSRS and Sync

### Rules to preserve

- Library: `ts-fsrs`.
- Again -> `Rating.Again`.
- Hard -> `Rating.Hard`.
- Normal -> `Rating.Good`.
- Easy -> `Rating.Easy`.
- Request retention remains 0.9 for beta unless product testing justifies change.
- Master is a manual archive action, not an FSRS rating.
- Response time is logged for future personalization but must not secretly modify official FSRS math in beta.

### Test cases

1. New card previews and updates for all four ratings.
2. Again during learning and review.
3. Alternating Easy/Normal/Hard/Again over multiple dates.
4. Device clock/timezone around Bangkok midnight and DST-capable zones.
5. App close/reopen and second-device sync.
6. Master, edit in Library, unmaster/relearn if supported, and no accidental recurrence.
7. Offline review queue followed by reconnect, if offline review is supported.
8. Legacy cards missing individual FSRS fields migrate safely.
9. Review logs belong to the correct user and card event.

### Source-of-truth decision

Use Supabase as authoritative for signed/guest-auth sessions and localStorage as a cache. Define conflict rules using `updated_at`; do not silently overwrite newer remote data with stale local data.

### Exit criteria

- Deterministic unit tests cover field conversion and rating mapping.
- Integration tests prove persistence and reload.
- No custom “hesitation penalty” changes scheduler state in beta.
- Commit included with the test phase unless code changes are required.

## 9. Phase 7: Test System

### Add scripts

```text
npm run test
npm run test:watch
npm run test:e2e
npm run check
```

`check` should run lint, unit/integration tests, production build, and production audit.

### Unit/integration coverage

- FSRS conversion and rating mapping.
- Word normalization and duplicate detection.
- Random collection selection and recent-item exclusion.
- Local/remote card merge.
- Guest upgrade retains deck.
- Tutorial reducer/state machine has no data side effects.
- Error handling for API timeout, quota, invalid word, missing image, and Supabase failure.

### E2E journeys

1. First guest visit -> Translate.
2. Translate cached word -> save.
3. Translate uncached word -> loading -> save.
4. +5 -> five unique words -> review all ratings.
5. Caught up -> collection -> preview -> import selected.
6. Quick dictionary -> related word -> add.
7. Library create/edit/upload/regenerate/remove.
8. Guide Thai and English.
9. Guest links Google/email and deck remains.
10. Signed user deletes account.
11. Quota exceeded and provider outage.
12. Refresh/direct route/offline shell/update service worker.

Use Playwright with Chromium and WebKit. Use real Supabase only in an isolated test project; otherwise mock at the network boundary.

### Exit criteria

- Tests are repeatable and do not depend on personal accounts.
- Commit: `test: cover fsrs and critical user journeys`.

## 10. Phase 8: Mobile Performance and PWA

### Performance budget

- Primary interaction response under 100 ms where no network is required.
- No repeated main-thread task above 50 ms during swipe/reveal.
- Route transition must not render multiple full pages simultaneously.
- Images use fixed dimensions, suitable resolution, lazy decoding, and cancellation for stale requests.
- Continuous animations use transform/opacity only and stop when offscreen or the document is hidden.

### Actions

1. Profile iPhone 12 mini first; do not guess from desktop.
2. Remove layout reads/writes from pointer-move loops.
3. Reduce live backdrop filters and animated large shadows while preserving the glossy visual identity.
4. Replace perpetual shimmer with a low-cost pseudo-element animation or a static highlight where needed.
5. Memoize expensive card parsing and avoid remounting unrelated routes.
6. Ensure touch gestures do not conflict with vertical scroll, buttons, modals, or browser navigation.
7. Respect `prefers-reduced-motion` automatically instead of restoring a confusing Low Graphics toggle.
8. Verify service worker update flow, offline fallback, old-cache eviction, and direct route navigation.
9. Validate manifest name encoding, maskable icon safe zone, Apple touch icon sizes, and standalone safe areas.

### Viewports

- 320x568
- 375x667
- 390x844
- 430x932
- 768x1024
- 1440x900

### Exit criteria

- No overlap, clipping, horizontal scroll, or inaccessible control.
- Gesture/reveal/+5 interactions remain responsive on real iPhone 12 mini.
- Commit: `perf: smooth mobile interactions`.

## 11. Phase 9: Beta Release Candidate

### Before deployment

1. Freeze scope. No payment work.
2. Run all release gates.
3. Apply reviewed Supabase migrations to staging, then production.
4. Deploy Edge Functions with secrets.
5. Verify quotas and collection seeds.
6. Add error reporting with privacy disclosure. Sentry free tier or equivalent is acceptable.
7. Add minimal product analytics events without recording vocabulary text:
   - guest_started
   - translation_completed
   - card_saved
   - first_review_completed
   - five_cards_added
   - collection_imported
   - account_linked
   - day_1_returned / day_7_returned
8. Deploy a preview and run E2E against it.
9. User manually tests on iPhone and iPad.
10. Commit release notes and tag only after approval.

### Rollback

- Keep the previous Cloudflare deployment available.
- Database migrations must be backward-compatible or have an explicit reviewed rollback.
- Never roll back by deleting user rows.

## 12. Phase 10: Product Validation and Monetization

### Beta first

Release free to a small TOEIC group after technical gates pass. A public group validates product demand; it must not be the first time destructive or security paths are tested.

Measure for 2-4 weeks:

- percentage reaching first saved card
- percentage completing first review
- day-1 and day-7 return rate
- words saved and reviewed per active user
- AI generation cost per active user
- account-link conversion
- crash/error-free sessions
- which curriculum and collection users choose

### Monetization decision

Do not build billing until users return and one limit is genuinely expensive. Keep review and existing cards free. Reasonable future premium candidates:

- higher daily new-AI-word allowance
- advanced curricula/collections
- unlimited custom image generation
- deeper statistics and personalized study insights
- cross-device backup beyond a free allowance

Do not charge for basic access to a user’s existing deck. Avoid ads during study.

For an initial Thailand experiment, test one simple offer rather than many tiers. Pricing must be chosen after real cost and retention data. Do not hard-code a price in this release plan.

## 13. Phase 11: App Store Path

1. Stabilize the web beta first.
2. Wrap with Capacitor rather than rebuilding the product in native code.
3. Add native notification and secure-storage plugins only when needed.
4. If paid digital features are sold inside iOS, use Apple In-App Purchase/StoreKit (commonly via RevenueCat). Do not route users to Stripe inside the iOS app for digital feature unlocks.
5. Add restore purchases, subscription status sync, account deletion, support URL, privacy labels, and review notes.
6. Use TestFlight before public App Store submission.
7. Keep the web version and native wrapper on the same backend contract.

## 14. Acceptance Matrix

| Area | Must pass |
|---|---|
| Build | Production build succeeds from clean checkout |
| Static quality | 0 lint errors, 0 warnings, 0 production audit findings |
| Guest | Immediate entry, deck persists, no login wall |
| Upgrade | Google/email linking preserves user ID and deck |
| Translate | Cached/uncached/invalid/quota/provider-down states work |
| +5 | Exactly five when available, varied, unique, exhausted state |
| Review | Four ratings, due scheduling, reload, timezone, logs |
| Master | Manual only, no normal recurrence, editable/recoverable |
| Collections | Recurring but not spammy, shuffled, no duplicates |
| Library | Search/filter/create/edit/image/remove all persist correctly |
| Tutorial | Thai/English, complete, restartable, zero data mutation |
| Security | RLS isolation, trusted cache writes, no private client keys |
| Cleanup | Dry-run, >30-day anonymous only, cascade verified |
| Mobile | No overlap; smooth on iPhone 12 mini and iPad |
| PWA | Install, direct routes, offline shell, update and rollback |
| Legal | Privacy/Terms match actual data behavior and providers |
| Operations | Error monitoring, quotas, rollback, support contact |

Terra may call the release candidate complete only when every row has evidence attached.
