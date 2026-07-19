import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.33.1';

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to build the LINE Flex Message JSON
function buildFlexMessage(aiData: any, userText: string, wordId: string | null = null) {
  // If the word was invalid, return a simple text message suggesting the correct word
  if (aiData.validation?.isInvalid) {
    return {
      type: "text",
      text: `บอทไม่รู้จักคำนี้ครับ 😅\nคุณหมายถึง "${aiData.validation.suggestion}" หรือเปล่าครับ?`
    };
  }

  const posMap: Record<string, string> = {
    noun: 'noun (คำนาม)',
    verb: 'verb (คำกริยา)',
    adjective: 'adjective (คำคุณศัพท์)',
    adverb: 'adverb (คำวิเศษณ์)',
    pronoun: 'pronoun (คำสรรพนาม)',
    preposition: 'preposition (คำบุพบท)',
    conjunction: 'conjunction (คำสันธาน)',
    interjection: 'interjection (คำอุทาน)'
  };

  const rawPos = aiData.pos ? aiData.pos.toLowerCase() : "";
  const posDisplay = posMap[rawPos] || aiData.pos || "word";

  const thaiTrans = aiData.thaiTranslation?.word || aiData.validation?.thaiTranslationShort || "N/A";
  const engDef = aiData.englishExplanation?.definition || "";
  const sceneSentence = aiData.scenes?.[0]?.dialogue || "No example available.";
  const sceneMeaning = aiData.scenes?.[0]?.meaning || "";

  return {
    type: "flex",
    altText: `คำแปลของคำว่า ${userText}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#6fb3d2",
        paddingAll: "12px",
        contents: [
          {
            type: "text",
            text: posDisplay,
            color: "#ffffff",
            weight: "bold",
            size: "sm"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `แปล: ${thaiTrans}`,
            weight: "bold",
            size: "md",
            color: "#4a86e8",
            wrap: true
          },
          {
            type: "text",
            text: `"${engDef}"`,
            size: "sm",
            color: "#666666",
            wrap: true,
            margin: "md"
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#f8f9fa",
            cornerRadius: "8px",
            paddingAll: "12px",
            margin: "md",
            contents: [
              {
                type: "text",
                text: sceneSentence,
                size: "sm",
                color: "#333333",
                wrap: true
              },
              ...(sceneMeaning ? [{
                type: "text",
                text: `คำแปล: ${sceneMeaning}`,
                size: "xs",
                color: "#888888",
                wrap: true,
                margin: "sm"
              }] : [])
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#43a047",
            height: "sm",
            action: {
              type: "postback",
              label: "+ เก็บเข้าเด็ค",
              data: wordId ? `add_word:${wordId}:::${userText}` : `add_word:${userText}:::${rawPos}:::${thaiTrans}`,
              displayText: `เก็บคำว่า "${userText}" เข้าเด็ค`
            }
          }
        ]
      }
    }
  };
}

serve(async (req) => {
  // Handle CORS for browser testing if needed
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bodyText = await req.text();
    const data = JSON.parse(bodyText);
    const events = data.events || [];

    for (const event of events) {
      if ((event.type === 'message' && event.message.type === 'text') || event.type === 'postback') {
        let userText = '';
        let replyToken = event.replyToken;
        let userId = event.source.userId;

        if (event.type === 'postback') {
          userText = event.postback.data;
          console.log(`Received postback from LINE: ${userText} by ${userId}`);
        } else {
          userText = event.message.text.trim();
          console.log(`Received message from LINE: ${userText} by ${userId}`);
        }

        if (userText.startsWith('play_audio:')) {
          const word = userText.split(':')[1];
          await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
            body: JSON.stringify({
              replyToken: replyToken,
              messages: [{ type: 'text', text: `🔊 (ฟีเจอร์ฟังเสียงกำลังพัฒนาครับ: ${word})` }]
            })
          });
          continue;
        }

        if (userText.startsWith('add_word:')) {
          const payloadParts = userText.replace('add_word:', '').split(':::');
          const wordIdOrText = payloadParts[0];
          const wordToAdd = payloadParts[1] || wordIdOrText;
          
          let replyMsg = `✅ เก็บคำว่า "${wordToAdd}" เข้าเด็คของคุณเรียบร้อยแล้วครับ!`;

          try {
            const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            
            // 1. Get user UUID from LINE User ID
            const { data: userData } = await supabaseAdmin
              .from('users')
              .select('id')
              .eq('line_user_id', userId)
              .single();

            if (!userData) {
              // User hasn't opened LIFF yet to register their account
              replyMsg = `⚠️ คุณยังไม่เคยเข้าแอปเลยครับ กรุณากดเมนู Flashcards ด้านล่างเพื่อเริ่มใช้งานก่อนนะครับ!`;
            } else {
              // If wordIdOrText is a UUID, it means we have the wordId from global_dictionary
              // If not, it means the insert to global_dictionary failed earlier, so we can't add to user_decks easily.
              if (wordIdOrText.length === 36 && wordIdOrText.includes('-')) {
                const { error: insertErr } = await supabaseAdmin
                  .from('user_decks')
                  .insert({
                    user_id: userData.id,
                    word_id: wordIdOrText,
                    srs_level: 'Learning',
                    repetition: 0,
                    interval: 1,
                    ease_factor: 2.5,
                    next_review_date: new Date().toISOString(),
                    stability: 2.0,
                    difficulty: 5.0,
                    reps: 0,
                    lapses: 0,
                    state: 0,
                    scheduled_days: 0,
                    elapsed_days: 0,
                    learning_steps: 0
                  });
                  
                if (insertErr) {
                  if (insertErr.code === '23505') {
                    replyMsg = `ℹ️ คำว่า "${wordToAdd}" มีอยู่ในเด็คของคุณแล้วครับ`;
                  } else {
                    console.error("Insert error:", insertErr);
                    replyMsg = `❌ เกิดข้อผิดพลาดในการบันทึกคำศัพท์ลงเด็คครับ`;
                  }
                }
              } else {
                 replyMsg = `❌ ไม่สามารถบันทึกได้ กรุณาลองพิมพ์หาคำศัพท์ใหม่อีกครั้งครับ`;
              }
            }
          } catch (e) {
             console.error("DB Error:", e);
             replyMsg = `❌ เกิดข้อผิดพลาดในระบบฐานข้อมูล`;
          }

          await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
            body: JSON.stringify({
              replyToken: replyToken,
              messages: [{ type: 'text', text: replyMsg }]
            })
          });
          continue;
        }

        // Show Loading Animation in LINE while AI is processing
        await fetch('https://api.line.me/v2/bot/chat/loading/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
          body: JSON.stringify({ chatId: userId, loadingSeconds: 20 })
        });

        // Call the AI Edge Function internally
        const aiUrl = `${SUPABASE_URL}/functions/v1/get-word-details`;
        const aiResponse = await fetch(aiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ word: userText, forceValid: false })
        });

        if (!aiResponse.ok) {
           console.error('AI Function failed:', await aiResponse.text());
           throw new Error('AI Function failed');
        }

        const aiData = await aiResponse.json();
        
        // Ensure word is in global_dictionary before building FlexMessage
        let wordId = null;
        let finalUserText = userText;
        if (!aiData.validation?.isInvalid) {
          finalUserText = aiData.word || userText;
          const normalizedWord = finalUserText.toLowerCase();
          try {
            const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            let { data: existingWord } = await supabaseAdmin
              .from('global_dictionary')
              .select('id')
              .eq('word', normalizedWord)
              .maybeSingle();

            if (existingWord) {
              wordId = existingWord.id;
            } else {
              const { data: newWord } = await supabaseAdmin
                .from('global_dictionary')
                .insert({
                  word: normalizedWord,
                  pos: aiData.pos || 'n.',
                  meaning: JSON.stringify(aiData),
                  rich_data: aiData,
                  cefr_level: aiData.cefrLevel || 'Unranked'
                })
                .select('id')
                .single();
              if (newWord) wordId = newWord.id;
            }
          } catch (dbErr) {
            console.error("Error inserting into global_dictionary:", dbErr);
          }
        }

        const flexMessage = buildFlexMessage(aiData, finalUserText, wordId);

        // Send Reply to LINE
        await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
          },
          body: JSON.stringify({
            replyToken: replyToken,
            messages: [flexMessage]
          })
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error('Webhook Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
