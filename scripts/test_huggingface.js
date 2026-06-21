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

const HF_KEY = envVars['VITE_HUGGINGFACE_API_KEY'];
const MODEL = "Qwen/Qwen2.5-Coder-32B-Instruct"; // excellent at code and SVGs

const prompt = `
Generate a simple, crude, black and white 2D vector SVG illustrating the concept of the vocabulary word: "abandon" (meaning: to leave behind).
Instructions:
- Stupid, low effort MS Paint stick figure doodle style.
- Pure black lines on a pure white background.
- Extremely simple shapes (stick figures, basic objects).
- Set viewBox="0 0 500 800" (tall portrait card format).
- Must have a <rect width="500" height="800" fill="#ffffff" /> background first.
- The drawing should have thick black outlines (stroke="#000000", stroke-width="4", fill="none" or fill="#ffffff").
- Include the word "abandon" in a crude handwritten style using SVG <text> element.

Return ONLY the raw SVG code. No markdown code block wrappers (do NOT wrap in \`\`\`xml or \`\`\`svg), no explanation, no extra text. Start directly with <svg> and end with </svg>.
`;

(async () => {
  try {
    console.log(`Sending request to Hugging Face model: ${MODEL}...`);
    const response = await fetch(`https://api-inference.huggingface.co/models/${MODEL}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 1500,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HF HTTP error! status: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    console.log("Response received!");
    
    // HF response is usually [{ generated_text: "..." }]
    let text = "";
    if (Array.isArray(data) && data[0]?.generated_text) {
      text = data[0].generated_text;
    } else if (data.generated_text) {
      text = data.generated_text;
    } else {
      text = JSON.stringify(data);
    }
    
    // Extract SVG from generated text if it contains prompt or chat format
    console.log("Raw output length:", text.length);
    console.log("Preview of output (first 300 chars):", text.slice(0, 300));
    
    // Find <svg> ... </svg>
    const svgStart = text.indexOf("<svg");
    const svgEnd = text.indexOf("</svg>");
    if (svgStart !== -1 && svgEnd !== -1) {
      const svg = text.substring(svgStart, svgEnd + 6);
      console.log("Successfully extracted SVG!");
      fs.writeFileSync(path.join(__dirname, 'test_hf_doodle.svg'), svg);
      console.log("Saved extracted SVG to scripts/test_hf_doodle.svg");
    } else {
      console.log("Could not find complete <svg> ... </svg> in output.");
    }
    
  } catch (err) {
    console.error("Error calling Hugging Face:", err);
  }
})();
