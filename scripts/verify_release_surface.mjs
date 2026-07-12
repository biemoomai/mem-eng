import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const required = (value, needle, label) => assert(value.includes(needle), label);

const wordFunction = read('../supabase/functions/get-word-details/index.ts');
const saveFunction = read('../supabase/functions/save-dictionary-card/index.ts');
const dictionaryMigration = read('../supabase/migrations/20260711_secure_dictionary_writes.sql');
const guestMigration = read('../supabase/migrations/20260711_guest_lifecycle.sql');
const imagePolicyMigration = read('../supabase/migrations/20260711_user_image_upload_policy.sql');
const vocabContext = read('../src/context/VocabContext.jsx');
const purge = read('../src/pages/Purge.jsx');
const tutorial = read('../src/components/Tutorial.jsx');
const addWord = read('../src/pages/AddWord.jsx');
const profile = read('../src/pages/Profile.jsx');
const imageHelper = read('../src/utils/imageHelper.js');
const devPage = read('../src/pages/Dev.jsx');
const nongMem = read('../src/components/NongMem.jsx');

required(wordFunction, "'Access-Control-Allow-Origin': allowOrigin", 'Edge function must use an origin allow-list.');
assert(!wordFunction.includes("'Access-Control-Allow-Origin': '*'"), 'Edge function must not use wildcard CORS.');
assert(wordFunction.indexOf('Cache hits are free') < wordFunction.indexOf('consume_word_generation_quota'), 'Dictionary cache must be checked before quota is consumed.');
required(wordFunction, 'p_is_anonymous: Boolean(user.is_anonymous)', 'Generation quota must distinguish guest accounts.');
required(saveFunction, 'Generate verified details before saving a card.', 'Legacy save endpoint must reject browser-supplied dictionary payloads.');
assert(!saveFunction.includes('richData'), 'Legacy save endpoint must not accept richData.');
required(dictionaryMigration, 'revoke insert, update, delete on public.global_dictionary from anon, authenticated;', 'Dictionary writes must be revoked from browser roles.');
required(dictionaryMigration, 'App can read verified dictionary entries', 'Dictionary reads must remain available.');
required(guestMigration, 'coalesce(last_sign_in_at, created_at)', 'Guest cleanup must use last sign-in activity.');
required(guestMigration, "interval '30 days'", 'Guest cleanup must use the 30-day retention window.');
required(imagePolicyMigration, "Users upload their own small image cards", 'Image upload policy must be owner-scoped.');
required(imagePolicyMigration, "Users update their own small image cards", 'Image updates must remain owner-scoped.');
required(imagePolicyMigration, "5242880", 'Image upload policy must enforce a size limit.');
required(vocabContext, "file.size > 5 * 1024 * 1024", 'Client upload flow must reject oversized images.');
const dictionarySegments = vocabContext.split("from('global_dictionary')").slice(1);
const browserWritesDictionary = dictionarySegments.some((segment) => {
  const nearby = segment.slice(0, 500);
  return nearby.includes('.insert(') || nearby.includes('.update(') || nearby.includes('.delete(');
});
assert(!browserWritesDictionary, 'Browser code must not write global_dictionary.');
required(vocabContext, 'const targetWords = diversifyWords(unadded).slice(0, count);', 'Curriculum batches must be randomized without cache priority.');
assert(!purge.includes('COLLECTIONS_DATA'), 'Discovery must not retain static collection fixtures.');
required(purge, 'const selectedCandidates = shuffleItems(candidatePool).slice(0, 3);', 'Discovery cards must be randomly selected.');
assert(!addWord.includes('tutorialStep'), 'Translate page must not retain legacy tutorial state.');
assert(!profile.includes('memeng_tutorial_started'), 'Profile must not retain legacy tutorial state.');
const clientSecretPattern = /VITE_(?:GEMINI|GROQ|CEREBRAS|PEXELS|PIXABAY|FAL|POLLINATIONS|HUGGING)/;
assert(!clientSecretPattern.test(imageHelper), 'Image helper must not bundle provider keys.');
assert(!clientSecretPattern.test(devPage), 'Developer page must not bundle provider keys.');
assert(!clientSecretPattern.test(nongMem), 'NongMem must not bundle provider keys.');
required(tutorial, "selector: '#tutorial-nav-purge'", 'Guide must point at the real Flashcards nav button.');
required(tutorial, 'locationPathRef.current', 'Guide must allow real navigation without forcing the prior route.');
required(tutorial, "window.dispatchEvent(new Event('tutorial-close-menu'))", 'Guide must close the menu before starting.');

console.log('Release surface verification passed.');
