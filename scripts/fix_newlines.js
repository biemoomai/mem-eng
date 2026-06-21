import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'scripts', 'massive_5000_seed.sql');
let text = fs.readFileSync(filePath, 'utf8');

// Replace literal "\n" string with actual newline.
text = text.replace(/\\n/g, '\n');

// Also try replacing string "\\n" if it got double escaped.
text = text.replace(/\\\\n/g, '\n');
// Replace Windows style CRLF with LF
text = text.replace(/\r\n/g, '\n');

// Trim trailing whitespace from each line
text = text.split('\n').map(line => line.trimEnd()).join('\n');
fs.writeFileSync(filePath, text);
console.log("Fixed newlines!");
