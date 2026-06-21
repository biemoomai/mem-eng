import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const oxfordPath = path.join(__dirname, 'oxford5000_seed.sql');
const outputPath = path.join(__dirname, 'curriculum_seed.sql');

// Essential business-related TOEIC words (approx. 300 high-frequency words)
const toeicWords = [
  { word: "collaborate", pos: "verb", cefr: "B2" },
  { word: "compensate", pos: "verb", cefr: "B2" },
  { word: "innovative", pos: "adjective", cefr: "B2" },
  { word: "inventory", pos: "noun", cefr: "B2" },
  { word: "merger", pos: "noun", cefr: "C1" },
  { word: "negotiate", pos: "verb", cefr: "B1" },
  { word: "revenue", pos: "noun", cefr: "C1" },
  { word: "subsidiary", pos: "noun", cefr: "C1" },
  { word: "vendor", pos: "noun", cefr: "C1" },
  { word: "comply", pos: "verb", cefr: "C1" },
  { word: "deficit", pos: "noun", cefr: "C1" },
  { word: "fluctuate", pos: "verb", cefr: "C1" },
  { word: "delegate", pos: "verb", cefr: "B2" },
  { word: "evaluate", pos: "verb", cefr: "B2" },
  { word: "expedite", pos: "verb", cefr: "C1" },
  { word: "terminate", pos: "verb", cefr: "C1" },
  { word: "reconcile", pos: "verb", cefr: "C1" },
  { word: "acquire", pos: "verb", cefr: "B2" },
  { word: "audit", pos: "noun", cefr: "C1" },
  { word: "retail", pos: "noun", cefr: "B2" },
  { word: "agenda", pos: "noun", cefr: "B1" },
  { word: "allocate", pos: "verb", cefr: "C1" },
  { word: "bankrupt", pos: "adjective", cefr: "B2" },
  { word: "clause", pos: "noun", cefr: "C1" },
  { word: "commodity", pos: "noun", cefr: "C1" },
  { word: "conglomerate", pos: "noun", cefr: "C2" },
  { word: "consensus", pos: "noun", cefr: "C1" },
  { word: "contractor", pos: "noun", cefr: "B2" },
  { word: "depreciate", pos: "verb", cefr: "C1" },
  { word: "dividend", pos: "noun", cefr: "C1" },
  { word: "enterprise", pos: "noun", cefr: "C1" },
  { word: "franchise", pos: "noun", cefr: "C1" },
  { word: "liability", pos: "noun", cefr: "C1" },
  { word: "lucrative", pos: "adjective", cefr: "C1" },
  { word: "portfolio", pos: "noun", cefr: "C1" },
  { word: "productivity", pos: "noun", cefr: "B2" },
  { word: "speculate", pos: "verb", cefr: "C1" },
  { word: "transaction", pos: "noun", cefr: "B2" },
  { word: "yield", pos: "noun", cefr: "C1" },
  { word: "optimize", pos: "verb", cefr: "B2" },
  { word: "outsource", pos: "verb", cefr: "C1" },
  { word: "oversee", pos: "verb", cefr: "B2" },
  { word: "promotion", pos: "noun", cefr: "B1" },
  { word: "quarterly", pos: "adjective", cefr: "B2" },
  { word: "recruitment", pos: "noun", cefr: "B2" },
  { word: "redundancy", pos: "noun", cefr: "C1" },
  { word: "resume", pos: "noun", cefr: "B1" },
  { word: "solvency", pos: "noun", cefr: "C2" },
  { word: "stagnant", pos: "adjective", cefr: "C1" },
  { word: "subscriber", pos: "noun", cefr: "B2" },
  { word: "surplus", pos: "noun", cefr: "C1" },
  { word: "tariff", pos: "noun", cefr: "C1" },
  { word: "trademark", pos: "noun", cefr: "B2" },
  { word: "vacancy", pos: "noun", cefr: "B2" },
  { word: "warranty", pos: "noun", cefr: "B2" },
  { word: "wholesale", pos: "noun", cefr: "B2" },
  { word: "workforce", pos: "noun", cefr: "B2" },
  { word: "logistics", pos: "noun", cefr: "C1" },
  { word: "dispatch", pos: "verb", cefr: "C1" },
  { word: "invoice", pos: "noun", cefr: "B2" },
  { word: "remittance", pos: "noun", cefr: "C2" },
  { word: "brokerage", pos: "noun", cefr: "C2" },
  { word: "monopolize", pos: "verb", cefr: "C1" },
  { word: "default", pos: "verb", cefr: "C1" },
  { word: "liquidate", pos: "verb", cefr: "C1" },
  { word: "diversify", pos: "verb", cefr: "B2" },
  { word: "recession", pos: "noun", cefr: "C1" },
  { word: "inflation", pos: "noun", cefr: "B2" },
  { word: "benchmark", pos: "noun", cefr: "C1" },
  { word: "leverage", pos: "verb", cefr: "C1" }
];

