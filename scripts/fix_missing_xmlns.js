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

const supabase = createClient(
  envVars['VITE_SUPABASE_URL'],
  envVars['SUPABASE_SERVICE_ROLE_KEY']
);

function ensureXmlns(svgString) {
  const trimmed = svgString.trim();
  if (/xmlns\s*=/i.test(trimmed)) {
    return trimmed;
  }
  return trimmed.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
}

async function fixXmlns() {
  try {
    let allData = [];
    let start = 0;
    const step = 1000;
    let keepFetching = true;

    while (keepFetching) {
      const { data, error } = await supabase
        .from('global_dictionary')
        .select('id, word, video_url')
        .range(start, start + step - 1);

      if (error) throw error;
      if (!data || data.length === 0) {
        keepFetching = false;
      } else {
        allData = [...allData, ...data];
        if (data.length < step) keepFetching = false;
        start += step;
      }
    }

    console.log(`Auditing ${allData.length} database entries...`);
    let fixCount = 0;

    for (const row of allData) {
      const url = row.video_url || '';
      const isApproved = url.startsWith('approved:');
      const cleanUrl = isApproved ? url.substring('approved:'.length) : url;

      if (cleanUrl.startsWith('data:image/svg+xml;base64,')) {
        const base64 = cleanUrl.substring('data:image/svg+xml;base64,'.length);
        const svgText = Buffer.from(base64, 'base64').toString('utf8');
        
        if (!svgText.includes('xmlns=')) {
          const fixedSvg = ensureXmlns(svgText);
          const fixedBase64 = Buffer.from(fixedSvg).toString('base64');
          const fixedUrl = `data:image/svg+xml;base64,${fixedBase64}`;
          const finalUrl = isApproved ? `approved:${fixedUrl}` : fixedUrl;

          console.log(`  🔧 Fixing missing xmlns in word: "${row.word}"...`);
          const { error: updateError } = await supabase
            .from('global_dictionary')
            .update({ video_url: finalUrl })
            .eq('id', row.id);

          if (updateError) {
            console.error(`  ❌ Failed to update "${row.word}":`, updateError);
          } else {
            fixCount++;
          }
        }
      }
    }

    console.log(`🎉 Finished auditing. Successfully fixed missing xmlns for ${fixCount} words!`);
  } catch (err) {
    console.error(err);
  }
}
fixXmlns();
