# Mem-eng Final Deploy Handoff For Gemini / Antigravity

Project path:
`C:\Users\BoomBorriboon\.gemini\antigravity\scratch\mem-eng`

Current branch:
`codex/tutorial-stability-fix`

Latest important commits:
- `46f291a fix: diversify plus five word selection`
- `52c551a fix: polish library create action and loading copy`
- `c5e5a23 feat: add manual card creation in library`

## What Gemini Should Do Now

Do not redesign the app from scratch.
The product is close to deploy. Your job is to verify, deploy, and guide the user step by step.

Recommended order:
1. Run `git status`.
2. Run `npm run build`.
3. Run `npm run lint`.
4. Verify Supabase schema and environment variables.
5. Verify Cloudflare/Netlify deploy settings.
6. Deploy beta.
7. Help connect domain.
8. Plan PWA/App Store only after web beta works.

## Current Build Status From Codex

Verified on Codex:
- `npm run build` passes.
- `npm run lint` has warnings only, no errors.
- Warning count is currently 15 React hook dependency warnings. These are not beta deploy blockers.
- The JS bundle is still large, but route splitting was intentionally deferred to avoid risking smoothness before beta.

## Core Product

Mem-eng is a mobile-first vocabulary learning app:
- Translate English words.
- Save words into flashcards.
- Review with FSRS spaced repetition.
- Use visual context, Thai translation, examples, synonyms, related words, and word family where available.
- Guest users can start immediately.
- Logged-in users can save/sync progress.

Main routes:
- `/` Translate
- `/purge` Flashcards / review
- `/library` Manage saved cards
- `/profile` Settings/profile
- `/privacy`
- `/terms`

Bottom nav:
- Translate
- Flashcards
- Library
- My Profile

## FSRS / Review Logic Check

FSRS is implemented in:
`src/context/VocabContext.jsx`

Dependency:
`ts-fsrs`

Scheduler config:
- `request_retention: 0.9`
- `maximum_interval: 36500`
- `enable_fuzz: false`
- `enable_short_term: true`
- `learning_steps: ['10m']`
- `relearning_steps: ['10m']`

Review button mapping:
- Again -> `Rating.Again`
- Hard -> `Rating.Hard`
- Normal -> `Rating.Good`
- Easy -> `Rating.Easy`

Persisted FSRS fields:
- `stability`
- `difficulty`
- `reps`
- `lapses`
- `state`
- `scheduled_days`
- `elapsed_days`
- `learning_steps`
- `next_review_date`
- `lastReviewDate`

Database table:
`public.user_decks`

Mastered behavior:
- Mastered is not an FSRS rating.
- It is a product-level escape hatch.
- User can long-press the revealed flashcard center for about 2.5 seconds to mark Mastered.
- Mastered cards get `srsLevel = 'Mastered'` and next review is pushed about 100 years forward.

Potential future improvement:
- Consider enabling FSRS fuzz later for more natural scheduling distribution, but do not change before beta unless the user confirms.

## +5 Word Loading Logic

Code:
`src/context/VocabContext.jsx` -> `addNewCurriculumWords`
`src/pages/Purge.jsx` -> `handleStartWithNewWords`

Current behavior:
- Adds 5 new cards from the active curriculum.
- Active curriculum comes from `chatgpt_anki_curriculum`.
- If curriculum is missing or `Self-Study only`, backend fallback target is `Oxford 5000`.
- Words are loaded from Supabase table `curriculum_words`.
- Existing deck words are filtered out.
- It checks `global_dictionary` cache first.
- Cached words with images are preferred for speed.
- Selection was recently improved to randomize and diversify by CEFR + POS so new guests do not keep seeing the same sequence.
- If a word is not cached, it calls Supabase Edge Function `get-word-details`.
- If no image exists, it fetches one with `fetchVocabImage`.

Important:
- The app should not generate random out-of-curriculum words when a curriculum is complete.
- If all words in a selected curriculum are already in the deck, show a friendly complete state and hide/disable `+5`.
- This final "hide +5 when exhausted" polish is not fully guaranteed yet; verify before public release.

## Library Feature Status

Library is implemented at:
`src/pages/Library.jsx`

Capabilities:
- View all deck words.
- Search.
- Filter by review stage.
- Open card details.
- Edit English word.
- Edit Thai translation.
- Edit English definition.
- Search Photo.
- Upload image.
- Auto Generate Details.
- Remove from deck.
- Create a manual flashcard from the `Create flashcard` button under search.

Critical data rule:
- User-specific edits must not overwrite `global_dictionary`.
- Use `user_decks.custom_word`, `custom_meaning`, `custom_video_url`, and `custom_notes`.

