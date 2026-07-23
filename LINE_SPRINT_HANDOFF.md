# Mem-eng LINE Sprint

## Version safety

- Stable rollback point: tag `mem-eng-full-v1` at commit `6a5adad`.
- LINE work branch: `codex/line-sprint`.
- Do not rewrite or delete the stable tag.
- Deploy LINE work only after the migration, Edge Functions, LIFF settings, and smoke tests below pass.

## Intended user flow

1. A learner opens the LINE Official Account named "Ai Prae" (Thai display name configured in LINE Official Account Manager).
2. They type an English word or short phrase.
3. The bot checks the shared dictionary first.
4. It returns a compact card with CEFR, part of speech, Thai meaning, a short English definition, and one example.
5. The learner taps Save. The word is inserted into that LINE user's existing Mem-eng deck.
6. The learner taps Start and opens the LIFF app directly on `/purge`.
7. The same deck is visible in LINE, Flashcards, and Library.
8. A misspelling gets a correction choice. The learner can accept it or force the original spelling; forced cards display a warning.
9. The Rich Menu exposes Start, My Library with CEFR counts, and Help.

## Architecture

- LINE Messaging API sends signed events to `line-webhook`.
- `line-webhook` verifies the raw HMAC signature before any database write.
- `line_identities` is the canonical LINE-to-Supabase user mapping.
- A first LINE interaction creates one normal Supabase Auth user with a private synthetic email.
- `global_dictionary` is checked before any AI call.
- Only uncached words call `get-word-details`.
- Save writes to `user_decks`, preserving existing FSRS defaults.
- LIFF calls `liff-auth`, which verifies the LINE token and returns a real Supabase access/refresh session.
- Google linking uses Supabase identity linking so a new Google identity can keep the same deck.
- LINE IDs are normalized before storage and are trusted only from server-owned mappings.
- Webhook events use a reclaimable processing lease so retries cannot duplicate saves or remain stuck forever.
- Forced/nonstandard spellings are private user cards and never enter the shared dictionary cache.

## Required secrets

Set these as Supabase Edge Function secrets. Never place them in Vite variables or commit them.

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `LINE_LOGIN_CHANNEL_ID`
- `LINE_LIFF_URL` (base URL such as `https://liff.line.me/<LIFF_ID>`)
- `LINE_START_URL` (optional; defaults to `LINE_LIFF_URL/purge`)
- `LINE_CONNECT_URL` (optional; defaults to the LIFF base plus `/login?auth=1`)
- `LINE_BOT_NAME` (recommended: `Ai Prae`; the public Thai display name is configured in LINE Official Account Manager)
- `APP_ORIGIN` (production app origin)
- Existing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`

The web build also needs:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_LIFF_ID`

## Supabase deployment order

From this repository:

```powershell
npx supabase link --project-ref ddhbzcpixjacpyoqfpzh
npx supabase db push
npx supabase functions deploy get-word-details
npx supabase functions deploy line-webhook --no-verify-jwt
npx supabase functions deploy liff-auth --no-verify-jwt
```

Webhook endpoint:

```text
https://ddhbzcpixjacpyoqfpzh.supabase.co/functions/v1/line-webhook
```

The service-role key must stay server-side. The browser must only receive the Supabase publishable/anon key.

## LINE console setup

The Messaging API channel and LINE Login channel must belong to the same LINE Provider. Treat this as a blocking requirement because LINE user IDs are only stable within one Provider.

1. Messaging API channel:
   - Set the webhook URL above.
   - Enable webhooks.
   - Disable the default auto-reply if it duplicates bot replies.
   - Issue a long-lived channel access token.
2. LINE Login channel:
   - Create or reuse the LIFF app.
   - Scope: `profile` and `openid`.
   - Endpoint URL: `https://mem-eng.pages.dev` (the Rich Menu adds `/purge`).
   - Add the production domain to allowed callback URLs.
3. Set `LINE_LOGIN_CHANNEL_ID` to the channel ID that owns the LIFF app.
4. Change the Official Account display name and profile image manually in LINE Official Account Manager.

## Rich Menu

Generate and inspect the 2500 x 843 JPEG:

```powershell
npm run line:render-menu
```

Install it after setting local one-time environment variables:

```powershell
$env:LINE_CHANNEL_ACCESS_TOKEN = "<set locally, never commit>"
$env:LINE_LIFF_URL = "https://liff.line.me/<LIFF_ID>"
npm run line:setup-menu
```

The source template is `line/rich-menu-template.html`. The generated asset is
`public/line/ai-prae-rich-menu-v1.jpg`.

## Quota behavior

- Cached dictionary words: no AI generation quota is consumed.
- New words requested through LINE: 10 per LINE user per day.
- New words requested by a signed-in web user: 60 per day.
- Existing flashcard review does not call AI.

- LIFF session creation is also rate-limited by LINE user and client IP.
These limits come from `consume_word_generation_quota` and can be changed later for paid plans.

## Account linking

- The common path is supported: LINE user first, then Connect Google.
- In Supabase Dashboard, enable **Authentication > Providers > Manual Linking** before testing the Connect Google button.
- It keeps the same Supabase user ID and deck.
- If a Google identity already belongs to a different existing Mem-eng account, do not auto-merge in the client. Build a separate, audited server-side merge flow with explicit confirmation before public launch.

## Release smoke test

1. Send a cached word in LINE; the card should be fast.
2. Send a new valid word; a loading indicator should appear and a card should return.
3. Send a misspelling; test both suggestion and force-original actions.
4. Save a card twice; the second tap must report that it already exists.
5. Open My Library; total and A1-C2 counts must match the app.
6. Tap Start; LIFF must open `/purge` with the same deck.
7. Close and reopen LINE; the same user and deck must remain.
8. Connect a new Google identity; the deck must remain.
9. Send a forged/unsigned request to the webhook; it must return HTTP 401.
10. Run `npm run lint`, `npm run build`, and `npm audit`.

## Rollback

To inspect the stable app:

```powershell
git switch --detach mem-eng-full-v1
```

To create a safe rollback branch:

```powershell
git switch -c rollback/mem-eng-full-v1 mem-eng-full-v1
```

Do not force-push `main`. Keep the LINE sprint in its own commit/tag until production smoke tests pass.
