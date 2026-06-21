import fs from 'fs';
import path from 'path';

/**
 * VocabSync Oxford 3000-5000 RESUME Seeder
 * ==========================================
 * Continues from word index 2000 (where the last run stopped).
 * APPENDS to the existing oxford5000_seed.sql file.
 * 
 * Improvements over original:
 * - Retry logic (3 attempts per word)
 * - Slower rate limiting (250ms) to avoid API throttling
 * - Better error handling
 * 
 * Run: node scripts/fetch_oxford5000_resume.js
 */

const RESUME_FROM_INDEX = 2000; // Start from this index (0-based)

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const escapeSql = (str) => str ? str.replace(/'/g, "''").replace(/\\/g, '\\\\') : '';

// ============================================================
// Parse the Oxford wordlist from the scraped markdown
// ============================================================
const parseOxfordList = (filePath) => {
  console.log("📖 Parsing Oxford 3000-5000 word list...");
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const regex = /^-\s+\[([^\]]+)\]\([^)]+\)\s+(\w[\w\s]*?)\s*(a1|a2|b1|b2|c1)\s*$/gim;
  
  const words = [];
  const seen = new Set();
  let match;

  while ((match = regex.exec(content)) !== null) {
    const word = match[1].trim().toLowerCase();
    const pos = match[2].trim().toLowerCase();
    const cefr = match[3].toUpperCase();
    
    const key = `${word}|${pos}`;
    if (seen.has(key)) continue;
    seen.add(key);
    
    words.push({ word, pos, cefr });
  }

  console.log(`✅ Parsed ${words.length} unique word+POS entries from Oxford list`);
  return words;
};

// ============================================================
// Fetch definition with RETRY logic
// ============================================================
const fetchDefinitionWithRetry = async (word, targetPos, maxRetries = 3) => {
  const posMap = {
    'noun': 'noun', 'verb': 'verb', 'adjective': 'adjective',
    'adverb': 'adverb', 'preposition': 'preposition', 'conjunction': 'conjunction',
    'pronoun': 'pronoun', 'determiner': 'determiner', 'exclamation': 'interjection',
    'number': 'noun', 'modal verb': 'verb', 'auxiliary verb': 'verb',
    'ordinal number': 'adjective', 'indefinite article': 'determiner',
    'linking verb': 'verb',
  };
  const mappedPos = posMap[targetPos] || targetPos;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      
      if (res.status === 429) {
        // Rate limited - wait longer and retry
        console.log(`   ⚠️ Rate limited on "${word}", waiting 5s... (attempt ${attempt}/${maxRetries})`);
        await delay(5000);
        continue;
      }
      
      if (!res.ok) return null;
      
      const json = await res.json();
      if (!json || !json[0]) return null;

      // Find the best matching meaning by POS
      let bestMeaning = null;
      for (const entry of json) {
        if (!entry.meanings) continue;
        for (const meaning of entry.meanings) {
          if (meaning.partOfSpeech === mappedPos) {
            bestMeaning = meaning;
            break;
          }
        }
        if (bestMeaning) break;
      }

      // Fallback: use first meaning
      if (!bestMeaning) {
        bestMeaning = json[0].meanings[0];
      }

      if (!bestMeaning || !bestMeaning.definitions || !bestMeaning.definitions[0]) return null;

      const def = bestMeaning.definitions[0];
      const definition = def.definition || '';
      let finalExample = def.example || '';

      // Try other definitions for an example if first one doesn't have one
      if (!finalExample) {
        for (const d of bestMeaning.definitions) {
          if (d.example) {
            finalExample = d.example;
            break;
          }
        }
      }

      return { meaning: definition, example: finalExample };

    } catch (err) {
      if (attempt < maxRetries) {
        console.log(`   ⚠️ Error on "${word}" (attempt ${attempt}/${maxRetries}): ${err.message}. Retrying...`);
        await delay(2000);
      }
    }
  }
  return null;
};

// ============================================================
// Split example sentence into pre/post around the word
// ============================================================
const splitSentence = (sentence, word) => {
  if (!sentence) return { pre: '', post: '' };
  const lowerSentence = sentence.toLowerCase();
  const lowerWord = word.toLowerCase();
  const index = lowerSentence.indexOf(lowerWord);
  if (index !== -1) {
    return {
      pre: sentence.substring(0, index),
      post: sentence.substring(index + word.length)
    };
  }
  return { pre: sentence, post: '' };
};