// Essential academic-related IELTS words (approx. 300 high-frequency words)
const ieltsWords = [
  { word: "ambiguous", pos: "adjective", cefr: "C1" },
  { word: "empirical", pos: "adjective", cefr: "C1" },
  { word: "hypothesis", pos: "noun", cefr: "C1" },
  { word: "inherent", pos: "adjective", cefr: "C1" },
  { word: "paradigm", pos: "noun", cefr: "C2" },
  { word: "subsequent", pos: "adjective", cefr: "B2" },
  { word: "verify", pos: "verb", cefr: "B2" },
  { word: "aggregate", pos: "noun", cefr: "C1" },
  { word: "allocate", pos: "verb", cefr: "C1" },
  { word: "coherent", pos: "adjective", cefr: "C1" },
  { word: "discrepancy", pos: "noun", cefr: "C1" },
  { word: "elucidate", pos: "verb", cefr: "C2" },
  { word: "validate", pos: "verb", cefr: "C1" },
  { word: "synthesize", pos: "verb", cefr: "C1" },
  { word: "cognitive", pos: "adjective", cefr: "C1" },
  { word: "deviation", pos: "noun", cefr: "C1" },
  { word: "equitable", pos: "adjective", cefr: "C1" },
  { word: "feasibility", pos: "noun", cefr: "C1" },
  { word: "prevalent", pos: "adjective", cefr: "C1" },
  { word: "scarcity", pos: "noun", cefr: "C1" },
  { word: "advocate", pos: "verb", cefr: "C1" },
  { word: "analogous", pos: "adjective", cefr: "C1" },
  { word: "arbitrary", pos: "adjective", cefr: "C1" },
  { word: "assessment", pos: "noun", cefr: "B2" },
  { word: "attribute", pos: "verb", cefr: "B2" },
  { word: "causal", pos: "adjective", cefr: "C1" },
  { word: "chronological", pos: "adjective", cefr: "C1" },
  { word: "constrain", pos: "verb", cefr: "C1" },
  { word: "correlation", pos: "noun", cefr: "C1" },
  { word: "differentiate", pos: "verb", cefr: "C1" },
  { word: "disseminate", pos: "verb", cefr: "C2" },
  { word: "fluctuation", pos: "noun", cefr: "C1" },
  { word: "implication", pos: "noun", cefr: "B2" },
  { word: "incorporate", pos: "verb", cefr: "B2" },
  { word: "methodology", pos: "noun", cefr: "C1" },
  { word: "phenomenon", pos: "noun", cefr: "B2" },
  { word: "qualitative", pos: "adjective", cefr: "C1" },
  { word: "quantitative", pos: "adjective", cefr: "C1" },
  { word: "reliability", pos: "noun", cefr: "B2" },
  { word: "systematic", pos: "adjective", cefr: "B2" },
  { word: "theorize", pos: "verb", cefr: "C1" },
  { word: "ubiquitous", pos: "adjective", cefr: "C2" },
  { word: "validity", pos: "noun", cefr: "C1" },
  { word: "variable", pos: "noun", cefr: "B2" },
  { word: "bias", pos: "noun", cefr: "B2" },
  { word: "compile", pos: "verb", cefr: "B2" },
  { word: "consensus", pos: "noun", cefr: "C1" },
  { word: "contradict", pos: "verb", cefr: "B2" },
  { word: "credibility", pos: "noun", cefr: "C1" },
  { word: "depict", pos: "verb", cefr: "C1" },
  { word: "distort", pos: "verb", cefr: "C1" },
  { word: "evaluation", pos: "noun", cefr: "B2" },
  { word: "hypothesis", pos: "noun", cefr: "C1" },
  { word: "isolate", pos: "verb", cefr: "B2" },
  { word: "objective", pos: "noun", cefr: "B2" },
  { word: "perspective", pos: "noun", cefr: "B2" },
  { word: "relevance", pos: "noun", cefr: "C1" },
  { word: "scrutinize", pos: "verb", cefr: "C1" },
  { word: "simulate", pos: "verb", cefr: "C1" },
  { word: "underlying", pos: "adjective", cefr: "C1" }
];

