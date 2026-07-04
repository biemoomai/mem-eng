# Jameng / Mem-eng AI Handoff

Project path:
`C:\Users\BoomBorriboon\.gemini\antigravity\scratch\mem-eng`

This project is the user's vocabulary learning app. Core product goal:
1. Translate English words with rich context.
2. Save words into flashcards.
3. Review them with spaced repetition so the user remembers vocabulary efficiently without over-reviewing.

## Current Important State

Branch currently used by Codex:
`codex/tutorial-stability-fix`

Recent work already done:
- Tutorial/runtime stability fixes.
- Flashcards caught-up state has a clickable `Tap + 5 Word` badge that loads 5 more words.
- All previous `+10` new-word flows were changed to `+5`.
- Added official `ts-fsrs` scheduling logic in `src/context/VocabContext.jsx`.
- FSRS review ratings are Easy / Normal / Hard / Again.
- `Mastered` is a product-level action, not an FSRS rating. In Flashcards, long-press the revealed card center for 2.5 seconds to mark the word as Mastered. Mastered words should not naturally return to reviews.
- Added simple legal pages:
  - `/privacy`
  - `/terms`
- Login and hamburger menu link to Privacy / Terms unobtrusively.
- Updated `react-router-dom` / `react-router` to fix npm audit issue.
- `npm audit --omit=dev` reported 0 vulnerabilities after the router update.
- `npm run build` passes.
- `npm run lint` passes with warnings only. There are currently 13 React hook dependency warnings; these are not deploy blockers for beta.

## Backup Patches

Before making risky changes, create a new patch backup first.
Existing backup patches:
- `scratch/pre-codex-tutorial-fix.patch`
- `scratch/pre-fsrs-master-liked-version.patch`
- `scratch/pre-audit-router-fix.patch`
- `scratch/pre-privacy-terms.patch`

If the user asks to go back before a specific change, apply the relevant patch carefully and verify with build.

Before new edits, run:
```bash
git status
npm run build
```

If making UI or behavior changes, create a new backup patch first:
```bash
git diff --binary > scratch/pre-next-ui-menu-change.patch
```

Do not run destructive commands such as `git reset --hard` or `git checkout -- .` unless the user explicitly asks.
Do not revert unrelated user changes.

## Current Local Dev URLs

Computer-only local URL:
`http://127.0.0.1:5173/`

Network test URL used for iPhone on same Wi-Fi:
`http://192.168.1.39:5174/`

If iPhone cannot open it, start Vite with:
```bash
npm run dev -- --host 0.0.0.0 --port 5174
```

Windows Firewall may need to allow Node/Vite on Private network.

## Next UX Task Requested By User: Hamburger Menu Redesign

The screenshot/menu the user wants to improve is the full-screen hamburger menu in `src/App.jsx`.
The user feels this menu has poor UX and wants it simplified before deploy.

Requested direction:
- Remove the top navigation mode cards inside the hamburger menu:
  - Translate
  - Flashcards
  - My Profile
- Keep main app bottom nav as-is unless user says otherwise.
- Change the menu layout into one vertical list, one setting per row, easier to scan and tap.
- Appearance can stay, but make it simpler in a row style.
- Quick Buttons can stay as a row setting.
- Nav Dock can stay as a row setting.
- Low Graphics can stay as a row setting.
- Nong Mem should remain in the code as BETA, but should be locked/disabled/hidden from normal use for now. The user does not want users using Nong Mem yet.
- Nong Mem Sound should probably be hidden or disabled if Nong Mem is locked.
- Keep Interactive Guide Tour.
- Keep Reset Deck & Stats.
- Keep Privacy / Terms links, small and unobtrusive.
- Keep Sign Out.

## Reminder UX Direction

Current reminder UI is time-based. The user wants it changed conceptually.
Desired product behavior:
- Not a fixed daily time picker.
- Instead, reminders should notify when words become due again from FSRS review scheduling, e.g. Easy / Normal / Hard / Again due times.
- Should not spam notifications.
- At most one notification every 4 hours.
- Intended future behavior is phone lock-screen / system notification.

Important implementation note:
- Real phone notifications require browser Notification permission and probably PWA setup for best behavior.
- For beta, it may be safer to first rename/reframe the menu setting as something like `Due reminders` with an on/off toggle, then implement actual notification permission flow separately.
- Do not silently request notification permission in an annoying way. Ask the user before adding permission prompts.

## Suggested Safe Implementation Plan For Antigravity

1. Read `src/App.jsx` around the hamburger menu overlay.
2. Create backup patch:
   `git diff --binary > scratch/pre-menu-ux-redesign.patch`
3. Refactor only the menu UI first. Keep app routes and FSRS logic untouched.
4. Replace the compact grid layout with a vertical row list.
5. Remove top mode cards from menu only.
6. Lock/hide Nong Mem controls for beta.
7. Change Reminder UI text from fixed time picker to a low-pressure setting, but do not implement full push notification system unless explicitly confirmed by the user.
8. Run:
   `npm run build`
   `npm run lint`
9. Open local app and test:
   - `/`
   - `/purge`
   - `/profile`
   - hamburger menu open/close
   - Privacy/Terms links
   - Tutorial button
   - Reset modal opens but do not confirm reset unless user asks

## Suggested Prompt For The User To Paste Into Antigravity

Please continue from the current Jameng project state. First read `ANTIGRAVITY_HANDOFF.md`, then run `git status` and `npm run build`. Do not revert any existing work. Before editing, save a patch backup to `scratch/pre-menu-ux-redesign.patch`.

I want to improve the hamburger menu UX in `src/App.jsx`:
- Remove the Translate / Flashcards / My Profile cards from the hamburger menu.
- Keep the main bottom navigation in the app.
- Redesign the menu as a simple vertical list of rows, one setting per row.
- Keep Appearance, Quick Buttons, Nav Dock, Low Graphics.
- Change Reminder from a time input into a concept for due-card reminders. For now, make it a simple on/off row like `Due reminders`; do not build full phone push notifications yet unless you ask me first.
- Nong Mem is BETA. Keep the code, but lock/hide the UI controls so normal users cannot turn it on yet. Hide/disable Nong Mem Sound too if needed.
- Keep Interactive Guide Tour, Reset Deck & Stats, Privacy/Terms, Sign Out.
- Keep the design dark/glass and mobile-friendly.
- After editing, run build and lint, then let me test locally.