import fs from 'fs';
import path from 'path';

/**
 * VocabSync Oxford 3000-5000 Proper Seeder
 * ==========================================
 * 1. Parses the OFFICIAL Oxford 3000-5000 wordlist (scraped HTML)
 * 2. Extracts: word, part of speech, CEFR level (A1-C1)
 * 3. Fetches definitions + example sentences from Free Dictionary API
 * 4. Outputs clean SQL ready to paste into Supabase
 * 
 * Run: node --experimental-modules scripts/fetch_oxford5000.js
 */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const escapeSql = (str) => str ? str.replace(/'/g, "''").replace(/\\/g, '\\\\') : '';

// ============================================================
// STEP 1: Parse the Oxford wordlist from the scraped markdown
// ============================================================
const parseOxfordList = (filePath) => {
  console.log("📖 Parsing Oxford 3000-5000 word list...");
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Pattern: -    [word](url)   partOfSpeech   cefrLevel
  // Example: -    [abandon](https://...)   verb   b2
  const regex = /^-\s+\[([^\]]+)\]\([^)]+\)\s+(\w[\w\s]*?)\s*(a1|a2|b1|b2|c1)\s*$/gim;
  
  const words = [];
  const seen = new Set();
  let match;

  while ((match = regex.exec(content)) !== null) {
    const word = match[1].trim().toLowerCase();
    const pos = match[2].trim().toLowerCase();
    const cefr = match[3].toUpperCase(); // A1, A2, B1, B2, C1
    
    // Deduplicate: same word + same pos = skip
    const key = `${word}|${pos}`;
    if (seen.has(key)) continue;
    seen.add(key);
    
    words.push({ word, pos, cefr });
  }

  console.log(`✅ Parsed ${words.length} unique word+POS entries from Oxford list`);
  return words;
};

// ============================================================
// STEP 2: Fetch definition + example from Free Dictionary API
// ============================================================
const fetchDefinition = async (word, targetPos) => {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    
    const json = await res.json();
    if (!json || !json[0]) return null;

    // Try to find the meaning that matches the target POS
    let bestMeaning = null;
    
    // Map Oxford POS names to dictionary API POS names
    const posMap = {
      'noun': 'noun',
      'verb': 'verb',
      'adjective': 'adjective',
      'adverb': 'adverb',
      'preposition': 'preposition',
      'conjunction': 'conjunction',
      'pronoun': 'pronoun',
      'determiner': 'determiner',
      'exclamation': 'interjection',
      'number': 'noun',
      'modal verb': 'verb',
      'auxiliary verb': 'verb',
      'ordinal number': 'adjective',
      'indefinite article': 'determiner',
      'linking verb': 'verb',
    };

    const mappedPos = posMap[targetPos] || targetPos;

    // Search all entries for the best match
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

    // Fallback: just use the first meaning if no POS match
    if (!bestMeaning) {
      bestMeaning = json[0].meanings[0];
    }

    if (!bestMeaning || !bestMeaning.definitions || !bestMeaning.definitions[0]) return null;

    const def = bestMeaning.definitions[0];
    const definition = def.definition || '';
    const example = def.example || '';

    // If no example from first definition, try other definitions
    let finalExample = example;
    if (!finalExample) {
      for (const d of bestMeaning.definitions) {
        if (d.example) {
          finalExample = d.example;
          break;
        }
      }
    }

    return {
      meaning: definition,
      example: finalExample,
      actualPos: bestMeaning.partOfSpeech
    };
  } catch (err) {
    return null;
  }
};

// ============================================================
// STEP 3: Split example sentence into pre/post around the word
// ============================================================
const splitSentence = (sentence, word) => {
  if (!sentence) return { pre: '', post: '' };
  
  const lowerSentence = sentence.toLowerCase();
  const lowerWord = word.toLowerCase();
  
  // Try exact match first
  let index = lowerSentence.indexOf(lowerWord);
  
  if (index !== -1) {
    return {
      pre: sentence.substring(0, index),
      post: sentence.substring(index + word.length)
    };
  }
  
  // If the word isn't found in the example, return the whole sentence as pre
  return { pre: sentence, post: '' };
};

