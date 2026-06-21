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

(async () => {
  console.log("🔍 Starting Database Audit...\n");

  // 1. Total rows
  const { count: totalWords } = await supabase
    .from('global_dictionary')
    .select('*', { count: 'exact', head: true });
  console.log(`📊 Total Words in Database: ${totalWords}`);

  // Fetch all data for in-memory analysis
  console.log("Fetching all data for deep analysis...");
  let allData = [];
  let start = 0;
  const step = 1000;
  let keepFetching = true;

  while (keepFetching) {
    const { data, error } = await supabase
      .from('global_dictionary')
      .select('id, word, meaning, example')
      .range(start, start + step - 1);

    if (error || !data || data.length === 0) {
      keepFetching = false;
    } else {
      allData = [...allData, ...data];
      if (data.length < step) keepFetching = false;
      start += step;
    }
  }

  console.log(`\n✅ Downloaded ${allData.length} words for analysis.\n`);

  let missingWord = 0;
  let missingMeaning = 0;
  let missingExample = 0;
  let fallbackExamples = 0;
  let definitionPending = 0;
  let veryLongMeanings = 0;
  let veryShortMeanings = 0;

  allData.forEach(row => {
    if (!row.word) missingWord++;
    
    if (!row.meaning) {
      missingMeaning++;
    } else {
      if (row.meaning === 'Definition pending.') definitionPending++;
      if (row.meaning.length > 200) veryLongMeanings++;
      if (row.meaning.length < 10) veryShortMeanings++;
    }

    if (!row.example) {
      missingExample++;
    } else {
      if (row.example.includes('is commonly used in English.')) fallbackExamples++;
    }
  });

  console.log("📌 Data Completeness Check:");
  console.log(`  - Missing 'word': ${missingWord}`);
  console.log(`  - Missing 'meaning': ${missingMeaning}`);
  console.log(`  - Missing 'example': ${missingExample}`);

  console.log("\n📌 Quality Check:");
  console.log(`  - Still 'Definition pending.': ${definitionPending}`);
  console.log(`  - Fallback Examples (e.g. "word is commonly used..."): ${fallbackExamples}`);
  console.log(`  - Very Long Meanings (>200 chars): ${veryLongMeanings} (might not be concise)`);
  console.log(`  - Very Short Meanings (<10 chars): ${veryShortMeanings} (might be unhelpful)`);

  console.log("\n🔍 Sample of Fallback Examples:");
  const fallbackSample = allData.filter(r => r.example && r.example.includes('is commonly used in English.')).slice(0, 3);
  fallbackSample.forEach(r => console.log(`  - ${r.word}: ${r.example}`));

  console.log("\n🔍 Sample of Long Meanings:");
  const longSample = allData.filter(r => r.meaning && r.meaning.length > 200).slice(0, 3);
  longSample.forEach(r => console.log(`  - ${r.word}: ${r.meaning.substring(0, 80)}...`));

})();
