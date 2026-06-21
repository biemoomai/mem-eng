import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '').replace(/\r/g, '');
});

const supabase = createClient(envVars['VITE_SUPABASE_URL'], envVars['SUPABASE_SERVICE_ROLE_KEY']);

(async () => {
  try {
    // 1. Total global_dictionary words
    const { count: totalGlobal } = await supabase
      .from('global_dictionary')
      .select('id', { count: 'exact', head: true });
    console.log(`Total words in global_dictionary: ${totalGlobal}`);

    // 2. Total user_decks
    const { count: totalUserDecks } = await supabase
      .from('user_decks')
      .select('id', { count: 'exact', head: true });
    console.log(`Total words in user_decks: ${totalUserDecks}`);

    // 3. Select all user deck words with their global dictionary details
    const { data: userDecksData, error } = await supabase
      .from('user_decks')
      .select('id, word_id, global_dictionary(id, word, video_url, meaning)');

    if (error) {
      console.error("Error fetching user decks:", error);
      return;
    }

    console.log(`User Decks words detail status:`);
    let badCount = 0;
    for (const item of userDecksData) {
      const g = item.global_dictionary;
      if (!g) {
        console.log(`  Deck ID ${item.id} has no global dictionary reference.`);
        continue;
      }
      const url = g.video_url || '';
      const isBad = !url || url.startsWith('generating-') || url.includes('giphy') || url.includes('pollinations.ai');
      if (isBad) {
        badCount++;
        console.log(`  [BAD] Word: "${g.word}" (ID: ${g.id}), URL: "${g.video_url}"`);
      } else {
        console.log(`  [OK]  Word: "${g.word}" (ID: ${g.id}), URL: "${g.video_url}"`);
      }
    }
    console.log(`Total bad / ungenerated video_urls in user deck: ${badCount}`);

  } catch (err) {
    console.error("Error running script:", err);
  }
})();