## Supabase Database Checklist

Files:
- `database/schema.sql`
- `database/library_overrides_migration.sql`
- `database/curriculum_schema.sql`

Verify live Supabase has these:

`public.user_decks`
- `custom_word text`
- `custom_meaning jsonb`
- `custom_video_url text`
- `custom_notes text`
- `updated_at timestamp with time zone`
- FSRS fields listed above

Storage:
- Public bucket or signed-access bucket named `user-card-images`
- File path convention: `{user_id}/{user_deck_id}/{timestamp}.webp` or similar
- App stores URL in `user_decks.custom_video_url`

Curriculum:
- `public.curriculum_words`
- Has rows for `Oxford 5000`
- Has rows for `TOEIC Essential`
- Confirm `curriculum_name`, `word`, `pos`, `cefr_level`

Dictionary cache:
- `public.global_dictionary`
- `word`
- `meaning`
- `rich_data`
- `cefr_level`

## Guest / Anonymous User Cleanup

Important: Current guest mode uses Supabase anonymous auth.

Code:
`src/context/AuthContext.jsx`

Behavior:
- If no session exists, app automatically calls `supabase.auth.signInAnonymously()`.
- Sign out also signs in anonymously again.
- Anonymous users can create rows in `users`, `user_decks`, and review logs.

The user's goal:
- If a guest/anonymous user does not convert/login within 30 days, delete that anonymous user and related data so the database does not bloat.

Recommended implementation:
1. Confirm Supabase anonymous auth is enabled intentionally.
2. Confirm how anonymous users are represented:
   - `auth.users.is_anonymous`
   - `email is null`
   - `public.users.email is null`
   - `display_name = 'Guest'`
3. Create a cleanup SQL function or scheduled Edge Function.
4. Delete anonymous users older than 30 days that have not linked email/OAuth.
5. Because foreign keys use `ON DELETE CASCADE`, deleting auth/public users should remove related deck/log rows if relationships are correct.
6. Test on a fake anonymous user first.

Do not delete real logged-in users.
Do not run cleanup SQL blindly.
Ask the user before applying destructive database cleanup.

Suggested Supabase-side approach:
- Use Supabase scheduled Edge Function or pg_cron if available.
- Cleanup criteria should be conservative:
  - anonymous auth user
  - no email
  - created more than 30 days ago
  - no linked identities except anonymous

## Environment / Secrets

Check `.env.local` locally but do not expose secrets in chat.

Likely needed:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- API keys used by Supabase Edge Functions, not frontend.

Codex previously could not verify live Supabase schema because the local service key/check failed. Gemini should help the user verify keys and database from Supabase dashboard.

## Deploy Checklist

Before deploy:
```bash
git status
npm run build
npm run lint
```

Cloudflare Pages / Netlify:
- Build command: `npm run build`
- Output directory: `dist`
- SPA fallback must route all paths to `index.html`
- Confirm env vars are set in hosting dashboard
- Confirm Supabase redirect URLs include deployed domain

After deploy, test on iPhone:
- Open deployed URL
- Guest entry goes directly to app
- Translate a new word
- Save a card
- Use +5
- Review card with Again/Hard/Normal/Easy
- Long-press Mastered
- Open Library
- Create manual card
- Edit card
- Upload/search photo
- Sign in / link account
- Logout returns to guest mode

## Domain Checklist

Once beta URL works:
1. Buy or connect domain.
2. Add domain to Cloudflare Pages/Netlify.
3. Update DNS records as instructed by host.
4. Wait for SSL certificate.
5. Add final domain to Supabase auth redirect URLs.
6. Retest Google login and guest flow.

## App Store / PWA Plan

Do web beta first.

Then:
1. Make PWA installable:
   - manifest
   - icons
   - service worker
   - offline/fallback strategy
2. Test add-to-home-screen on iPhone.
3. If wrapping for App Store:
   - likely Capacitor
   - Apple Developer account required
   - privacy policy required
   - terms required
   - app icon and screenshots required
   - review login/guest behavior carefully

Do not start App Store packaging until web deploy is stable.

## Prompt For The User To Paste Into Gemini

Read `GEMINI_FINAL_DEPLOY_HANDOFF.md` first. Do not redesign or rebuild the app from scratch. Start by running `git status`, `npm run build`, and `npm run lint`. Then help me verify Supabase schema, anonymous guest cleanup strategy, hosting env vars, and deploy the current beta step by step. Ask me before running any destructive database cleanup. After web beta works, guide me through connecting a domain, then plan PWA/App Store.
