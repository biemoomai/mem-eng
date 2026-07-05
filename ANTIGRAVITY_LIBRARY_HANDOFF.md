# Mem-eng Library Feature Handoff For Antigravity

Project path:
`C:\Users\BoomBorriboon\.gemini\antigravity\scratch\mem-eng`

Current product:
Mem-eng is a vocabulary app with Translate, Flashcards, FSRS review, Guest mode, Supabase auth/database, and cached global word data.

Important: do not revert existing Codex work. Start by running:
```bash
git status
npm run build
```

Before editing, create a backup patch:
```bash
git diff --binary > scratch/pre-library-feature.patch
```

## User's Next Feature Request

Add a 4th bottom navigation item: `Library`.

Current bottom nav:
- Translate
- Flashcards
- My Profile

Desired bottom nav:
- Translate
- Flashcards
- Library
- My Profile

Library is where users manage every word in their own deck.

## UX Goal

The Library should feel like the existing app:
- Dark / glass / premium / minimal.
- Mobile-first.
- Fast and simple.
- No crowded dictionary-page feeling.
- Cards should be easy to scan.
- Editing should feel safe, with clear save/cancel states.

User wants Library to support:
- View all saved words.
- Search words.
- Filter by review stage if useful: Learning / Hard / Normal / Easy / Mastered.
- Tap a word to open detail/edit.
- Edit English word text shown to this user.
- Edit English definition/context text shown to this user.
- Edit Thai translation shown to this user.
- Replace/regenerate image.
- Upload/select custom image for this user.
- Delete/remove word from this user's deck.

## Critical Data Rule

Do not overwrite `global_dictionary` when the user edits personal wording or images.

`global_dictionary` is shared cache for all users.
Personal edits must be stored per user/deck row so one user's custom image/translation does not change everyone else's card.

## Suggested Database Design

Current core tables are in:
`database/schema.sql`

Relevant current tables:
- `global_dictionary`: shared word/rich_data cache.
- `user_decks`: user-owned deck row with FSRS data.

Add user-specific override fields to `user_decks`, or create a separate table.

Safer minimal option:
Add nullable columns to `user_decks`:
```sql
alter table public.user_decks
add column if not exists custom_word text,
add column if not exists custom_meaning jsonb,
add column if not exists custom_video_url text,
add column if not exists custom_notes text,
add column if not exists updated_at timestamp with time zone default now();
```

Then app display order should be:
1. If `user_decks.custom_*` exists, use that.
2. Otherwise use `global_dictionary` shared data.

For local/guest mode:
- Keep using localStorage card fields.
- Store custom edits directly on the local card object:
  - `customWord`
  - `customMeaning`
  - `customVideoUrl`

## Supabase Storage For User Images

If user uploads their own image:
- Use Supabase Storage bucket, e.g. `user-card-images`.
- Suggested path:
  `user-card-images/{user_id}/{user_deck_id}/{timestamp}.webp`
- Store resulting public/signed URL in `user_decks.custom_video_url`.

Do not store huge base64 images in database.

If Storage is too much for the first pass:
- Build UI and local guest upload preview first.
- Ask user before adding Supabase Storage migration.

## Frontend Files To Inspect

Start here:
- `src\App.jsx`
  - bottom navigation
  - route definitions
  - hamburger/menu/global app shell
- `src\pages\Purge.jsx`
  - flashcard image regenerate/save patterns
  - word card display logic
  - existing modal styles
- `src\pages\Profile.jsx`
  - existing status card modal/list design that can inspire Library cards
- `src\context\VocabContext.jsx`
  - deck loading/sync
  - `updateWordProperties`
  - add/update/delete word APIs
- `src\utils\imageHelper.js`
  - `fetchVocabImage`

## Suggested Implementation Plan

1. Add route:
   `/library`

2. Add new page:
   `src/pages/Library.jsx`

3. Update bottom nav in `src/App.jsx`:
   Add Library as the 3rd item, then move My Profile to 4th.
   Use an icon from `lucide-react`, e.g. `Library`, `BookOpen`, or `Layers`.

4. In `VocabContext.jsx`, add helper functions:
   - `updateUserCardOverride(cardId, overrides)`
   - `removeUserCard(cardId)` if not already covered by `deleteWordFromDeck`
   - optional `uploadUserCardImage(file, cardId)`

5. Library page UI:
   - Header: `Library`
   - Search input.
   - Small filter chips or segmented control.
   - Word list with compact cards:
     - word
     - POS/CEFR
     - short definition
     - due/review stage
     - thumbnail image
   - Detail/edit modal:
     - image preview
     - regenerate image
     - upload image
     - editable English word label
     - editable definition
     - editable Thai translation
     - save button
     - remove from deck button

6. Avoid overbuilding:
   Do not implement full dictionary mode, cloud image cropping, or advanced bulk edit unless the user asks.

7. Verify:
```bash
npm run build
npm run lint
```

Open:
- `/`
- `/purge`
- `/profile`
- `/library`

Test:
- guest mode
- logged-in mode if available
- edit one card locally
- regenerate one image
- upload one image if implemented
- bottom nav route switching

## Important Recent Fixes To Preserve

- App root has `notranslate` to prevent Chrome/Google Translate from breaking React DOM.
- Flashcard `+5` loader has duplicate-click protection.
- Flashcard image regenerate should update:
  - active image on screen
  - `videoUrl`
  - `meaning.savedSceneImages[0]`
- Profile word-count card uses the glass shine animation.
- NongMem runtime was removed/disabled for smoother app performance. Do not re-add it unless user explicitly asks.

## Prompt The User Can Paste Into Antigravity

Read `ANTIGRAVITY_LIBRARY_HANDOFF.md` first. Do not revert existing changes. Run `git status` and `npm run build` before editing, then save a patch backup to `scratch/pre-library-feature.patch`.

Build the next Mem-eng feature: add a 4th bottom nav item called `Library`. It should let users manage all saved words in their own deck. They should be able to search words, open a word, edit the user-facing English/Thai text, regenerate or upload a custom image, and remove a word from their deck.

Important: personal edits/images must not overwrite `global_dictionary` because that data is shared by all users. Store user-specific overrides on `user_decks` or a dedicated user override table. For guest/local mode, store overrides on the local card object.

Keep the UI consistent with the current dark glass mobile design. Keep it simple and fast. After finishing, run build/lint and let me test locally.
