import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, '../src/pages');
const files = ['Purge.jsx', 'Sync.jsx', 'AddWord.jsx', 'Home.jsx', 'Login.jsx'];

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace hardcoded text colors
  content = content.replace(/color:\s*'white'/g, "color: 'var(--text-primary)'");
  content = content.replace(/color:\s*"white"/g, "color: 'var(--text-primary)'");
  content = content.replace(/color:\s*['"]#ffffff['"]/ig, "color: 'var(--text-primary)'");
  content = content.replace(/color:\s*['"]#fff['"]/ig, "color: 'var(--text-primary)'");

  // Fix white backgrounds that look bad in light mode
  // But leave 'rgba(255,255,255,0.8)' or similar text colors alone unless they are backgrounds
  content = content.replace(/background:\s*'rgba\(255,\s*255,\s*255,\s*0\.0[1-5]\)'/g, "background: 'var(--btn-bg)'");
  content = content.replace(/background:\s*'rgba\(255,255,255,0\.0[1-5]\)'/g, "background: 'var(--btn-bg)'");
  
  content = content.replace(/background:\s*'rgba\(255,\s*255,\s*255,\s*0\.1\)'/g, "background: 'var(--btn-bg-hover)'");
  content = content.replace(/background:\s*'rgba\(255,255,255,0\.1\)'/g, "background: 'var(--btn-bg-hover)'");

  content = content.replace(/border:\s*'1px\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.05\)'/g, "border: '1px solid var(--btn-border)'");
  content = content.replace(/border:\s*'1px\s+solid\s+rgba\(255,255,255,0\.05\)'/g, "border: '1px solid var(--btn-border)'");

  fs.writeFileSync(filePath, content);
  console.log(`Fixed colors in ${file}`);
});
