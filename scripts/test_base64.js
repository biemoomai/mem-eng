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
    // Find a test word
    const { data: words } = await supabase
      .from('global_dictionary')
      .select('id, word')
      .limit(1);

    if (!words || words.length === 0) {
      console.log("No words found.");
      return;
    }

    const testWord = words[0];
    console.log(`Testing with word: ${testWord.word} (ID: ${testWord.id})`);

    // Create a 100KB string
    const longString = 'a'.repeat(100000);

    const { error } = await supabase
      .from('global_dictionary')
      .update({ video_url: `data:image/png;base64,${longString}` })
      .eq('id', testWord.id);

    if (error) {
      console.error("❌ Failed to update video_url with long string:", error);
    } else {
      console.log("✅ Successfully updated video_url with a 100KB string!");
      
      // Clean up / revert back to null
      await supabase
        .from('global_dictionary')
        .update({ video_url: null })
        .eq('id', testWord.id);
      console.log("✅ Reverted back to null.");
    }
  } catch (err) {
    console.error("Error:", err);
  }
})();
