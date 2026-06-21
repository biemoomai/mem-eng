import fs from 'fs';
import path from 'path';

const filePath = 'c:/Users/BoomBorriboon/.gemini/antigravity/scratch/vocab-sync/src/pages/Profile.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log("Searching for 'Library' matches in Profile.jsx:");
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('library') || line.toLowerCase().includes('locked')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
