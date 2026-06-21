// Supabase Edge Function: get-word-details
// Securely handles word translation and analysis with 3-tier server-side fallback:
// Gemini (Primary) ➔ Groq (Backup 1) ➔ Cerebras (Backup 2)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const prompt = `
Analyze the input "${word}". Note: If the input is in Thai, first translate it to the most appropriate, common, single English vocabulary word (semantically, NOT a phonetic transliteration or karaoke representation, e.g. for "สาม" translate to "three" NOT "sam", for "สวัสดี" translate to "hello" NOT "sawatdee", for "มือ" translate to "hand" NOT "mua"), and then analyze and return the details FOR THAT ENGLISH WORD (and make sure the "word" property in the returned JSON is this English word in lowercase). If the input is in English, analyze it directly.
Return a JSON object containing its grammatical info, definition, collocations, exactly 2 illustrative scenes, 2 definition-based image prompts, and real English verb forms (tenses) if applicable.

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
  "englishExplanation": {
    "definition": "Explain the English word using the simplest English vocabulary possible (e.g., instead of 'a domesticated carnivorous mammal...' use 'a common house pet that barks'). Keep the explanation extremely simple, basic, and easy for non-native learners to understand, avoiding academic or complex jargon. If absolutely necessary, harder words can be used occasionally, but prioritize simple words.",
    "phrase": "Most common collocation/phrase using the word, else null.",
    "phraseMeaning": "Meaning of the collocation/phrase, else null."
  },
  "scenes": [
    // Include exactly 2 scene objects. Empty array [] if invalid.
    {
      "title": "Scene 1: Title",
      "emoji": "2 emojis",
      "situation": "Brief description of the context/situation",
      "dialogue": "A short, concise, and natural example sentence or dialogue illustrating the word in English. Keep it brief, simple, and easy to understand (normally 5-10 words, clear context, no prefix like 'Person:').",
      "meaning": "Brief explanation of dialogue in Thai",
      "thaiWordUsed": "The exact Thai word or short phrase inside the 'meaning' sentence that translates the target English word. (e.g., if target is 'jogging' and meaning is 'ฉันชอบไปวิ่งจ๊อกกิ้ง...', write 'วิ่งจ๊อกกิ้ง')",
      "imageTag": "Single concrete English noun representing the location or object in the scene (e.g. 'cafe', 'classroom')"
    },
    {
      "title": "Scene 2: Title",
      "emoji": "2 emojis",
      "situation": "Brief description of the context/situation",
      "dialogue": "A short, concise, and natural example sentence or dialogue illustrating the word in English. Keep it brief, simple, and easy to understand (normally 5-10 words, clear context, no prefix like 'Person:').",
      "meaning": "Brief explanation of dialogue in Thai",
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