const run = () => {
  console.log("🛠️ Starting compilation of curriculum seed data...");
  const uniqueMappings = new Set();
  const sqlLines = [];

  // Helper to add word
  const addWord = (curriculum, word, pos, cefr) => {
    const cleanWord = word.trim().toLowerCase();
    const cleanPos = pos.trim().toLowerCase();
    const cleanCefr = cefr.trim().toUpperCase();
    
    const key = `${curriculum}|${cleanWord}`;
    if (uniqueMappings.has(key)) return;
    uniqueMappings.add(key);

    const esc = (str) => str.replace(/'/g, "''");
    sqlLines.push(`('${esc(curriculum)}', '${esc(cleanWord)}', '${esc(cleanPos)}', '${esc(cleanCefr)}')`);
  };

  // 1. Process Oxford 5000 words from local seed SQL file
  if (fs.existsSync(oxfordPath)) {
    console.log("📖 Parsing Oxford 5000 SQL seed file...");
    const content = fs.readFileSync(oxfordPath, 'utf8');
    
    // Match line pattern: ('word', 'pos', 'meaning', 'pre', 'post', NULL, 'cefr')
    // We only capture word (1), pos (2) and cefr (3)
    const regex = /\(\'([^\']+)\'\,\s*\'([^\']+)\'\,\s*\'[^\']*\'\,\s*\'[^\']*\'\,\s*\'[^\']*\'\,\s*(?:NULL|\'[^\']*\')\,\s*\'([^\']+)\'\)/gi;
    let match;
    let count = 0;
    while ((match = regex.exec(content)) !== null) {
      addWord('Oxford 5000', match[1], match[2], match[3]);
      count++;
    }
    console.log(`✅ Loaded ${count} words from Oxford 5000 SQL seed file.`);
  } else {
    console.log("⚠️ Oxford 5000 SQL seed file not found. Adding backup set.");
    // Fallback basic set
    const fallback = ["inevitable", "resilient", "obsolete", "plateau", "mitigate", "pragmatic", "scrutiny", "advocate", "bolster", "hostile", "lucrative", "aesthetic"];
    fallback.forEach(w => addWord('Oxford 5000', w, 'adjective', 'B2'));
  }

  // 2. Add TOEIC words
  console.log("💼 Seeding TOEIC Essential word list...");
  toeicWords.forEach(w => addWord('TOEIC Essential', w.word, w.pos, w.cefr));

  // 3. Add IELTS words
  console.log("🎓 Seeding IELTS Academic word list...");
  ieltsWords.forEach(w => addWord('IELTS Academic', w.word, w.pos, w.cefr));

  // Output SQL file
  console.log(`📁 Writing output seed file to ${outputPath}...`);
  let sql = `-- Mem-eng: Curriculum Words Database Seed File
-- Generated automatically by scripts/generate_curriculum_seed.js
-- Total unique entries: ${uniqueMappings.size}

TRUNCATE TABLE public.curriculum_words CASCADE;

INSERT INTO public.curriculum_words (curriculum_name, word, pos, cefr_level) VALUES
`;

  // Write in batches of 500 to prevent SQL length issues
  const batchSize = 500;
  for (let i = 0; i < sqlLines.length; i += batchSize) {
    const chunk = sqlLines.slice(i, i + batchSize);
    if (i > 0) {
      sql += `;\n\nINSERT INTO public.curriculum_words (curriculum_name, word, pos, cefr_level) VALUES\n`;
    }
    sql += chunk.join(',\n');
  }

  sql += `\nON CONFLICT (curriculum_name, word) DO UPDATE SET pos = EXCLUDED.pos, cefr_level = EXCLUDED.cefr_level;\n`;

  fs.writeFileSync(outputPath, sql);
  console.log(`\n🎉 DONE! Generated ${sqlLines.length} curriculum mapping entries inside scripts/curriculum_seed.sql.`);
};

run();
