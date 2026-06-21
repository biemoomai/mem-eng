import fs from 'fs';
import path from 'path';

// Using Node 18+ built-in fetch
const run = async () => {
    console.log("Downloading Monkeytype 5K list...");
    const listRes = await fetch('https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/static/languages/english_5k.json');
    const mk = await listRes.json();
    const words5k = mk.words; // ranked array

    console.log("Downloading Websters 102K Offline Dictionary...");
    const dictRes = await fetch('https://raw.githubusercontent.com/matthewreagan/WebstersEnglishDictionary/master/dictionary.json');
    let dictBase = await dictRes.json();
    
    // Some Webster JSON keys are Title Case
    const dict = {};
    for (let key in dictBase) {
        dict[key.toLowerCase()] = dictBase[key];
    }

    console.log("Reading existing 1944 words from previous massive_seed...");
    let existingWords = new Set();
    try {
        const oldSql = fs.readFileSync(path.join(process.cwd(), 'scripts', 'massive_5000_seed.sql'), 'utf-8');
        const lines = oldSql.split('\n').filter(l => l.includes('('));
        for (const l of lines) {
            // ('word', ...)
            const match = l.match(/^\('([^']+)'/);
            if (match) existingWords.add(match[1]);
        }
    } catch(e) {
        console.log("No existing massive seed found. Generating from scratch.");
    }

    console.log(`Initial DB has ${existingWords.size} words. Extracting missing...`);

    const missingWords = words5k.filter(w => !existingWords.has(w));
    console.log(`Found ${missingWords.length} words missing.`);

    const escapeSql = (str) => {
        if (!str) return '';
        return String(str).replace(/'/g, "''").replace(/\n/g, ' ').replace(/\r/g, '');
    };
    
    // Try to guess a POS from Webster formatting
    const guessPos = (meaning) => {
        if (meaning.includes('(v. t.)') || meaning.includes('(v. i.)') || meaning.includes('(v.')) return 'verb';
        if (meaning.includes('(a.)') || meaning.includes('(adj.)')) return 'adjective';
        if (meaning.includes('(adv.)')) return 'adverb';
        return 'noun'; // generic fallback
    };

    let chunks = [];
    let currentBatch = [];

    for (let word of missingWords) {
        let meaning = dict[word] || dict[word + 's'] || dict[word.replace(/s$/, '')] || "A common English word.";
        
        // Truncate overly long Webster definitions to max 255 chars for safety
        if (meaning.length > 200) {
            meaning = meaning.substring(0, 197) + '...';
        }

        const pos = guessPos(meaning);
        const sentence = `I want to practice the word ${word}.`;

        currentBatch.push(`('${escapeSql(word)}', '${escapeSql(pos)}', '${escapeSql(meaning)}', 'I want to practice the word ', '.', NULL, 'Discover')`);

        if (currentBatch.length === 1500) {
            chunks.push([...currentBatch]);
            currentBatch = [];
        }
    }

    if (currentBatch.length > 0) chunks.push([...currentBatch]);

    console.log(`Generated ${chunks.length} SQL chunk files.`);

    for (let i = 0; i < chunks.length; i++) {
        let sql = `-- VocabSync Missing Words Seed: Part ${i+1}\n`;
        sql += `INSERT INTO public.global_dictionary (word, pos, meaning, sentence_pre, sentence_post, video_url, cefr_level) VALUES\n`;
        sql += chunks[i].join(',\n');
        sql += `\nON CONFLICT (word) DO NOTHING;\n`;

        fs.writeFileSync(path.join(process.cwd(), 'scripts', `missing_seed_part${i+1}.sql`), sql);
        console.log(`✅ Saved missing_seed_part${i+1}.sql (${chunks[i].length} words)`);
    }
};

run().catch(console.error);
