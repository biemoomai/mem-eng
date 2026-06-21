import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDoodlePrompt } from '../src/utils/doodlePromptBuilder.js';

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

// Gemini client
const genAI = new GoogleGenerativeAI(envVars['VITE_GEMINI_API_KEY']);
const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-lite',
  generationConfig: { responseMimeType: "text/plain" }
});

// Groq client (fallback)
const groq = new Groq({ apiKey: envVars['GROQ_API_KEY'] });

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function buildPrompt(word, meaning, example) {
  return buildDoodlePrompt(word, meaning, example);
}

function cleanSvg(svgText) {
  let cleaned = svgText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
  }
  
  // Extract SVG strictly using regex to allow comments/plan before the SVG
  const svgMatch = cleaned.match(/<svg[\s\S]*?<\/svg>/i);
  if (svgMatch) {
    cleaned = svgMatch[0].trim();
  }
  
  if (!/xmlns\s*=/i.test(cleaned)) {
    cleaned = cleaned.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return cleaned;
}

async function generateWithGemini(word, meaning, example) {
  const prompt = buildPrompt(word, meaning, example);
  const result = await geminiModel.generateContent(prompt);
  return cleanSvg(result.response.text());
}

async function generateWithGroq(word, meaning, example) {
  console.log(`  🔀 Switching to Groq for: "${word}"...`);
  const prompt = buildPrompt(word, meaning, example);
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 4096,
  });
  return cleanSvg(completion.choices[0].message.content);
}

async function generateSvgDoodle(word, meaning, example = '') {
  // Try Gemini first (up to 2 attempts)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`  🎨 Gemini attempt ${attempt}/2 for: "${word}"...`);
      const svg = await generateWithGemini(word, meaning, example);
      if (svg.includes('<svg') && svg.includes('</svg>')) return { svg, provider: 'Gemini' };
      console.warn(`  ⚠️ Gemini returned invalid SVG, trying again...`);
    } catch (err) {
      const errStr = String(err);
      const is429 = errStr.includes('429') || errStr.includes('Too Many Requests') || errStr.includes('Quota') || errStr.includes('rate limit');
      const is503 = errStr.includes('503') || errStr.includes('Service Unavailable');
      if (is429 || is503) {
        console.warn(`  ⚠️ Gemini rate limited (${is429 ? '429' : '503'}) — switching to Groq`);
        break; // Go to Groq immediately
      }
      console.error(`  ❌ Gemini error:`, errStr.substring(0, 100));
    }
  }

  // Fallback: Try Groq (up to 3 attempts)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`  ⚡ Groq attempt ${attempt}/3 for: "${word}"...`);
      const svg = await generateWithGroq(word, meaning, example);
      if (svg.includes('<svg') && svg.includes('</svg>')) return { svg, provider: 'Groq' };
      console.warn(`  ⚠️ Groq returned invalid SVG, retrying...`);
    } catch (err) {
      const errStr = String(err);
      if (errStr.includes('429') || errStr.includes('rate_limit')) {
        console.warn(`  ⚠️ Groq also rate limited, waiting 30s...`);
        await delay(30000);
      } else {
        console.error(`  ❌ Groq error:`, errStr.substring(0, 100));
      }
    }
  }

  return null;
}

(async () => {
  try {
    console.log('🚀 Starting SVG generation (Gemini + Groq fallback)...\n');

    // Get all words in user's decks
    const { data: userDecks, error: decksError } = await supabase
      .from('user_decks')
      .select('word_id, next_review_date');

    if (decksError) { console.error('Error fetching user decks:', decksError); return; }

    const decksByDictId = new Map();
    for (const deck of userDecks) {
      if (!decksByDictId.has(deck.word_id)) decksByDictId.set(deck.word_id, deck.next_review_date);
    }

    const allDictIds = Array.from(decksByDictId.keys()).filter(Boolean);
    console.log(`Found ${allDictIds.length} unique dictionary entries in user's decks.`);

    const { data: dictEntries, error: dictError } = await supabase
      .from('global_dictionary')
      .select('id, word, video_url, meaning, example, cefr_level')
      .in('id', allDictIds);

    if (dictError) { console.error('Error fetching dictionary entries:', dictError); return; }

    // Filter: only those without real SVG
    const needsDoodle = dictEntries.filter(entry => {
      const url = entry.video_url || '';
      return !url.startsWith('data:image/svg') && !url.startsWith('approved:data:image/svg');
    });

    const getLevelWeight = (cefr) => {
      if (!cefr) return 99;
      const upper = cefr.toUpperCase();
      const weights = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };
      return weights[upper] || 99;
    };

    // Sort: most recently added first (newer next_review_date = active user session needs SVG now)
    // If review dates are close (within 1 minute), treat them as equal and sort by CEFR Level (easier first)
    // If same level, alphabetical by word
    needsDoodle.sort((a, b) => {
      const dateA = new Date(decksByDictId.get(a.id) || '9999-01-01').getTime();
      const dateB = new Date(decksByDictId.get(b.id) || '9999-01-01').getTime();
      
      const diff = Math.abs(dateA - dateB);
      if (diff > 60000) {
        return dateB - dateA; // Newer review dates first
      }
      
      const weightA = getLevelWeight(a.cefr_level);
      const weightB = getLevelWeight(b.cefr_level);
      if (weightA !== weightB) return weightA - weightB;

      return a.word.localeCompare(b.word);
    });

    console.log(`\n📋 ${needsDoodle.length} entries still need SVG doodles:`);
    console.log(needsDoodle.map(e => e.word).join(', '));
    console.log('');

    if (needsDoodle.length === 0) {
      console.log('✅ All words already have SVG doodles!');
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let geminiCount = 0;
    let groqCount = 0;

    for (let i = 0; i < needsDoodle.length; i++) {
      const item = needsDoodle[i];
      console.log(`\n[${i + 1}/${needsDoodle.length}] Processing: "${item.word}"`);

      const result = await generateSvgDoodle(item.word, item.meaning, item.example);

      if (!result) {
        console.error(`  ❌ Failed to generate SVG for "${item.word}"`);
        failCount++;
        await delay(15000);
        continue;
      }

      const { svg, provider } = result;
      const base64Svg = Buffer.from(svg).toString('base64');
      const finalUrl = `data:image/svg+xml;base64,${base64Svg}`;

      const { error: updateError } = await supabase
        .from('global_dictionary')
        .update({ video_url: finalUrl })
        .eq('id', item.id);

      if (updateError) {
        console.error(`  ❌ DB update failed:`, updateError);
        failCount++;
      } else {
        successCount++;
        if (provider === 'Gemini') geminiCount++; else groqCount++;
        console.log(`  ✅ [${provider}] Saved "${item.word}"! (${successCount} done)`);
      }

      // Small delay between requests (Groq is fast, Gemini needs more breathing room)
      if (i < needsDoodle.length - 1) {
        await delay(15000);
      }
    }

    console.log(`\n\n🎉 All done!`);
    console.log(`  ✅ Success: ${successCount} (Gemini: ${geminiCount}, Groq: ${groqCount})`);
    console.log(`  ❌ Failed: ${failCount}`);

  } catch (err) {
    console.error('Unhandled error:', err);
  }
})();
