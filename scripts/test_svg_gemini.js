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

const genAI = new GoogleGenerativeAI(envVars['VITE_GEMINI_API_KEY']);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: "text/plain" }
});

async function testSvgGeneration() {
  const word = "abandon";
  const meaning = "to leave behind or run away from someone or something";
  
  const prompt = `
You are a developer artist. Generate a simple, crude, black and white 2D vector SVG illustrating the concept of the vocabulary word: "${word}" (meaning: ${meaning}).

Style guidelines:
- Ugly, low effort MS Paint stick figure doodle style.
- Black lines on a pure white background.
- Extremely simple shapes (circles, lines, curves).
- Funny or sarcastic representation of the word.
- Use <path>, <circle>, <line> elements.
- Set viewBox="0 0 500 800" (tall portrait card format).
- Must have a <rect width="500" height="800" fill="#ffffff" /> background first.
- The drawing should have thick black outlines (stroke="#000000", stroke-width="4", fill="none" or fill="#ffffff").
- Include the word "${word}" at the top or bottom in a crude handwritten style using SVG <text> element.

Return ONLY the raw SVG code. No markdown code block wrappers (do NOT wrap in \`\`\`xml or \`\`\`svg), no explanation, no extra text. Start directly with <svg> and end with </svg>.
`;

  try {
    console.log(`Generating SVG for "${word}"...`);
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Clean up any accidental markdown wrapper if Gemini included it
    let cleanSvg = text;
    if (cleanSvg.startsWith("```")) {
      cleanSvg = cleanSvg.replace(/^```[a-z]*\n/, "").replace(/\n```$/, "");
    }
    
    fs.writeFileSync(path.join(__dirname, 'test_doodle.svg'), cleanSvg);
    console.log("✅ Saved SVG to scripts/test_doodle.svg!");
    console.log("Preview of SVG (first 200 chars):", cleanSvg.substring(0, 200));
  } catch (err) {
    console.error("Error generating SVG:", err);
  }
}

testSvgGeneration();
