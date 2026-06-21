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

import Groq from 'groq-sdk';

const genAI = new GoogleGenerativeAI(envVars['VITE_GEMINI_API_KEY']);
const model = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-lite',
  generationConfig: { responseMimeType: "text/plain" }
});

const groq = new Groq({ apiKey: envVars['GROQ_API_KEY'] });

const word = "accountant";
const meaning = "a person whose job is to keep or inspect financial accounts.";
const example = "We hired an accountant to help us with our taxes.";

const prompt = `
You are a cartoon artist creating an educational animated SVG doodle flashcard.
Vocabulary word: "${word}"
Meaning: ${meaning}
Example: "${example}"

Your task: Draw a concrete, funny, and immediately obvious cartoon stick-figure scene illustrating this word.
The illustration MUST be animated using CSS @keyframes embedded in the SVG!

CRITICAL DESIGN RULES:
1. NO ABSTRACT FLOWCHARTS: Do NOT draw circles connected by lines labeled "Me" or "Accountant". Draw a REAL scene (e.g., a person sitting at a desk with a computer and paper, looking stressed).
2. STICK FIGURES: Always draw complete stick figures (head circle, eyes, smile, body line, 2 arms, 2 legs).
3. NATIVE ANIMATIONS: Include a <style> block inside the SVG defining these classes:
   - \`@keyframes wiggle { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }\`
   - \`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }\`
   - \`@keyframes stress { 0%, 100% { transform: translate(0, 0); } 20% { transform: translate(-2px, 1px); } 40% { transform: translate(1px, -1px); } 60% { transform: translate(-1px, -1px); } 80% { transform: translate(2px, 1px); } }\`
   Add class="wiggle" or class="bounce" or class="stress" to specific <g> elements to animate them (e.g., animate the hands typing, the head stressing, or thought bubbles bouncing). Make sure to set \`transform-origin: center\` or specific coordinates (like \`transform-origin: 250px 350px\`) so they rotate/scale from the correct joints.
4. PRE-CALCULATED COORDINATES (USE THEM):
   - Desk: <rect x="100" y="480" width="300" height="15" rx="3" stroke="#000000" stroke-width="3" fill="#ffffff" />
   - Sitting Person Head: <circle cx="160" cy="360" r="22" stroke="#000000" stroke-width="3" fill="#ffffff" />
   - Sitting Person Body: <line x1="160" y1="382" x2="160" y2="470" stroke="#000000" stroke-width="3" />
5. VIEWBOX: viewBox="0 0 500 800" (portrait format) with a white background: <rect width="500" height="800" fill="#ffffff" />
6. Put the title word "${word}" at the top: <text x="250" y="80" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="bold" fill="#000000">${word}</text>
7. Use stroke="#000000" and stroke-width="3" for outlines. Use subtle fills with low opacity (fill-opacity="0.2") for accenting (red "#ef4444" for stress/danger, blue "#3b82f6" for screens/tech, green "#10b981" for money/numbers).

Return ONLY the raw SVG code. Start with <svg> and end with </svg>. No markdown wrappers, no explanations.
`;

async function generateWithGroq() {
  console.log("Switching to Groq fallback model...");
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 4096,
  });
  return completion.choices[0].message.content;
}

(async () => {
  try {
    let svgText = "";
    try {
      console.log("Generating animated SVG using Gemini...");
      const result = await model.generateContent(prompt);
      svgText = result.response.text().trim();
    } catch (geminiErr) {
      console.warn("⚠️ Gemini failed, trying Groq...", geminiErr.message || geminiErr);
      svgText = await generateWithGroq();
    }
    
    let cleaned = svgText.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
    }
    
    fs.writeFileSync(path.join(__dirname, 'animated_accountant_test.svg'), cleaned);
    console.log("Saved animated SVG to scripts/animated_accountant_test.svg!");
  } catch (err) {
    console.error("Error generating SVG:", err);
  }
})();
