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
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(
  envVars['VITE_SUPABASE_URL'],
  envVars['SUPABASE_SERVICE_ROLE_KEY']
);

const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchRealDefinitions() {
  console.log('🤖 Starting Bot: Fetching Oxford Definitions...');

  const { data: wordsToUpdate, error: fetchError } = await supabase
    .from('global_dictionary')
    .select('id, word')
    .or('example.is.null,example.eq.')
    .limit(100);

  if (fetchError) {
    console.error('❌ Error fetching words:', fetchError.message);
    return;
  }

  if (!wordsToUpdate || wordsToUpdate.length === 0) {
    console.log('✅ All done! No more missing examples found.');
    return;
  }

  console.log(`\n🎯 Found ${wordsToUpdate.length} words to update in this batch.\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < wordsToUpdate.length; i++) {
    const { id, word } = wordsToUpdate[i];
    process.stdout.write(`[${i+1}/${wordsToUpdate.length}] "${word}"... `);

    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);

      if (!response.ok) {
        console.log(`⚠️ Not found in dictionary API or rate limited. Setting fallback.`);
        const { error: fallbackError } = await supabase
          .from('global_dictionary')
          .update({
            example: `"${word}" is commonly used in English.`
          })
          .eq('id', id);
        
        if (fallbackError) console.log(`❌ DB Error on fallback: ${fallbackError.message}`);
        failCount++;
        await delay(1000);
        continue;
      }

      const json = await response.json();
      const entry = json[0];

      if (!entry || !entry.meanings || entry.meanings.length === 0) {
        console.log(`⚠️ No meaning in response.`);
        failCount++;
        continue;
      }

      let meaningStr = '';
      let pos = '';
      let exampleStr = '';

      for (const m of entry.meanings) {
        if (!pos) pos = m.partOfSpeech;
        for (const def of m.definitions) {
          if (!meaningStr) meaningStr = def.definition;
          if (!exampleStr && def.example) exampleStr = def.example;
          if (meaningStr && exampleStr) break;
        }
        if (meaningStr && exampleStr) break;
      }

      if (!exampleStr) {
        exampleStr = `"${word}" is commonly used in English.`;
      }

      // Only update meaning and example — don't touch pos to avoid unique constraint on (word, pos)
      const { error: updateError } = await supabase
        .from('global_dictionary')
        .update({
          meaning: meaningStr,
          example: exampleStr
        })
        .eq('id', id);

      if (updateError) {
        console.log(`❌ DB Error: ${updateError.message}`);
        failCount++;
      } else {
        console.log(`✅ "${meaningStr.substring(0, 35)}..."`);
        successCount++;
      }

    } catch (err) {
      console.log(`❌ Crashed: ${err.message}`);
      failCount++;
    }

    await delay(250);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Updated: ${successCount}  |  ⚠️ Skipped: ${failCount}`);
  console.log(`\nRun again to process the next batch!`);
}

fetchRealDefinitions();
