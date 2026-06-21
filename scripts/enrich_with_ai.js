import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

const genAI = new GoogleGenerativeAI(envVars['VITE_GEMINI_API_KEY']);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: "application/json" }
});

const delay = ms => new Promise(res => setTimeout(res, ms));

async function enrichWithAI() {
  console.log('🤖 Starting Gemini AI Enrichment Bot...');

  // Fetch words that need fixing:
  // 1. Pending meaning
  // 2. Fallback example
  const { data: wordsToFix, error: fetchError } = await supabase
    .from('global_dictionary')
    .select('id, word')
    .or("meaning.eq.Definition pending.,example.like.%is commonly used in English.%")
    .limit(50); // Batch size

  if (fetchError) {
    console.error('❌ Error fetching words:', fetchError.message);
    return;
  }

  if (!wordsToFix || wordsToFix.length === 0) {
    console.log('✅ All done! No more flawed words found.');
    return;
  }

  console.log(`\n🎯 Found ${wordsToFix.length} words to fix via AI in this batch.\n`);

  const wordsList = wordsToFix.map(w => w.word);

  const prompt = `
You are a highly skilled English vocabulary teacher.
I will give you a list of English words/phrases.
For each word, provide:
1. A very concise and clear definition (maximum 10-15 words).
2. A simple, practical example sentence using the word naturally.

Words to define:
${JSON.stringify(wordsList)}

Respond ONLY with a JSON array of objects in this exact format:
[
  {
    "word": "apple",
    "meaning": "A round fruit with red or green skin and a whitish interior.",
    "example": "She ate a crisp apple for a snack."
  }
]
`;

  console.log(`Sending ${wordsList.length} words to Gemini AI...`);
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const aiResults = JSON.parse(text);

    console.log(`Received JSON response with ${aiResults.length} words. Updating DB...`);

    let successCount = 0;
    for (const item of aiResults) {
      const match = wordsToFix.find(w => w.word.toLowerCase() === item.word.toLowerCase());
      if (match) {
        const { error: updateError } = await supabase
          .from('global_dictionary')
          .update({
            meaning: item.meaning,
            example: item.example
          })
          .eq('id', match.id);

        if (updateError) {
          console.error(`❌ Error updating "${match.word}": ${updateError.message}`);
        } else {
          console.log(`✅ Fixed "${match.word}": ${item.meaning.substring(0, 30)}...`);
          successCount++;
        }
      }
    }
    
    console.log(`\n🎉 Batch Complete! Fixed ${successCount} words.`);
    console.log(`Run again to process the next batch!`);

  } catch (err) {
    console.error('❌ AI Generation failed:', err);
  }
}

enrichWithAI();
