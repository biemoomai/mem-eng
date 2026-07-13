# Mem-eng Handoff

For the current release candidate, read GEMINI_FINAL_DEPLOY_HANDOFF.md first. It has the verified commands, mandatory migrations, Edge Function setup, security constraints, guest cleanup plan, and production smoke test.

Do not use old backup notes as deployment instructions. Do not redesign the app before this release candidate has been deployed and smoke-tested.

After the release candidate is locally approved, use `.agents/skills/mem-eng-launch-pilot/SKILL.md`. It defines the exact order for Supabase verification, Cloudflare deployment, domain/PWA work, a small TOEIC beta, monetization evidence, TestFlight, and App Store submission. Lead the owner one step at a time and never request secrets in chat.
