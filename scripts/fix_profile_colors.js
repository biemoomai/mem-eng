import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const profilePath = path.join(__dirname, '../src/pages/Profile.jsx');
let content = fs.readFileSync(profilePath, 'utf8');

// Replace all occurrences of hardcoded 'white' with CSS variable
content = content.replace(/color:\s*'white'/g, "color: 'var(--text-primary)'");
content = content.replace(/color:\s*"white"/g, "color: 'var(--text-primary)'");

// Replace hardcoded transparent white backgrounds with appropriate CSS variables
content = content.replace(/background:\s*'rgba\(255,\s*255,\s*255,\s*0\.03\)'/g, "background: 'var(--btn-bg)'");
content = content.replace(/background:\s*'rgba\(255,255,255,0\.03\)'/g, "background: 'var(--btn-bg)'");

content = content.replace(/border:\s*'1px\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.05\)'/g, "border: '1px solid var(--btn-border)'");
content = content.replace(/border:\s*'1px\s+solid\s+rgba\(255,255,255,0\.05\)'/g, "border: '1px solid var(--btn-border)'");

content = content.replace(/background:\s*'rgba\(255,\s*255,\s*255,\s*0\.05\)'/g, "background: 'var(--btn-bg-hover)'");
content = content.replace(/background:\s*'rgba\(255,255,255,0\.05\)'/g, "background: 'var(--btn-bg-hover)'");

content = content.replace(/borderColor:\s*'rgba\(255,\s*255,\s*255,\s*0\.1\)'/g, "borderColor: 'var(--btn-border)'");
content = content.replace(/borderColor:\s*'rgba\(255,255,255,0\.1\)'/g, "borderColor: 'var(--btn-border)'");

fs.writeFileSync(profilePath, content);
console.log('Fixed Profile.jsx colors for Light Mode!');
