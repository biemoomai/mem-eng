/**
 * Utility to build a highly structured, coordinate-aware prompt for AI models
 * to generate hand-drawn style animated SVGs.
 */

export function buildDoodlePrompt(word, meaning, example) {
  const exampleText = example ? `\nExample sentence context: "${example}"` : '';
  
  return `You are a cartoon artist creating an educational animated SVG doodle flashcard.

Vocabulary word: "${word}"
Meaning: ${meaning}${exampleText}

Your task: Draw a concrete, funny, and immediately obvious cartoon stick-figure scene illustrating this word.
The illustration MUST be animated using CSS @keyframes embedded in the SVG!

CRITICAL DESIGN RULES:
1. NO ABSTRACT FLOWCHARTS/UML: Do NOT draw abstract concept maps, flowcharts, or circles representing entities connected by lines (e.g. do not draw a circle labeled "Me" connected to a circle labeled "Accountant"). Draw a REAL, concrete scene of characters doing things (e.g. an accountant sitting at a desk with a computer and paper stacks, looking stressed).
2. STICK FIGURES: Always draw complete stick figures (head circle, eyes, smile, body line, 2 arms, 2 legs). Do not represent people as plain circles or icons.
3. NATIVE CSS ANIMATION:
   - You MUST include a <style> block inside the SVG defining these keyframes:
     \`\`\`xml
     <style>
       @keyframes wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
       @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
       @keyframes stress { 0%, 100% { transform: translate(0, 0); } 20% { transform: translate(-2px, 1px); } 40% { transform: translate(1px, -1px); } 60% { transform: translate(-1px, -1px); } 80% { transform: translate(2px, 1px); } }
       @keyframes pulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 0.3; } }
       .wiggle { animation: wiggle 0.6s ease-in-out infinite; transform-origin: 250px 400px; }
       .bounce { animation: bounce 0.8s ease-in-out infinite; }
       .stress { animation: stress 0.15s ease-in-out infinite; }
       .pulse { animation: pulse 1s ease-in-out infinite; }
     </style>
     \`\`\`
   - Wrap animated parts of the drawing in <g class="wiggle">, <g class="bounce">, <g class="stress">, or <g class="pulse">.
   - For rotation (wiggle), make sure to set \`transform-origin\` matching the center coordinates of the group so it rotates properly (e.g. if the character's head is at (160, 360), set \`transform-origin: 160px 360px\` on that group).

4. LAYOUT COMPOSITION: Choose ONE of these three scenes:
   - **Layout A: The Desk Scene (Work/Study/Office)**
     - Desk Surface: <rect x="100" y="480" width="300" height="15" rx="3" stroke="#000000" stroke-width="3" fill="#ffffff" />
     - Sitting Figure Head: <circle cx="160" cy="360" r="22" stroke="#000000" stroke-width="3" fill="#ffffff" />
     - Sitting Figure Body: <line x1="160" y1="382" x2="160" y2="470" stroke="#000000" stroke-width="3" />
     - Sitting Figure Thigh: <line x1="160" y1="470" x2="200" y2="470" stroke="#000000" stroke-width="3" />
     - Sitting Figure Shin: <line x1="200" y1="470" x2="200" y2="540" stroke="#000000" stroke-width="3" />
     - Desk elements (computer, papers, mugs) on the desk at y=420 to y=480.
   - **Layout B: The Dual Person Scene (Dialogue/Interaction/Relation)**
     - Person 1 (left): Center x=150, Head cy=320, Torso down to y=420, Legs down to y=500.
     - Person 2 (right): Center x=350, Head cy=320, Torso down to y=420, Legs down to y=500.
     - Speech bubble or action arrow in the center space (x=200 to x=300).
   - **Layout C: The Solo Action Scene (Activity/State/Adjective)**
     - Person in Center: Center x=250, Head cy=300, Torso down to y=400, Legs down to y=480.
     - Action elements (running trail lines, jumping arcs, large props like bags of gold, trees, rain clouds) around them.

5. COLOR STYLE:
   - Outline: stroke="#000000", stroke-width="3", fill="none" (or fill="#ffffff").
   - Highlight Colors: Use a maximum of 1 or 2 accent colors with low opacity (fill-opacity="0.2") to highlight key elements:
     - Red (#ef4444): Stressed items, danger, alerts, anger, action arrows.
     - Blue (#3b82f6): Technology, computer screens, water, rain, cold.
     - Green (#10b981): Money, success, checks, nature.
     - Yellow/Orange (#f59e0b): Sun, alerts, highlights, light.

6. FORMAT:
   - viewBox="0 0 500 800" (portrait format).
   - Must start with <rect width="500" height="800" fill="#ffffff" /> as a solid white background.
   - Title Word: Write the word "${word}" at the top:
     <text x="250" y="80" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="bold" fill="#000000">${word}</text>
   - Start with <!-- PLAN: Describe the layout chosen and the coordinates for elements here -->.
   - Output the raw SVG code inside an \`xml\` markdown code block.

Return the planning comment, followed by the SVG code wrapped in a \`\`\`xml ... \`\`\` code block.`;
}