// ============================================================
// STEP 4: Main pipeline
// ============================================================
const run = async () => {
  // The scraped Oxford page content
  const scrapedFile = path.join(process.cwd(), '..', '..', '..', '..', 'brain', '7926a9f6-53bd-4634-903a-69f807163eff', '.system_generated', 'steps', '1196', 'content.md');
  
  if (!fs.existsSync(scrapedFile)) {
    console.log("❌ Scraped Oxford file not found at:", scrapedFile);
    console.log("Looking in alternate location...");
    // Try direct path
    const altPath = 'C:\\Users\\BoomBorriboon\\.gemini\\antigravity\\brain\\7926a9f6-53bd-4634-903a-69f807163eff\\.system_generated\\steps\\1196\\content.md';
    if (!fs.existsSync(altPath)) {
      console.log("❌ File not found. Please provide the scraped Oxford page.");
      return;
    }
    // Use alt path
    var oxfordWords = parseOxfordList(altPath);
  } else {
    var oxfordWords = parseOxfordList(scrapedFile);
  }

  // Stats
  const cefrCounts = {};
  oxfordWords.forEach(w => {
    cefrCounts[w.cefr] = (cefrCounts[w.cefr] || 0) + 1;
  });
  console.log("\n📊 CEFR Distribution:");
  Object.entries(cefrCounts).sort().forEach(([k, v]) => console.log(`   ${k}: ${v} words`));
  
  // Output SQL file
  const sqlFilePath = path.join(process.cwd(), 'scripts', 'oxford5000_seed.sql');
  fs.writeFileSync(sqlFilePath, '-- Oxford 3000-5000 Official Word Seed\n-- Auto-generated from https://www.oxfordlearnersdictionaries.com/wordlists/oxford3000-5000\n-- Generated: ' + new Date().toISOString() + '\n\n');
  
  // First: TRUNCATE the old data
  fs.appendFileSync(sqlFilePath, '-- WARNING: This will delete ALL existing dictionary data!\n');
  fs.appendFileSync(sqlFilePath, '-- Make sure to backup first if needed.\n');
  fs.appendFileSync(sqlFilePath, 'TRUNCATE TABLE public.global_dictionary CASCADE;\n\n');
  
  let batch = [];
  let successCount = 0;
  let skipCount = 0;
  const totalWords = oxfordWords.length;
  
  console.log(`\n🚀 Starting dictionary fetch for ${totalWords} words...`);
  console.log(`⏳ Estimated time: ~${Math.ceil(totalWords * 0.18 / 60)} minutes\n`);

  for (let i = 0; i < totalWords; i++) {
    const { word, pos, cefr } = oxfordWords[i];
    
    // Progress
    if (i % 50 === 0) {
      const pct = ((i / totalWords) * 100).toFixed(1);
      console.log(`[${i}/${totalWords}] (${pct}%) Fetching: ${word} (${pos}, ${cefr})...`);
    }

    const result = await fetchDefinition(word, pos);
    
    if (result && result.meaning) {
      const { pre, post } = splitSentence(result.example, word);
      
      batch.push(
        `('${escapeSql(word)}', '${escapeSql(pos)}', '${escapeSql(result.meaning)}', '${escapeSql(pre)}', '${escapeSql(post)}', NULL, '${cefr}')`
      );
      successCount++;
    } else {
      // Even if no definition found, still insert with a placeholder
      batch.push(
        `('${escapeSql(word)}', '${escapeSql(pos)}', 'Definition pending.', '', '', NULL, '${cefr}')`
      );
      skipCount++;
    }
    
    // Write to file every 100 words
    if (batch.length >= 100) {
      let sql = `INSERT INTO public.global_dictionary (word, pos, meaning, sentence_pre, sentence_post, video_url, cefr_level) VALUES\n`;
      sql += batch.join(',\n');
      sql += `\nON CONFLICT (word, pos) DO UPDATE SET meaning = EXCLUDED.meaning, sentence_pre = EXCLUDED.sentence_pre, sentence_post = EXCLUDED.sentence_post, cefr_level = EXCLUDED.cefr_level;\n\n`;
      fs.appendFileSync(sqlFilePath, sql);
      batch = [];
    }
    
    // Rate limit: 180ms between requests
    await delay(180);
  }

  // Write remaining batch
  if (batch.length > 0) {
    let sql = `INSERT INTO public.global_dictionary (word, pos, meaning, sentence_pre, sentence_post, video_url, cefr_level) VALUES\n`;
    sql += batch.join(',\n');
    sql += `\nON CONFLICT (word, pos) DO UPDATE SET meaning = EXCLUDED.meaning, sentence_pre = EXCLUDED.sentence_pre, sentence_post = EXCLUDED.sentence_post, cefr_level = EXCLUDED.cefr_level;\n\n`;
    fs.appendFileSync(sqlFilePath, sql);
  }

  console.log(`\n\n🎉 COMPLETELY FINISHED!`);
  console.log(`✅ Successfully fetched definitions for ${successCount} words`);
  console.log(`⚠️  ${skipCount} words had no definition (placeholder added)`);
  console.log(`📁 File saved to: ${sqlFilePath}`);
  console.log(`\n👉 Next steps:`);
  console.log(`   1. Open Supabase SQL Editor`);
  console.log(`   2. Paste the contents of scripts/oxford5000_seed.sql`);
  console.log(`   3. Hit RUN`);
  console.log(`   4. Refresh VocabSync and enjoy proper Oxford words! 🎓`);
};

run();
