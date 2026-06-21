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

async function countAllSvgs() {
  try {
    let allData = [];
    let start = 0;
    const step = 1000;
    let keepFetching = true;

    while (keepFetching) {
      const { data, error } = await supabase
        .from('global_dictionary')
        .select('video_url')
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

    let total = allData.length;
    let hasSvg = 0;
    let hasApprovedSvg = 0;
    let generatingOrError = 0;
    let empty = 0;

    allData.forEach(row => {
      const url = row.video_url || '';
      if (!url) {
        empty++;
      } else if (url.startsWith('approved:data:image/svg')) {
        hasApprovedSvg++;
      } else if (url.startsWith('data:image/svg')) {
        hasSvg++;
      } else {
        generatingOrError++;
      }
    });

    console.log(`True database row count: ${total}`);
    console.log(`✅ SVG generated: ${hasSvg}`);
    console.log(`⭐ Approved SVG: ${hasApprovedSvg}`);
    console.log(`⏳ Generating/Error/Other: ${generatingOrError}`);
    console.log(`📁 Empty (No media): ${empty}`);
  } catch (err) {
    console.error(err);
  }
}
countAllSvgs();
