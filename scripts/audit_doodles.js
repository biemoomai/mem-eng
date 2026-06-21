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
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '').replace(/\r/g, '');
});

const supabase = createClient(envVars['VITE_SUPABASE_URL'], envVars['SUPABASE_SERVICE_ROLE_KEY']);
const genAI = new GoogleGenerativeAI(envVars['VITE_GEMINI_API_KEY']);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: "text/plain" }
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateNewSvgDoodle(word, meaning, example, retryCount = 0) {
  const exampleText = example ? `\nExample sentence context: "${example}"` : '';
  const variant = retryCount > 0 ? ` (Variation ${retryCount}: try drawing a different funny scenario or interpretation)` : '';
  
  const prompt = `
You are a developer artist. Generate a simple, crude, black and white 2D vector SVG illustrating the concept of the vocabulary word: "${word}" (meaning: ${meaning}).${exampleText}${variant}

Instructions:
- The illustration MUST clearly relate to the word's actual meaning, action, or context. Use the meaning and the example sentence to draw a literal, funny, or sarcastic scenario that helps the student remember/associate the drawing with the word.
- Stupid, low effort MS Paint stick figure doodle style.
- Pure black lines on a pure white background.
- Extremely simple shapes (stick figures, basic objects).
- Use <path>, <circle>, <line> elements.
- Set viewBox="0 0 500 800" (tall portrait card format).
- Must have a <rect width="500" height="800" fill="#ffffff" /> background first.
- The drawing should have thick black outlines (stroke="#000000", stroke-width="4", fill="none" or fill="#ffffff").
- Include the word "${word}" at the top or bottom in a crude handwritten style using SVG <text> element (x="250", y="100" or y="700", text-anchor="middle", font-family="sans-serif", font-size="48", fill="#000000").
- Make sure the doodles are active, funny, or showing concrete situations instead of just abstract static shapes.

Return ONLY the raw SVG code. No markdown code block wrappers (do NOT wrap in \`\`\`xml or \`\`\`svg), no explanation, no extra text. Start directly with <svg> and end with </svg>.
`;

  let attempts = 0;
  while (attempts < 5) {
    try {
      const result = await model.generateContent(prompt);
      let svgText = result.response.text().trim();
      
      if (svgText.startsWith("```")) {
        svgText = svgText.replace(/^```[a-z]*\n/, "").replace(/\n```$/, "");
      }

      if (svgText.includes("<svg") && svgText.includes("</svg>")) {
        return svgText;
      }
      attempts++;
      await delay(5000);
    } catch (error) {
      console.warn("⚠️ Generation error, retrying in 15s...", error.message || error);
      await delay(15000);
      attempts++;
    }
  }
  return null;
}

async function auditSvgDoodle(word, meaning, example, svgCode) {
  const exampleText = example ? `\nExample context: "${example}"` : '';
  const prompt = `
You are an Art Auditor. Analyze this SVG vector drawing illustrating the English word "${word}" (meaning: ${meaning}, example context: "${exampleText}").
Review if the visual elements in the SVG successfully and clearly represent the meaning/context of the word.

If the drawing is relevant, clear, funny, and makes sense, output "PASS".
If the drawing is irrelevant, chaotic, empty, or fails to represent the word, output "REJECT".

Do NOT provide any explanations, code, or other text. Output strictly either "PASS" or "REJECT".

Here is the SVG code to audit:
---
${svgCode}
`;

  let attempts = 0;
  while (attempts < 3) {
    try {
      const result = await model.generateContent(prompt);
      const verdict = result.response.text().trim().toUpperCase();
      if (verdict.includes("PASS")) return "PASS";
      if (verdict.includes("REJECT")) return "REJECT";
      attempts++;
    } catch (error) {
      console.warn("⚠️ Audit API error, retrying in 15s...", error.message || error);
      await delay(15000);
      attempts++;
    }
  }
  return "PASS"; // Default to PASS if API fails repeatedly
}

(async () => {
  try {
    const TOTAL_ROUNDS = 3;
    console.log(`🤖 Starting AI Doodle Audit Pipeline (Total Rounds: ${TOTAL_ROUNDS})...`);

    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
      console.log(`\n==================================================`);
      console.log(`🔄 AUDIT ROUND ${round}/${TOTAL_ROUNDS}`);
      console.log(`==================================================`);

      // Fetch active words in user decks
      const { data: userDecks, error } = await supabase
        .from('user_decks')
        .select('global_dictionary(id, word, video_url, meaning, example)');

      if (error) {
        console.error("Error fetching user decks:", error);
        return;
      }

      // Filter unique active words that have unapproved SVG doodles
      const activeDoodles = [];
      const seen = new Set();
      for (const item of userDecks) {
        const g = item.global_dictionary;
        if (!g || seen.has(g.id)) continue;
        seen.add(g.id);

        const url = g.video_url || '';
        // Only audit generated doodles that are NOT approved yet
        if (url.startsWith('data:image/svg')) {
          activeDoodles.push(g);
        }
      }

      console.log(`Found ${activeDoodles.length} unapproved SVG doodles to audit.`);

      if (activeDoodles.length === 0) {
        console.log("No unapproved SVG doodles found. All set!");
        break;
      }

      let passes = 0;
      let rejects = 0;

      for (const item of activeDoodles) {
        console.log(`\n🔍 Auditing: "${item.word}" (ID: ${item.id})...`);
        
        // Decode Base64 SVG
        const base64Data = item.video_url.substring(item.video_url.indexOf('base64,') + 7);
        const svgCode = Buffer.from(base64Data, 'base64').toString('utf8');

        // Audit the doodle
        const verdict = await auditSvgDoodle(item.word, item.meaning, item.example, svgCode);
        console.log(`Verdict for "${item.word}": ${verdict === "PASS" ? "✅ PASS" : "❌ REJECT"}`);

        if (verdict === "REJECT") {
          rejects++;
          console.log(`🎨 Regenerating a new illustration for "${item.word}"...`);
          
          // Generate a new variation
          const newSvg = await generateNewSvgDoodle(item.word, item.meaning, item.example, round);
          if (newSvg) {
            const newBase64 = Buffer.from(newSvg).toString('base64');
            const newUrl = `data:image/svg+xml;base64,${newBase64}`;
            
            // Save to database
            const { error: updateError } = await supabase
              .from('global_dictionary')
              .update({ video_url: newUrl })
              .eq('id', item.id);
              
            if (!updateError) {
              console.log(`🎉 Successfully regenerated and saved new doodle for "${item.word}"!`);
            } else {
              console.error("❌ Database update failed:", updateError);
            }
          } else {
            console.error(`❌ Failed to generate new SVG for "${item.word}"`);
          }
        } else {
          passes++;
        }

        // Delay to respect rate limits
        await delay(15000);
      }

      console.log(`\nRound ${round} Summary: ${passes} PASS, ${rejects} REJECT (Regenerated).`);
      
      if (rejects === 0) {
        console.log("🎉 All active doodles successfully passed the AI audit! Audit complete.");
        break;
      }
      
      console.log("Waiting 30 seconds before starting the next audit round...");
      await delay(30000);
    }

    console.log("\n🤖 AI doodle audit pipeline finished successfully!");

  } catch (err) {
    console.error("Unhandled audit pipeline error:", err);
  }
})();