// ============================================================
// MAIN
// ============================================================
const run = async () => {
  // Find the Oxford scraped file
  const altPath = 'C:\\Users\\BoomBorriboon\\.gemini\\antigravity\\brain\\7926a9f6-53bd-4634-903a-69f807163eff\\.system_generated\\steps\\1196\\content.md';
  
  if (!fs.existsSync(altPath)) {
    console.log("❌ Scraped Oxford file not found at:", altPath);
    return;
  }

  const oxfordWords = parseOxfordList(altPath);
  const totalWords = oxfordWords.length;
  const remaining = totalWords - RESUME_FROM_INDEX;
  
  console.log(`\n📊 Total words: ${totalWords}`);
  console.log(`✅ Already fetched: ${RESUME_FROM_INDEX}`);
  console.log(`🔄 Remaining to fetch: ${remaining}`);
  console.log(`⏳ Estimated time: ~${Math.ceil(remaining * 0.3 / 60)} minutes\n`);
  
  // APPEND to existing SQL file
  const sqlFilePath = path.join(process.cwd(), 'scripts', 'oxford5000_seed.sql');
  fs.appendFileSync(sqlFilePath, `\n-- RESUMED from index ${RESUME_FROM_INDEX} at ${new Date().toISOString()}\n\n`);
  
  let batch = [];
  let successCount = 0;
  let skipCount = 0;

  for (let i = RESUME_FROM_INDEX; i < totalWords; i++) {
    const { word, pos, cefr } = oxfordWords[i];
    
    // Progress every 50 words
    if ((i - RESUME_FROM_INDEX) % 50 === 0) {
      const done = i - RESUME_FROM_INDEX;
      const pct = ((done / remaining) * 100).toFixed(1);
      console.log(`[${i}/${totalWords}] (${pct}% of remaining) Fetching: ${word} (${pos}, ${cefr})...`);
    }

    const result = await fetchDefinitionWithRetry(word, pos);
    
    if (result && result.meaning) {
      const { pre, post } = splitSentence(result.example, word);
      batch.push(
        `('${escapeSql(word)}', '${escapeSql(pos)}', '${escapeSql(result.meaning)}', '${escapeSql(pre)}', '${escapeSql(post)}', NULL, '${cefr}')`
      );
      successCount++;
    } else {
      batch.push(
        `('${escapeSql(word)}', '${escapeSql(pos)}', 'Definition pending.', '', '', NULL, '${cefr}')`
      );
      skipCount++;
    }
    
    // Write every 100 words
    if (batch.length >= 100) {
      let sql = `INSERT INTO public.global_dictionary (word, pos, meaning, sentence_pre, sentence_post, video_url, cefr_level) VALUES\n`;
      sql += batch.join(',\n');
      sql += `\nON CONFLICT (word, pos) DO UPDATE SET meaning = EXCLUDED.meaning, sentence_pre = EXCLUDED.sentence_pre, sentence_post = EXCLUDED.sentence_post, cefr_level = EXCLUDED.cefr_level;\n\n`;
      fs.appendFileSync(sqlFilePath, sql);
      batch = [];
      console.log(`   💾 Saved batch to file (${successCount + skipCount} words so far in this run)`);
    }
    
    // Rate limit: 250ms (slower than before to avoid throttling)
    await delay(250);
  }

  // Write remaining
  if (batch.length > 0) {
    let sql = `INSERT INTO public.global_dictionary (word, pos, meaning, sentence_pre, sentence_post, video_url, cefr_level) VALUES\n`;
    sql += batch.join(',\n');
    sql += `\nON CONFLICT (word, pos) DO UPDATE SET meaning = EXCLUDED.meaning, sentence_pre = EXCLUDED.sentence_pre, sentence_post = EXCLUDED.sentence_post, cefr_level = EXCLUDED.cefr_level;\n\n`;
    fs.appendFileSync(sqlFilePath, sql);
  }

  console.log(`\n\n🎉 COMPLETELY FINISHED!`);
  console.log(`✅ Definitions found: ${successCount}`);
  console.log(`⚠️  Placeholders: ${skipCount}`);
  console.log(`📊 Total in file now: ${RESUME_FROM_INDEX + successCount + skipCount} / ${totalWords}`);
  console.log(`📁 File: ${sqlFilePath}`);
  console.log(`\n👉 Next: Paste contents of oxford5000_seed.sql into Supabase SQL Editor and RUN!`);
};

run();
