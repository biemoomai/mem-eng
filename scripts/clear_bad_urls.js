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
    console.log("Fetching all global_dictionary rows...");
    
    let allData = [];
    let start = 0;
    const step = 1000;
    let keepFetching = true;

    while (keepFetching) {
      const { data, error } = await supabase
        .from('global_dictionary')
        .select('id, word, video_url')
        .range(start, start + step - 1);

      if (error) {
        console.error("Error fetching data:", error);
        return;
      }

      if (!data || data.length === 0) {
        keepFetching = false;
      } else {
        allData = [...allData, ...data];
        if (data.length < step) keepFetching = false;
        start += step;
      }
    }

    console.log(`Fetched ${allData.length} rows from global_dictionary.`);

    const badRows = allData.filter(row => {
      const url = row.video_url;
      if (url === null || url === undefined) return false;
      const urlStr = String(url).trim();
      
      const isGoodSvg = urlStr.startsWith('data:image/svg+xml;base64,') || urlStr.startsWith('approved:data:image/svg+xml;base64,');
      return !isGoodSvg;
    });

    console.log(`Found ${badRows.length} bad/empty/null-string URLs to clear.`);

    if (badRows.length === 0) {
      console.log("No bad URLs to clear.");
      return;
    }

    // Update them to null
    let updatedCount = 0;
    for (const row of badRows) {
      const { error } = await supabase
        .from('global_dictionary')
        .update({ video_url: null })
        .eq('id', row.id);

      if (error) {
        console.error(`❌ Failed to clear URL for "${row.word}":`, error);
      } else {
        updatedCount++;
        if (updatedCount % 50 === 0 || updatedCount === badRows.length) {
          console.log(`Cleared ${updatedCount}/${badRows.length}...`);
        }
      }
    }

    console.log(`✅ Successfully cleared ${updatedCount} bad URLs to NULL!`);

  } catch (err) {
    console.error("Unhandled error:", err);
  }
})();
