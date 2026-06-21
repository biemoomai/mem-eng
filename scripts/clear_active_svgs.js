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
    console.log("Fetching active user deck word ids...");
    const { data: userDecks, error } = await supabase
      .from('user_decks')
      .select('global_dictionary(id, word, video_url)');

    if (error) {
      console.error("Error fetching user decks:", error);
      return;
    }

    const wordsToClear = [];
    const seenWords = new Set();

    for (const item of userDecks) {
      const g = item.global_dictionary;
      if (!g) continue;
      if (seenWords.has(g.id)) continue;
      seenWords.add(g.id);

      const url = g.video_url || '';
      if (url.startsWith('data:image/svg')) {
        wordsToClear.push(g);
      }
    }

    console.log(`Found ${wordsToClear.length} active words with existing SVG doodles to clear.`);

    if (wordsToClear.length === 0) {
      console.log("No SVG doodles to clear.");
      return;
    }

    let clearedCount = 0;
    for (const word of wordsToClear) {
      const { error: updateError } = await supabase
        .from('global_dictionary')
        .update({ video_url: null })
        .eq('id', word.id);

      if (updateError) {
        console.error(`❌ Failed to clear SVG for "${word.word}":`, updateError);
      } else {
        clearedCount++;
        console.log(`Cleared SVG doodle for "${word.word}"`);
      }
    }

    console.log(`🎉 Successfully cleared ${clearedCount} SVG doodles to NULL!`);

  } catch (err) {
    console.error("Unhandled error:", err);
  }
})();
