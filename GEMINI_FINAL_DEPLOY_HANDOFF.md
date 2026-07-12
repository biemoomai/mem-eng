# Mem-eng Release Candidate Handoff

Project path: C:\Users\BoomBorriboon\.gemini\antigravity\scratch\mem-eng
Branch: codex/release-hardening

## Scope

This branch is a release candidate. Do not redesign the UI or change product behavior. First deploy the code and backend protections exactly as listed below, then run the smoke tests. Ask the user before any destructive database test or real data deletion.

## Verified Locally

Run these before deployment:

npm run verify:release
npm run verify:fsrs
npm run lint
npm run build
npm audit --omit=dev

Current results:
- Release surface check passes.
- FSRS check passes with Again 10m, Hard 15m, Normal 2d, and Easy 8d for a new card. A second Normal review advances to 11d in the deterministic check.
- Lint has no errors or warnings.
- Production build succeeds with route-level chunks.
- Production dependency audit reports zero vulnerabilities.

## Product State

- Guest users enter directly through Supabase anonymous auth.
- Translate builds a rich card, save adds it to the deck, and Flashcards use ts-fsrs for Again / Hard / Normal / Easy.
- Mastered is a manual archive: long-press an exposed review card; it leaves ordinary review without changing its FSRS history.
- +5 selects unused words from the current curriculum with cryptographic shuffle plus CEFR/POS diversification. It does not prioritize cached words, so new guests should not see a fixed first batch.
- Movie, Music, and Business collections reappear after a review round. Their order and words are shuffled from curriculum_words; no static fixture remains.
- Library edits are private per user through user_decks.custom_* fields and never overwrite the shared dictionary.
- Interactive Guide Tour is a real Thai/English 18-step overlay. It highlights live UI, lets the learner try highlighted controls, and does not create, save, delete, reset, or rate cards itself.

## Mandatory Supabase Deployment

Apply these in order using the Supabase CLI migration workflow or SQL Editor. Record success for every file:

1. database/library_overrides_migration.sql if it is not already live.
2. supabase/migrations/20260711_release_hardening.sql
3. supabase/migrations/20260711_secure_dictionary_writes.sql
4. supabase/migrations/20260711_discovery_collections.sql
5. supabase/migrations/20260711_guest_lifecycle.sql
6. supabase/migrations/20260711_user_image_upload_policy.sql

Database expectations:
- global_dictionary is readable by the app, but browser roles cannot insert, update, or delete it.
- user_decks has FSRS fields plus custom_word, custom_meaning, custom_video_url, and custom_notes.
- curriculum_words contains main curricula and Movie Words / Music Words / Business Words.
- user-card-images is intentionally public for existing card URLs. Uploads are owner-scoped and limited to image extensions and 5 MB. It is not private photo storage.

## Mandatory Edge Function Deployment

Deploy or redeploy get-word-details, save-dictionary-card, cleanup-anonymous-users, and delete-account.

Set secrets only in Supabase, never as VITE_* hosting values:
- GEMINI_API_KEY and optional fallback-provider keys.
- SUPABASE_SERVICE_ROLE_KEY for Edge Functions only.
- CLEANUP_CRON_SECRET for the HTTP cleanup function if that scheduling path is used.
- ALLOWED_ORIGINS as a comma-separated allow-list. Include https://mem-eng.pages.dev and the final custom domain.

The web host may receive only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Rotate any former API key that was ever deployed as a VITE_* key.

## Guest Cleanup

Guest retention is 30 days from last_sign_in_at or account creation if unavailable. The migration defines the cleanup function. Configure exactly one daily scheduler after deployment:

- Preferred: a Supabase pg_cron job calling public.cleanup_anonymous_users().
- Alternative: a scheduled HTTP request to cleanup-anonymous-users with x-cleanup-secret.

Before scheduling, use only a deliberately created throwaway anonymous account older than the cutoff. Never test cleanup against real user data.

## Cloudflare Pages Deployment

1. Confirm the connected repository points to this branch and the working tree is clean.
2. Build command: npm run build.
3. Output folder: dist.
4. Keep SPA fallback to index.html for /purge, /library, /profile, /privacy, and /terms.
5. Add the deployed Pages URL and final domain to Supabase Auth redirect URLs.
6. Deploy and run the smoke list below on a phone.

## Required Production Smoke Test

- Fresh visitor enters guest mode directly.
- Translate one cached word and one new word.
- Save a card, then use +5; verify it is not a fixed A-to-Z batch.
- Finish a review round and import a Movie/Music/Business collection word.
- Review through three reveal taps, then test Again / Hard / Normal / Easy.
- Master a card and confirm it appears only in Library Mastered.
- Edit a private Library card, change an image, and remove a test card. The confirmation dialog must center and dismiss cleanly.
- Start Guide in Thai and English, try live navigation, then close it. No test word or card should appear.
- Link Google/email from guest and verify the deck remains present.
- Check Browser DevTools and Supabase logs for errors.

## Do Not Do Yet

- Do not introduce paywalls, subscriptions, App Store wrapping, analytics SDKs, or a redesign during this deployment pass.
- Do not expose AI/provider keys to the browser.
- Do not run destructive cleanup against real data without the user's confirmation.
