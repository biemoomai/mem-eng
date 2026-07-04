// Supabase Edge Function: get-word-details
// Securely handles word translation and analysis with 3-tier server-side fallback:
// Gemini (Primary) ➔ Groq (Backup 1) ➔ Cerebras (Backup 2)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const cleanWordCandidate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.toLowerCase().replace(/[^a-z\s-]/g, '').trim();
  if (!cleaned || cleaned.length > 28 || cleaned.split(/\s+/).length > 3) return null;
  return cleaned;
};

const uniqueWords = (items, max = 8) => {
  const seen = new Set();
  const result = [];
  for (const item of items || []) {
    const word = cleanWordCandidate(item?.word || item);
    if (!word || seen.has(word)) continue;
    seen.add(word);
    result.push(word);
    if (result.length >= max) break;
  }
  return result;
};

const fetchDatamuseWords = async (query) => {
  const res = await fetch(`https://api.datamuse.com/words?${query}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

const fetchLexicalReferences = async (word) => {
  const normalized = cleanWordCandidate(word);
  if (!normalized || normalized.includes(' ')) {
    return {
      source: 'Datamuse',
      synonyms: [],
      nearWords: [],
      wordFamily: [],
      notes: 'Skipped lexical reference lookup for non-English or multi-word input.'
    };
  }

  try {
    const encoded = encodeURIComponent(normalized);
    const [synonymsRaw, relatedRaw, triggerRaw, meansLikeRaw, spelledLikeRaw] = await Promise.all([
      fetchDatamuseWords(`rel_syn=${encoded}&max=12`),
      fetchDatamuseWords(`rel_trg=${encoded}&max=12`),
      fetchDatamuseWords(`ml=${encoded}&max=12`),
      fetchDatamuseWords(`ml=${encoded}&topics=${encoded}&max=12`),
      fetchDatamuseWords(`sp=${encoded}*&max=12`)
    ]);

    const synonyms = uniqueWords(synonymsRaw, 6).filter(item => item !== normalized);
    const nearWords = uniqueWords([...relatedRaw, ...triggerRaw, ...meansLikeRaw], 8)
      .filter(item => item !== normalized && !synonyms.includes(item));
    const wordFamily = uniqueWords(spelledLikeRaw, 8)
      .filter(item => item !== normalized && item.startsWith(normalized.slice(0, Math.min(5, normalized.length))));

    return {
      source: 'Datamuse',
      synonyms,
      nearWords,
      wordFamily,
      notes: 'Use these as candidate lexical references only. Keep only learner-safe, common, semantically correct items.'
    };
  } catch (err) {
    console.warn(`Datamuse reference lookup failed for "${word}":`, err?.message || err);
    return {
      source: 'Datamuse',
      synonyms: [],
      nearWords: [],
      wordFamily: [],
      notes: 'Reference lookup failed; do not invent uncertain lexical relations.'
    };
  }
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { word, forceValid } = await req.json();
    
    if (!word) {
      return new Response(JSON.stringify({ error: "Missing required 'word' parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const lexicalReferences = await fetchLexicalReferences(word);

    const prompt = `
Analyze the input "${word}". Note: If the input is in Thai, first translate it to the most appropriate, common, single English vocabulary word (semantically, NOT a phonetic transliteration or karaoke representation, e.g. for "สาม" translate to "three" NOT "sam", for "สวัสดี" translate to "hello" NOT "sawatdee", for "มือ" translate to "hand" NOT "mua"), and then analyze and return the details FOR THAT ENGLISH WORD (and make sure the "word" property in the returned JSON is this English word in lowercase). If the input is in English, analyze it directly.
Return a JSON object containing its grammatical info, definition, collocations, exactly 2 illustrative scenes, 2 definition-based image prompts, real English verb forms (tenses), and learner-safe lexical relations if applicable.

LEXICAL REFERENCE CANDIDATES FROM DATAMUSE:
${JSON.stringify(lexicalReferences, null, 2)}

CRITICAL VALIDATION RULES FOR "validation":
- You MUST strictly validate if the input "${word}" is a real, correctly-spelled English word/phrase (or a valid Thai word if the input is in Thai).
- Note: Common English slang (e.g., "lit", "flex", "salty", "ghosting", "cap", "no cap"), idioms, phrasal verbs, and natural colloquial phrases (e.g., "bite the bullet", "hang out", "break a leg") used by native speakers and fluent speakers MUST be treated as 100% VALID (set "isInvalid" to false, and generate definitions/scenes for them normally).
- If the input "${word}" is in Thai, you MUST set "isInvalid" to true, and the "suggestion" MUST be the actual semantically correct English translation (e.g. for "สาม" suggest "three", NOT "sam"). Under NO circumstances should you suggest a phonetic transliteration or karaoke representation of the Thai word.
- If "${word}" is a typo, spelling mistake, acronym, abbreviation, or complete gibberish (for example, "uas", "slep", "gdfgdfg"), you MUST set "isInvalid" to true, and provide the closest correctly-spelled English word in "suggestion" (e.g. for "slep" suggest "sleep", for "uas" suggest "use" or "was" or "has").
- DO NOT invent definitions, scenes, or collocations for misspelled words, abbreviations, or gibberish. Always mark them as invalid!

CRITICAL INSTRUCTIONS FOR "verbForms":
- If the analyzed English word is a verb, you MUST provide its 3 principal parts in the "verbForms" field as an array of strings in order: [V1 Base, V2 Past, V3 Past Participle] (e.g., for "go" write ["go", "went", "gone"]; for "play" write ["play", "played", "played"]).
- If the word is NOT a verb (e.g. it is an adverb like "then", a preposition, conjunction, adjective, noun, etc.), or if it does not have real verb forms in English, you MUST set "verbForms" to null.
- DO NOT hallucinate, invent, or make up fake regular verb forms (e.g. for "then" you must return null, do NOT invent "thened").

CRITICAL INSTRUCTIONS FOR "imagePrompts":
- The "imagePrompts" array MUST contain exactly 2 highly descriptive, concrete visual search terms (1-3 words each, e.g., "divider", "zipper splitting", "fences dividing") that represent the visual definition/meaning of the target word directly.
- DO NOT base "imagePrompts" on the scenes! For example, if the scenes take place in a classroom or a kitchen, DO NOT write "classroom" or "kitchen". The prompts must represent the word's definition directly so that searching them yields images explaining the word itself.

CRITICAL INSTRUCTIONS FOR FORMATTING AND TEXT CONTENT:
- DO NOT include any emojis, icons, or pictorial representations in the title, situation, dialogue, meaning, takeaway, or any other output fields. Keep them strictly as clean, standard plain text.
- englishExplanation.definition MUST be concise: maximum 12 words, simple English, no semicolons, no long explanation.

CRITICAL INSTRUCTIONS FOR LEXICAL RELATIONS:
- The Datamuse lists are reference candidates, not guaranteed truth. You must filter them.
- Use ONLY common, learner-safe words that are semantically correct for the main sense you are explaining.
- If a candidate is too obscure, awkward, wrong for the sense, offensive, or uncertain, omit it.
- If there are no reliable candidates, return [].
- DO NOT invent synonyms, near words, or word family items that are not strongly supported by normal English usage.
- "synonyms" means close meaning, not merely related topic.
- "nearWords" means commonly confused, contrastive, or strongly related learner words.
- "wordFamily" means morphological family or clearly derived forms, such as decide/decision/decisive. Do not add random words that only share spelling.
- "moreContexts" must contain genuinely different contexts or senses from the two main scenes. Do not duplicate the same sentence.

Return a JSON object with this exact structure:
{
  "validation": {
    "isInvalid": false, // true ONLY if "${word}" is a typo, spelling mistake, or complete gibberish. false if it is a correct English word/phrase (or valid Thai word/phrase).
    "suggestion": "Closest spelling suggestion if isInvalid is true, else null.",
    "thaiTranslationShort": "1-3 words Thai translation of suggestion, else null.",
    "englishExplanationShort": "Short English definition of suggestion, else null."
  },
  "pos": "Part of speech (e.g. noun, verb), else null if invalid.",
  "cefrLevel": "CEFR level (A1, A2, B1, B2, C1, or C2), else null if invalid.",
  "verbForms": ["V1", "V2", "V3"], // [V1 Base, V2 Past, V3 Past Participle] only if the word is a verb. null if the word is not a verb. DO NOT invent fake regular verb forms.
  "synonyms": ["up to 5 common close synonyms from the references, else []"],
  "nearWords": ["up to 5 related/confusable learner words from the references, else []"],
  "wordFamily": ["up to 5 word-family forms, else []"],
  "moreContexts": [
    {
      "label": "Short label such as Daily use, Work, Academic, Idiom, Different meaning",
      "sentence": "A short natural English sentence using the word in a genuinely different context from the main scenes.",
      "thaiMeaning": "Brief Thai meaning of the sentence.",
      "note": "One short learner note explaining this use."
    }
  ],
  "englishExplanation": {
    "definition": "Very short learner definition in simple English. Maximum 12 words. Example: 'a pet animal that barks' or 'to make something better'.",
    "phrase": "Most common collocation/phrase using the word, else null.",
    "phraseMeaning": "Meaning of the collocation/phrase, else null."
  },
  "scenes": [
    // Include exactly 2 scene objects. Empty array [] if invalid.
    {
      "title": "Scene 1: Title (no emojis, plain text)",
      "situation": "Brief description of the context/situation (no emojis, plain text)",
      "dialogue": "A short, concise, and natural example sentence or dialogue illustrating the word in English. Keep it brief, simple, and easy to understand (normally 5-10 words, clear context, no prefix like 'Person:').",
      "meaning": "Brief explanation of dialogue in Thai (no emojis, plain text)",
      "thaiWordUsed": "The exact Thai word or short phrase inside the 'meaning' sentence that translates the target English word. (e.g., if target is 'jogging' and meaning is 'ฉันชอบไปวิ่งจ๊อกกิ้ง...', write 'วิ่งจ๊อกกิ้ง')",
      "imageTag": "Single concrete English noun representing the location or object in the scene (e.g. 'cafe', 'classroom')"
    },
    {
      "title": "Scene 2: Title (no emojis, plain text)",
      "situation": "Brief description of the context/situation (no emojis, plain text)",
      "dialogue": "A short, concise, and natural example sentence or dialogue illustrating the word in English. Keep it brief, simple, and easy to understand (normally 5-10 words, clear context, no prefix like 'Person:').",
      "meaning": "Brief explanation of dialogue in Thai (no emojis, plain text)",
      "thaiWordUsed": "The exact Thai word or short phrase inside the 'meaning' sentence that translates the target English word.",
      "imageTag": "Single concrete English noun representing the location or object in the scene"
    }
  ],
  "imagePrompts": [
    // 2 concrete visual search terms (2-4 words each) that illustrate the specific situation/context of the 2 scenes above.
    // For example, for "separate" (Scene 1: teams, Scene 2: egg yolks), write: ["teams dividing", "egg yolk separator"].
    // For "over" (Scene 1: recovering, Scene 2: climbing rock), write: ["hospital recovery", "rock climbing"].
    // Avoid generic tags (like "classroom", "kitchen", "cafe") or abstract words. Use specific actions or key objects from the scene situations.
  ],
  "thaiTranslation": {
    "word": "Thai translation of the word, else null.",
    "phrase": "Thai translation of the collocation/phrase, else null."
  },
  "takeaway": "Short key takeaway, else null.",
  "morphNote": "If derived from another word (e.g., past tense, plural, adverb form), write a short note like 'Past tense of [base]', else null."
}

Do NOT wrap the JSON in markdown code blocks. Return ONLY the raw JSON string.
${forceValid ? `NOTE: You must treat "${word}" as a 100% valid English word. "isInvalid" MUST be false.` : ''}
`;

    let textResponse = '';
    let usedProvider = '';
    let errorLog = '';

    // ── Tier 1: Google Gemini ────────────────────────────────────────────────
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiKey) {
      try {
        console.log(`🔮 Querying Gemini for "${word}"...`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' }
            }),
          }
        );
        if (response.ok) {
          const data = await response.json();
          textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          usedProvider = 'Gemini';
        } else {
          const errTxt = await response.text();
          errorLog += `Gemini status ${response.status}: ${errTxt}; `;
        }
      } catch (err) {
        errorLog += `Gemini error: ${err.message}; `;
      }
    } else {
      errorLog += "Gemini Key missing; ";
    }

    // ── Tier 2: Groq Llama 3.3 Fallback ──────────────────────────────────────
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!textResponse && groqKey) {
      try {
        console.log(`🚀 Querying Groq (llama-3.3-70b-versatile) for "${word}"...`);
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.15
          })
        });
        if (response.ok) {
          const data = await response.json();
          textResponse = data.choices[0].message.content.trim();
          usedProvider = 'Groq';
        } else {
          const errTxt = await response.text();
          errorLog += `Groq status ${response.status}: ${errTxt}; `;
        }
      } catch (err) {
        errorLog += `Groq error: ${err.message}; `;
      }
    } else if (!textResponse) {
      errorLog += "Groq Key missing; ";
    }

    // ── Tier 3: Cerebras Fallback ───────────────────────────────────────────
    const cerebrasKey = Deno.env.get("CEREBRAS_API_KEY");
    if (!textResponse && cerebrasKey) {
      try {
        console.log(`⚡ Querying Cerebras (gpt-oss-120b) for "${word}"...`);
        const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cerebrasKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-oss-120b',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.15,
            max_tokens: 2048
          })
        });
        if (response.ok) {
          const data = await response.json();
          textResponse = data.choices[0].message.content.trim();
          usedProvider = 'Cerebras';
        } else {
          const errTxt = await response.text();
          errorLog += `Cerebras status ${response.status}: ${errTxt}; `;
        }
      } catch (err) {
        errorLog += `Cerebras error: ${err.message}; `;
      }
    } else if (!textResponse) {
      errorLog += "Cerebras Key missing; ";
    }

    if (!textResponse) {
      return new Response(JSON.stringify({ error: `All translation providers failed. Log: ${errorLog}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse the text to ensure it's valid JSON
    const parsed = JSON.parse(textResponse.trim());
    parsed._provider = usedProvider; // Add provider metadata
    parsed._referenceSources = {
      lexical: lexicalReferences.source,
      lexicalReferenceUsed: Boolean(
        lexicalReferences.synonyms.length ||
        lexicalReferences.nearWords.length ||
        lexicalReferences.wordFamily.length
      )
    };

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
