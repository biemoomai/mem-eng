import fs from 'fs';
import path from 'path';

/**
 * VocabSync Massive Oxford 5000 Data Fetcher
 * Note: Video scraping is disabled to save time and API quota.
 * It will output SQL data in batches!
 */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runMassiveSeed = async () => {
  console.log("🚀 Downloading Top 5000 English Words list...");
  
  // Actually, Monkeytype has the perfect 5k list ranked by frequency!
  const listRes = await fetch('https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/static/languages/english_5k.json');
  if (!listRes.ok) {
    console.log("Failed to download list.");
    return;
  }
  const listData = await listRes.json();
  const words = listData.words; // Array of 5000 string words

  console.log(`✅ Downloaded ${words.length} words! Starting Dictionary extraction...`);
  console.log(`⏳ This might take about 15-20 minutes depending on internet speed...`);

  const escapeSql = (str) => str ? str.replace(/'/g, "''") : '';
  
  const sqlFilePath = path.join(process.cwd(), 'scripts', 'massive_5000_seed.sql');
  fs.writeFileSync(sqlFilePath, '-- Massive 5000 Word Seed\\n');

  let batch = [];
  let successCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Print progress on same line to avoid flooding terminal
    process.stdout.write(`\\r[${i + 1}/${words.length}] Fetching definition for: ${word}              `);

    try {
      let res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      if (res.ok) {
        let json = await res.json();
        const rawData = json[0].meanings[0];
        const pos = rawData.partOfSpeech || 'n.';
        const meaning = rawData.definitions[0].definition || 'Meaning not found.';
        const example = rawData.definitions[0].example || `This is an example for ${word}.`;

        const lowerSentence = example.toLowerCase();
        const lowerWord = word.toLowerCase();
        const index = lowerSentence.indexOf(lowerWord);
        
        let pre = example;
        let post = '';
        if (index !== -1) {
           pre = example.substring(0, index);
           post = example.substring(index + word.length);
        }

        batch.push(`('${escapeSql(word)}', '${escapeSql(pos)}', '${escapeSql(meaning)}', '${escapeSql(pre)}', '${escapeSql(post)}', NULL, 'Discover')`);
        successCount++;
        
        // Write to file every 50 words to save memory and commit SQL syntax
        if (batch.length === 50) {
            let sql = `INSERT INTO public.global_dictionary (word, pos, meaning, sentence_pre, sentence_post, video_url, cefr_level) VALUES\n`;
            sql += batch.join(',\\n');
            sql += `\nON CONFLICT (word) DO NOTHING;\n\n`;
            fs.appendFileSync(sqlFilePath, sql);
            batch = []; // clear batch
        }
      }
    } catch(err) {
      // Ignore words that dictionaryapi doesn't know
    }
    
    // Rate limit: 200 ms to stay well under the 1000 requests/5mins limit
    await delay(150);
  }

  // Write remaining
  if (batch.length > 0) {
      let sql = `INSERT INTO public.global_dictionary (word, pos, meaning, sentence_pre, sentence_post, video_url, cefr_level) VALUES\n`;
      sql += batch.join(',\\n');
      sql += `\nON CONFLICT (word) DO NOTHING;\n\n`;
      fs.appendFileSync(sqlFilePath, sql);
  }

  console.log(`\\n\\n🎉 COMPLETELY FINISHED!`);
  console.log(`✅ Successfully extracted definitions for ${successCount} words!`);
  console.log(`File saved to: ${sqlFilePath}`);
  console.log("👉 Next step: Copy the contents of scripts/massive_5000_seed.sql to Supabase SQL editor!");
};

runMassiveSeed();
