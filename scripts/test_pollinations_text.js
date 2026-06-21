import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const url = "https://text.pollinations.ai/";
    console.log(`Sending request to Pollinations.ai Text API...`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          { role: "user", content: prompt }
        ],
        model: "qwen-coder", // or openai
        jsonMode: false
      })
    });

    if (!response.ok) {
      throw new Error(`Pollinations HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    console.log("Response received!");
    console.log("Raw output length:", text.length);
    console.log("Preview of output (first 300 chars):", text.slice(0, 300));
    
    const svgStart = text.indexOf("<svg");
    const svgEnd = text.indexOf("</svg>");
    if (svgStart !== -1 && svgEnd !== -1) {
      const svg = text.substring(svgStart, svgEnd + 6);
      console.log("Successfully extracted SVG!");
      fs.writeFileSync(path.join(__dirname, 'test_pollinations_doodle.svg'), svg);
      console.log("Saved extracted SVG to scripts/test_pollinations_doodle.svg");
    } else {
      console.log("Could not find complete <svg> ... </svg> in output.");
    }
    
  } catch (err) {
    console.error("Error calling Pollinations text API:", err);
  }
})();
