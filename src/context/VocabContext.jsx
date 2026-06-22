import React, { createContext, useState, useContext, useEffect } from 'react';
import { getVocabImageUrl, fetchVocabImage } from '../utils/imageHelper';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

// Sanitizer to clean and correct Thai orthography / combining characters to prevent rendering errors
const sanitizeThaiText = (text) => {
  if (typeof text !== 'string') return text;
  
  let cleaned = text;
  
  // 1. Fix common LLM transliteration/spelling corruptions for English words
  cleaned = cleaned.replace(/ฟล๊[าๅ]ช/g, 'แฟลช');
  cleaned = cleaned.replace(/ฟลั[าๅ]ช/g, 'ฟลัช');
  cleaned = cleaned.replace(/แอร์พ๊อต/g, 'แอร์พอร์ต');
  cleaned = cleaned.replace(/พ๊อต/g, 'พอร์ต');
  cleaned = cleaned.replace(/การ์ดฟล๊[าๅ]ช/g, 'การ์ดแฟลช');
  
  // 2. Correct invalid usage of ๅ (Lak Khang Thong) - should only follow ฤ (\u0e24) or ฦ (\u0e26)
  // If it follows any other character, replace it with normal า (\u0e32)
  cleaned = cleaned.replace(/([^ฤฦ])ๅ/g, '$1า');
  
  // 3. Fix combining mark order issues to prevent dotted circles (◌)
  // Tone marks: ่ (0e48), ้ (0e49), ๊ (0e4a), ๋ (0e4b), ์ (0e4c), ็ (0e47)
  // Above vowels: ั (0e31), ิ (0e34), ี (0e35), ึ (0e36), ื (0e37)
  // Below vowels: ุ (0e38), ู (0e39)
  
  // Swap (tone mark) + (above/below vowel) to (above/below vowel) + (tone mark)
  cleaned = cleaned.replace(/([\u0e48-\u0e4b])([\u0e31\u0e34-\u0e39])/g, '$2$1');
  
  // Remove duplicate consecutive tone marks or duplicate above/below vowels
  cleaned = cleaned.replace(/([\u0e48-\u0e4c])[\u0e48-\u0e4c]+/g, '$1');
  cleaned = cleaned.replace(/([\u0e31\u0e34-\u0e39])[\u0e31\u0e34-\u0e39]+/g, '$1');
  
  // Remove orphan combining marks (at start of string or preceded by space)
  cleaned = cleaned.replace(/(^\s*|[\s])([\u0e31\u0e34-\u0e39\u0e47-\u0e4c]+)/g, '$1');

  // Remove CJK (Chinese, Japanese, Korean) characters that might leak from AI translation
  cleaned = cleaned.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff]/g, '');

  return cleaned;
};

// Recursively sanitize all string properties in an object or array
const sanitizeThaiInObject = (obj) => {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    return sanitizeThaiText(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeThaiInObject);
  }
  if (typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      newObj[key] = sanitizeThaiInObject(obj[key]);
    }
    return newObj;
  }
  return obj;
};

const VocabContext = createContext();

export const useVocab = () => useContext(VocabContext);

export const VocabProvider = ({ children }) => {
  const [vocab, setVocab] = useState([]);
  const [streak, setStreak] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviewLogs, setReviewLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('vocab_review_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  const saveLogsToLocal = (logs) => {
    try {
      localStorage.setItem('vocab_review_logs', JSON.stringify(logs));
    } catch (e) {}
  };

  const { user } = useAuth();

  // Sync local deck and review logs to/from Supabase on login or reconnect
  useEffect(() => {
    if (user) {
      syncData(user.id);
    }
  }, [user]);

  const syncData = async (userId) => {
    try {
      setLoading(true);

      // Fetch user profile stats (Streak)
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('streak_days')
        .eq('id', userId)
        .maybeSingle();

      if (!profileError && userProfile) {
        const remoteStreak = userProfile.streak_days || 1;

        const localStreakVal = parseInt(localStorage.getItem('chatgpt_anki_streak') || '1', 10);
        const finalStreak = Math.max(remoteStreak, localStreakVal);
        setStreak(finalStreak);
        localStorage.setItem('chatgpt_anki_streak', finalStreak.toString());

        if (localStreakVal > remoteStreak) {
          await supabase
            .from('users')
            .update({ streak_days: finalStreak })
            .eq('id', userId);
        }
      }

      // 1. Upload unsynced local decks
      const localCards = vocab.filter(item => typeof item.id === 'string' && item.id.startsWith('local-'));
      for (const card of localCards) {
        // Insert into global dictionary if missing
        let wordId = null;
        const { data: existingWord } = await supabase
          .from('global_dictionary')
          .select('id')
          .eq('word', card.word.toLowerCase())
          .maybeSingle();

        if (existingWord) {
          wordId = existingWord.id;
        } else {
          const richDetails = typeof card.meaning === 'string' ? JSON.parse(card.meaning) : card.meaning;
          const { data: newWord, error: wordError } = await supabase
            .from('global_dictionary')
            .insert({
              word: card.word.toLowerCase(),
              pos: card.pos || 'n.',
              meaning: typeof card.meaning === 'string' ? card.meaning : JSON.stringify(card.meaning),
              rich_data: richDetails,
              cefr_level: card.cefrLevel || 'Unranked'
            })
            .select('id')
            .single();

          if (!wordError && newWord) {
            wordId = newWord.id;
          }
        }

        if (wordId) {
          // Insert into user_decks
          await supabase
            .from('user_decks')
            .insert({
              user_id: userId,
              word_id: wordId,
              srs_level: card.srsLevel,
              repetition: card.repetition,
              interval: card.interval,
              ease_factor: card.easeFactor,
              next_review_date: card.nextReviewDate,
              stability: card.stability || 0.1,
              difficulty: card.difficulty || 3.0,
              reps: card.reps || 0,
              lapses: card.lapses || 0,
              state: card.state || 0
            });
        }
      }

      // 2. Upload unsynced review logs
      if (reviewLogs.length > 0) {
        const { error: logsError } = await supabase
          .from('user_review_logs')
          .insert(
            reviewLogs.map(log => ({
              user_id: userId,
              word: log.word,
              rating: log.rating,
              response_time_ms: log.response_time_ms,
              stability_before: log.stability_before,
              stability_after: log.stability_after,
              review_date: log.review_date
            }))
          );
        if (!logsError) {
          setReviewLogs([]);
          localStorage.removeItem('vocab_review_logs');
        }
      }

      // 3. Fetch all decks from Supabase (source of truth)
      const { data: remoteDecks, error: fetchError } = await supabase
        .from('user_decks')
        .select(`
          *,
          global_dictionary (*)
        `)
        .eq('user_id', userId);

      if (!fetchError && remoteDecks) {
        const merged = remoteDecks
          .filter(ud => ud.global_dictionary)
          .map(ud => {
            let parsedMeaning = ud.global_dictionary.meaning;
            let parsedRichData = ud.global_dictionary.rich_data;
          try {
            if (typeof parsedMeaning === 'string') parsedMeaning = JSON.parse(parsedMeaning);
          } catch (e) {}
          try {
            if (typeof parsedRichData === 'string') parsedRichData = JSON.parse(parsedRichData);
          } catch (e) {}

          return {
            id: ud.id,
            word: ud.global_dictionary.word,
            pos: ud.global_dictionary.pos,
            meaning: parsedMeaning,
            richCardData: parsedRichData || parsedMeaning,
            videoUrl: parsedRichData?.savedSceneImages?.[0] || parsedMeaning?.savedSceneImages?.[0] || '',
            srsLevel: ud.srs_level,
            repetition: ud.repetition,
            interval: ud.interval,
            easeFactor: ud.ease_factor,
            nextReviewDate: ud.next_review_date,
            stability: ud.stability,
            difficulty: ud.difficulty,
            reps: ud.reps,
            lapses: ud.lapses,
            state: ud.state,
            created_at: ud.created_at
          };
        });
        setVocab(merged);
        saveDeckToLocal(merged);
      }
    } catch (err) {
      console.error("Error in syncData:", err);
    } finally {
      setLoading(false);
    }
  };

  const [activeCurriculum, setActiveCurriculumState] = useState(() => {
    try {
      return localStorage.getItem('chatgpt_anki_curriculum') || 'Self-Study only';
    } catch (e) {
      return 'Self-Study only';
    }
  });

  const setActiveCurriculum = (val) => {
    setActiveCurriculumState(val);
    try {
      localStorage.setItem('chatgpt_anki_curriculum', val);
    } catch (e) {}
  };

  const [curriculumList, setCurriculumList] = useState([]);
  const [curriculumWords, setCurriculumWords] = useState(new Set());
  const [loadingCurriculumWords, setLoadingCurriculumWords] = useState(false);

  useEffect(() => {
    if (activeCurriculum === 'Self-Study only') {
      setCurriculumWords(new Set());
      setCurriculumList([]);
      return;
    }

    let isMounted = true;
    const fetchCurriculumWords = async () => {
      try {
        setLoadingCurriculumWords(true);
        let allWords = [];
        let start = 0;
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('curriculum_words')
            .select('word, pos, cefr_level')
            .eq('curriculum_name', activeCurriculum)
            .range(start, start + limit - 1);

          if (error) throw error;

          if (data && data.length > 0) {
            allWords = allWords.concat(data);
            start += limit;
            if (data.length < limit) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }
        
        if (isMounted) {
          setCurriculumList(allWords);
          const wordSet = new Set(allWords.map(item => item.word.toLowerCase().trim()));
          setCurriculumWords(wordSet);
        }
      } catch (err) {
        console.error("Error fetching curriculum words:", err);
      } finally {
        if (isMounted) setLoadingCurriculumWords(false);
      }
    };

    fetchCurriculumWords();
    return () => {
      isMounted = false;
    };
  }, [activeCurriculum]);

  // Global state to track status of AI translation providers
  const [providerStatus, setProviderStatus] = useState({
    Gemini: { status: 'healthy', retryAfter: null, lastError: null, lastUsed: null },
    Groq: { status: 'healthy', retryAfter: null, lastError: null, lastUsed: null },
    Cerebras: { status: 'healthy', retryAfter: null, lastError: null, lastUsed: null }
  });

  const updateProviderStatus = (name, status, errorText = null, cooldownMs = 0) => {
    setProviderStatus(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        status,
        lastError: errorText,
        retryAfter: cooldownMs > 0 ? Date.now() + cooldownMs : null,
        lastUsed: status === 'healthy' ? new Date() : prev[name].lastUsed
      }
    }));
  };

  const isRateLimited = (name) => {
    const p = providerStatus[name];
    return p && p.status === 'rate_limited' && p.retryAfter && p.retryAfter > Date.now();
  };

  const isRateLimitError = (errorMsg) => {
    if (!errorMsg) return false;
    const msg = errorMsg.toLowerCase();
    return (
      msg.includes('429') ||
      msg.includes('quota') ||
      msg.includes('rate limit') ||
      msg.includes('too many requests') ||
      msg.includes('queue_exceeded') ||
      msg.includes('high traffic') ||
      msg.includes('busy')
    );
  };

  const resetCooldowns = () => {
    setProviderStatus(prev => {
      const reset = {};
      Object.keys(prev).forEach(name => {
        reset[name] = {
          ...prev[name],
          status: 'healthy',
          retryAfter: null,
          lastError: null
        };
      });
      return reset;
    });
  };

  // Cooldown countdown manager ticking every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      const updated = { ...providerStatus };
      
      Object.keys(updated).forEach(name => {
        const p = updated[name];
        if (p.status === 'rate_limited' && p.retryAfter && p.retryAfter <= now) {
          updated[name] = { ...p, status: 'healthy', retryAfter: null };
          changed = true;
        }
      });
      
      if (changed) {
        setProviderStatus(updated);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [providerStatus]);
  
  // Initialize state from LocalStorage on mount
  useEffect(() => {
    const localDeck = localStorage.getItem('chatgpt_anki_deck');
    if (localDeck) {
      try {
        const parsed = JSON.parse(localDeck);
        // Normalize all existing cards to lowercase and inject FSRS fields if missing
        const normalized = Array.isArray(parsed) ? parsed.filter(Boolean).map(item => {
          const reps = typeof item.reps === 'number' ? item.reps : (item.repetition || 0);
          const easeFactor = typeof item.easeFactor === 'number' ? item.easeFactor : 2.5;
          const stability = typeof item.stability === 'number' ? item.stability : (item.interval || 1.0);
          const difficulty = typeof item.difficulty === 'number' ? item.difficulty : Math.min(10, Math.max(1, 10 - (easeFactor - 1.3) * 7.5));
          const state = typeof item.state === 'number' ? item.state : (reps > 0 ? 2 : 0);
          return {
            ...item,
            word: typeof item.word === 'string' ? item.word.toLowerCase() : item.word,
            stability,
            difficulty,
            reps,
            lapses: typeof item.lapses === 'number' ? item.lapses : 0,
            state: state
          };
        }) : [];
        setVocab(normalized);
        localStorage.setItem('chatgpt_anki_deck', JSON.stringify(normalized));
      } catch (e) {
        console.error("Failed to parse local deck", e);
      }
    }
    
    const localStreak = localStorage.getItem('chatgpt_anki_streak');
    if (localStreak) {
      setStreak(parseInt(localStreak, 10) || 1);
    }
    
    setLoading(false);
  }, []);

  const saveDeckToLocal = (newVocab) => {
    localStorage.setItem('chatgpt_anki_deck', JSON.stringify(newVocab));
  };

  const updateStreak = async (days) => {
    setStreak(days);
    localStorage.setItem('chatgpt_anki_streak', days.toString());

    if (user) {
      try {
        await supabase
          .from('users')
          .update({ streak_days: days })
          .eq('id', user.id);
      } catch (e) {
        console.error("Failed to sync streak to Supabase", e);
      }
    }
  };

  // Add a new word card using generated rich details
  const addWordToDeck = async (word, richDetails) => {
    const normalizedWord = typeof word === 'string' ? word.trim().toLowerCase() : '';
    const existing = vocab.find(v => v.word.toLowerCase() === normalizedWord);
    if (existing) {
      return { success: false, error: 'Word already exists in your deck!' };
    }

    // Preserve initial image from translate screen if it exists
    let imgUrl = null;
    if (richDetails.savedSceneImages && richDetails.savedSceneImages[0]) {
      imgUrl = richDetails.savedSceneImages[0];
    } else {
      const firstImagePrompt = richDetails.imagePrompts && richDetails.imagePrompts[0] 
        ? richDetails.imagePrompts[0] 
        : normalizedWord;
      
      const imageRes = await fetchVocabImage(firstImagePrompt, 'photo');
      imgUrl = imageRes.url || null;
    }

    const newCard = {
      id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      word: normalizedWord,
      pos: richDetails.pos || 'n.',
      meaning: JSON.stringify(richDetails), // Keep string format for compatibility
      example: richDetails.scenes && richDetails.scenes[0] ? richDetails.scenes[0].dialogue : '',
      videoUrl: imgUrl,
      isImageSaved: !!richDetails.hasPinnedImage,
      cefrLevel: richDetails.cefrLevel || 'C1',
      srsLevel: 'Learning',
      repetition: 0,
      interval: 1,
      easeFactor: 2.5,
      nextReviewDate: new Date().toISOString(),
      // FSRS fields
      stability: 2.0,
      difficulty: 5.0,
      reps: 0,
      lapses: 0,
      state: 0
    };

    // Push to Supabase if logged in
    if (user) {
      try {
        let wordId = null;
        const { data: existingWord } = await supabase
          .from('global_dictionary')
          .select('id')
          .eq('word', normalizedWord)
          .maybeSingle();

        if (existingWord) {
          wordId = existingWord.id;
        } else {
          const { data: newWord, error: wordError } = await supabase
            .from('global_dictionary')
            .insert({
              word: normalizedWord,
              pos: richDetails.pos || 'n.',
              meaning: typeof richDetails === 'object' ? JSON.stringify(richDetails) : richDetails,
              rich_data: richDetails,
              cefr_level: richDetails.cefrLevel || 'Unranked'
            })
            .select('id')
            .single();
          if (!wordError && newWord) wordId = newWord.id;
        }

        if (wordId) {
          const { data: userDeckRecord, error: deckError } = await supabase
            .from('user_decks')
            .insert({
              user_id: user.id,
              word_id: wordId,
              srs_level: newCard.srsLevel,
              repetition: newCard.repetition,
              interval: newCard.interval,
              ease_factor: newCard.easeFactor,
              next_review_date: newCard.nextReviewDate,
              stability: newCard.stability,
              difficulty: newCard.difficulty,
              reps: newCard.reps,
              lapses: newCard.lapses,
              state: newCard.state
            })
            .select()
            .single();

          if (!deckError && userDeckRecord) {
            newCard.id = userDeckRecord.id; // Override with Supabase ID
          }
        }
      } catch (err) {
        console.error("Error saving word to Supabase:", err);
      }
    }

    const updated = [newCard, ...vocab];
    setVocab(updated);
    saveDeckToLocal(updated);
    return { success: true };
  };

  // Delete a word card from the local deck
  const deleteWordFromDeck = async (cardId) => {
    const updated = vocab.filter(item => item.id !== cardId);
    setVocab(updated);
    saveDeckToLocal(updated);

    if (user) {
      const isLocalId = typeof cardId === 'string' && cardId.startsWith('local-');
      if (!isLocalId) {
        const { error } = await supabase
          .from('user_decks')
          .delete()
          .eq('id', cardId);
        if (error) {
          console.error("Error deleting remote card:", error);
        }
      }
    }
    return { success: true };
  };

  // Update properties on a card (like category, pos, etc.)
  const updateWordProperties = (cardId, newProperties) => {
    setVocab(prevVocab => {
      const updated = prevVocab.map(item => {
        if (item.id === cardId) {
          return { ...item, ...newProperties };
        }
        return item;
      });
      localStorage.setItem('chatgpt_anki_deck', JSON.stringify(updated));
      return updated;
    });
  };

  // Add new words from selected curriculum to the user's local deck
  const addNewCurriculumWords = async (curriculumName, count = 10, onWordAdded) => {
    const { data: dbWords, error: dbError } = await supabase
      .from('curriculum_words')
      .select('word, pos, cefr_level')
      .eq('curriculum_name', curriculumName);
      
    if (dbError || !dbWords) {
      console.error("Failed to fetch curriculum words:", dbError);
      return { success: false, error: 'Failed to load curriculum from database.' };
    }

    const existingWords = new Set(vocab.map(w => w.word.toLowerCase().trim()));
    const unadded = dbWords.filter(w => !existingWords.has(w.word.toLowerCase().trim()));
    
    if (unadded.length === 0) {
      return { success: false, error: 'All words in this curriculum are already in your deck!' };
    }
    
    // Shuffle the unadded words to ensure variety and prevent alphabetic learning fatigue
    const shuffledUnadded = [...unadded];
    for (let i = shuffledUnadded.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledUnadded[i], shuffledUnadded[j]] = [shuffledUnadded[j], shuffledUnadded[i]];
    }
    
    const targetWords = shuffledUnadded.slice(0, count);
    const addedCardsList = [];
    
    for (const item of targetWords) {
      try {
        const details = await getAiWordRichDetails(item.word);
        if (details && !details.error) {
          let category = 'Daily Life';
          if (curriculumName.startsWith('TOEIC')) category = 'Business';
          else if (curriculumName.startsWith('IELTS')) category = 'Academic';

          let wordId = null;
          
          if (user) {
            const { data: existingWord } = await supabase
              .from('global_dictionary')
              .select('id')
              .eq('word', item.word.toLowerCase().trim())
              .maybeSingle();
              
            if (existingWord) {
              wordId = existingWord.id;
            } else {
              const { data: newWord, error: wordErr } = await supabase
                .from('global_dictionary')
                .insert({
                  word: item.word.toLowerCase().trim(),
                  pos: item.pos,
                  meaning: typeof details === 'object' ? JSON.stringify(details) : details,
                  rich_data: details,
                  cefr_level: item.cefr_level || 'B2'
                })
                .select('id')
                .single();
                
              if (!wordErr && newWord) {
                wordId = newWord.id;
              }
            }
          }

          const newCard = {
            id: user ? null : Date.now() + Math.random().toString(36).substr(2, 9),
            word: item.word.toLowerCase().trim(),
            meaning: typeof details === 'object' ? JSON.stringify(details) : details,
            pos: item.pos,
            cefrLevel: item.cefr_level || 'B2',
            category: category,
            curriculum: curriculumName,
            videoUrl: details?.savedSceneImages?.[0] || '',
            srsLevel: 'Learning',
            nextReviewDate: new Date(Date.now() - 60000).toISOString(),
            stability: 1.0,
            difficulty: 5.0,
            reps: 0,
            lapses: 0,
            state: 0
          };

          if (user && wordId) {
            const { data: ud, error: udErr } = await supabase
              .from('user_decks')
              .insert({
                user_id: user.id,
                word_id: wordId,
                srs_level: 'Learning',
                stability: 1.0,
                difficulty: 5.0,
                reps: 0,
                lapses: 0,
                state: 0,
                next_review_date: newCard.nextReviewDate
              })
              .select('id')
              .single();
              
            if (!udErr && ud) {
              newCard.id = ud.id;
            }
          }
          
          setVocab(prev => {
            const updated = [newCard, ...prev];
            localStorage.setItem('chatgpt_anki_deck', JSON.stringify(updated));
            return updated;
          });
          
          addedCardsList.push(newCard);
          if (typeof onWordAdded === 'function') {
            onWordAdded(addedCardsList.length);
          }
        }
      } catch (e) {
        console.error(`Failed to automatically import "${item.word}":`, e);
      }
    }
    
    if (addedCardsList.length > 0) {
      return { success: true, count: addedCardsList.length, addedWords: addedCardsList };
    }
    
    return { success: false, error: 'Could not fetch details for any new words at this time.' };
  };

  // Update a card's image in the database dynamically
  const updateCardImages = (word, mainImageUrl, sceneImagesArray, falImageUrl = null) => {
    setVocab(prevVocab => {
      const updated = prevVocab.map(item => {
        if (item.word.toLowerCase() === word.toLowerCase()) {
          let parsedMeaning = null;
          try {
            if (item.meaning && item.meaning.startsWith('{')) {
              parsedMeaning = JSON.parse(item.meaning);
            }
          } catch (e) {}

          if (parsedMeaning) {
            if (sceneImagesArray !== null && sceneImagesArray !== undefined) {
              parsedMeaning.savedSceneImages = sceneImagesArray;
            }
            if (falImageUrl) {
              parsedMeaning.savedFalImageUrl = falImageUrl;
            }
          }

          return {
            ...item,
            videoUrl: mainImageUrl,
            meaning: parsedMeaning ? JSON.stringify(parsedMeaning) : item.meaning
          };
        }
        return item;
      });
      localStorage.setItem('chatgpt_anki_deck', JSON.stringify(updated));
      return updated;
    });
    console.log(`💾 Card images updated in database for "${word}":`, mainImageUrl, sceneImagesArray, falImageUrl);
  };

  // Helper to project intervals for a card given different review choices based on FSRS stability formulas
  const getProjectedIntervals = (card) => {
    if (!card) return { again: '10m', hard: '1d', normal: '3d', easy: '6d' };
    
    let stability = typeof card.stability === 'number' ? card.stability : (card.interval || 1.0);
    let reps = typeof card.reps === 'number' ? card.reps : (card.repetition || 0);
    let easeFactor = typeof card.easeFactor === 'number' ? card.easeFactor : 2.5;
    let difficulty = typeof card.difficulty === 'number' ? card.difficulty : Math.min(10, Math.max(1, 10 - (easeFactor - 1.3) * 7.5));

    const getIntervalStr = (s) => {
      const days = Math.max(1, Math.round(s));
      if (days < 30) return `${days}d`;
      const months = Math.round(days / 30);
      return `${months}mo`;
    };

    if (reps === 0) {
      return {
        again: '10m',
        hard: '1d',
        normal: '2d',
        easy: '6d'
      };
    }

    // Again (r=1)
    const sAgain = Math.max(0.1, 0.3 * stability * Math.exp(-0.1 * difficulty));
    // Hard (r=2)
    const sHard = stability * (1 + 1.6 * (11 - difficulty) * Math.pow(stability, -0.2) * 0.8);
    // Good (r=3)
    const sGood = stability * (1 + 1.6 * (11 - difficulty) * Math.pow(stability, -0.2) * 1.5);
    // Easy (r=4)
    const sEasy = stability * (1 + 1.6 * (11 - difficulty) * Math.pow(stability, -0.2) * 2.5);

    return {
      again: '10m',
      hard: getIntervalStr(sHard),
      normal: getIntervalStr(sGood),
      easy: getIntervalStr(sEasy)
    };
  };

  // Update SRS levels using standard FSRS algorithm locally with cognitive delay tracking
  const updateWordSrs = (cardId, actionOrLevel, responseTimeMs) => {
    const itemToUpdate = vocab.find(item => item.id === cardId);
    if (!itemToUpdate) return;

    let stability = typeof itemToUpdate.stability === 'number' ? itemToUpdate.stability : (itemToUpdate.interval || 1.0);
    let reps = typeof itemToUpdate.reps === 'number' ? itemToUpdate.reps : (itemToUpdate.repetition || 0);
    let lapses = typeof itemToUpdate.lapses === 'number' ? itemToUpdate.lapses : 0;
    let easeFactor = typeof itemToUpdate.easeFactor === 'number' ? itemToUpdate.easeFactor : 2.5;
    let difficulty = typeof itemToUpdate.difficulty === 'number' ? itemToUpdate.difficulty : Math.min(10, Math.max(1, 10 - (easeFactor - 1.3) * 7.5));
    let state = typeof itemToUpdate.state === 'number' ? itemToUpdate.state : (reps > 0 ? 2 : 0);

    const ratingMap = {
      'again': 1,
      'hard': 2,
      'normal': 3,
      'easy': 4
    };
    const r = ratingMap[actionOrLevel] || 3;

    // Calculate Cognitive Hesitation Penalty (beta)
    let beta = 1.0;
    if (typeof responseTimeMs === 'number') {
      const rtBase = 1500;
      const rtThreshold = 4000;
      if (responseTimeMs > rtThreshold) {
        beta = Math.max(0.5, 1 - (responseTimeMs - rtBase) / 8000);
      }
    }



    if (reps === 0) {
      // First review initial stability/difficulty presets
      if (r === 1) {
        stability = 0.4;
        difficulty = 5.0;
        state = 1; // Learning
      } else if (r === 2) {
        stability = 0.6;
        difficulty = 4.8;
        state = 2; // Review
      } else if (r === 3) {
        stability = 2.4;
        difficulty = 4.3;
        state = 2; // Review
      } else {
        stability = 5.8;
        difficulty = 3.5;
        state = 2; // Review
      }
      reps = 1;
    } else {
      // Sequential reviews updates
      reps += 1;
      
      // Update Difficulty
      difficulty = difficulty - 0.4 * (r - 3);
      difficulty = Math.min(10, Math.max(1, difficulty));

      if (r === 1) {
        // Forgotten
        stability = Math.max(0.1, 0.3 * stability * Math.exp(-0.1 * difficulty));
        lapses += 1;
        state = 3; // Relearning
      } else {
        // Recalled
        const scaleFactor = r === 2 ? 0.8 : (r === 3 ? 1.5 : 2.5);
        const originalIncrease = 1.6 * (11 - difficulty) * Math.pow(stability, -0.2) * scaleFactor;
        stability = stability * (1 + originalIncrease * beta);
        state = 2; // Review
      }
    }

    const nextInterval = Math.max(1, Math.round(stability));
    const nextReviewDate = new Date();

    let newSrsLevel = 'Normal';
    if (nextInterval >= 21) {
      newSrsLevel = 'Mastered';
    } else if (r === 1) {
      newSrsLevel = 'Learning';
    } else if (r === 2) {
      newSrsLevel = 'Hard';
    } else if (r === 3) {
      newSrsLevel = 'Normal';
    } else {
      newSrsLevel = 'Easy';
    }
    
    if (r === 1) {
      // Again goes back in the queue, scheduled to reappear in 10 minutes
      nextReviewDate.setMinutes(nextReviewDate.getMinutes() + 10);
    } else {
      nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
    }

    // Keep legacy fields populated for backwards UI compatibility
    const newRepetition = reps;
    const newInterval = nextInterval;
    const newEaseFactor = 1.3 + (10 - difficulty) * (1.2 / 7.5);

    // Save cognitive hesitation reviews log
    const newLog = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      word: itemToUpdate.word,
      rating: actionOrLevel,
      response_time_ms: typeof responseTimeMs === 'number' ? responseTimeMs : 1500,
      stability_before: itemToUpdate.stability || 0.1,
      stability_after: stability,
      review_date: new Date().toISOString()
    };
    const updatedLogs = [...reviewLogs, newLog];
    setReviewLogs(updatedLogs);
    saveLogsToLocal(updatedLogs);

    const updated = vocab.map(item => item.id === cardId ? {
      ...item,
      srsLevel: newSrsLevel,
      repetition: newRepetition,
      interval: newInterval,
      easeFactor: newEaseFactor,
      nextReviewDate: nextReviewDate.toISOString(),
      stability,
      difficulty,
      reps,
      lapses,
      state
    } : item);

    setVocab(updated);
    saveDeckToLocal(updated);

    // Push to Supabase if logged in
    if (user) {
      const isLocalId = typeof cardId === 'string' && cardId.startsWith('local-');
      if (!isLocalId) {
        supabase
          .from('user_decks')
          .update({
            srs_level: newSrsLevel,
            repetition: newRepetition,
            interval: newInterval,
            ease_factor: newEaseFactor,
            next_review_date: nextReviewDate.toISOString(),
            stability,
            difficulty,
            reps,
            lapses,
            state
          })
          .eq('id', cardId)
          .then(({ error }) => {
            if (error) console.error("Error updating remote deck:", error);
          });
      }

      // Log review log to Supabase review table
      supabase
        .from('user_review_logs')
        .insert({
          user_id: user.id,
          word: itemToUpdate.word,
          rating: actionOrLevel,
          response_time_ms: typeof responseTimeMs === 'number' ? responseTimeMs : 1500,
          stability_before: itemToUpdate.stability || 0.1,
          stability_after: stability,
          review_date: new Date().toISOString()
        })
        .then(({ error }) => {
          if (!error) {
            // Remove from local reviewLogs queue since it was successfully saved
            setReviewLogs(prev => prev.filter(log => log.word !== itemToUpdate.word || log.review_date !== newLog.review_date));
          }
        });
    }
  };

  const getSrsCounts = (deck = vocab) => {
    return {
      superEasy: deck.filter(w => w.srsLevel === 'Super Easy').length,
      easy: deck.filter(w => w.srsLevel === 'Easy').length,
      normal: deck.filter(w => w.srsLevel === 'Normal').length,
      hard: deck.filter(w => w.srsLevel === 'Hard').length,
      mastered: deck.filter(w => w.srsLevel === 'Mastered').length,
      total: deck.length
    };
  };

  // Helper to run promises with a timeout
  const withTimeout = (promise, ms, name) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${name} request timed out after ${ms}ms`)), ms))
    ]);
  };

  // Helper to query Gemini API via Supabase Edge Function
  const queryGemini = async (word, forceValid = false) => {
    console.log(`🔮 Invoking Supabase Edge Function for "${word}"...`);
    const { data, error } = await supabase.functions.invoke('get-word-details', {
      body: { word, forceValid }
    });

    if (error) throw new Error(`Edge Function error: ${error.message}`);
    if (!data) throw new Error(`Edge Function returned empty response`);
    
    return data;
  };

  // Retrieve rich card details using Edge Function with 3-tier server-side fallback
  const getAiWordRichDetails = async (word, forceValid = false) => {
    const normalizedWord = word.toLowerCase().trim();
    
    // 1. Check if word exists in global_dictionary cache (if not forcing validation)
    if (!forceValid) {
      try {
        const { data: existingWord, error: fetchErr } = await supabase
          .from('global_dictionary')
          .select('rich_data')
          .eq('word', normalizedWord)
          .maybeSingle();

        if (!fetchErr && existingWord && existingWord.rich_data) {
          console.log(`✅ Rich card data loaded from DB cache for "${word}"`);
          const parsed = typeof existingWord.rich_data === 'string'
            ? JSON.parse(existingWord.rich_data)
            : existingWord.rich_data;
          
          // Ensure it has a _provider metadata tag
          if (parsed && !parsed._provider) {
            parsed._provider = 'DB Cache';
          }
          return parsed;
        }
      } catch (cacheErr) {
        console.warn('⚠️ global_dictionary cache lookup failed, falling back to AI:', cacheErr);
      }
    }

    let details = null;
    try {
      console.log(`🔮 Requesting word translation via Edge Function: "${word}" (forceValid: ${forceValid})...`);
      details = await queryGemini(word, forceValid);
      if (!details || details.error) {
        throw new Error(details?.error || "Empty response from server");
      }
    } catch (err) {
      console.error('❌ Server-side translation failed:', err.message);
      return { error: err.message };
    }

    try {
      const sanitized = sanitizeThaiInObject(details);
      const usedProvider = sanitized._provider || 'API Backend';
      
      // Override isInvalid to false if forceValid is true
      if (forceValid) {
        if (!sanitized.validation) {
          sanitized.validation = {};
        }
        sanitized.validation.isInvalid = false;
        sanitized.validation.suggestion = null;
      }
      
      // Programmatic Safeguard:
      // If the suggestion is exactly the same as the queried word, it is NOT invalid!
      if (sanitized.validation && sanitized.validation.isInvalid && sanitized.validation.suggestion) {
        const cleanSugg = sanitized.validation.suggestion.toLowerCase().trim();
        const cleanWord = word.toLowerCase().trim();
        if (cleanSugg === cleanWord && !forceValid) {
          console.log(`⚠️ AI false-positive typo detected for "${word}". Retrying with forceValid = true...`);
          return await getAiWordRichDetails(word, true);
        }
      }
      
      console.log(`✅ Rich card data generated for "${word}" using ${usedProvider}:`, sanitized);
      return sanitized;
    } catch (jsonErr) {
      console.error("❌ Failed to process AI response:", details, jsonErr);
      return { error: `Failed to process AI response: ${jsonErr.message}` };
    }
  };

  // Stub functions for components needing signature matching
  const pullNewWords = async () => ({ count: 0 });
  const generateMemeAndUpload = async () => null;
  const approveWordDoodle = async () => true;

  const clearDeckAndResetStats = async () => {
    setVocab([]);
    setStreak(1);
    localStorage.removeItem('chatgpt_anki_deck');
    localStorage.removeItem('chatgpt_anki_streak');

    if (user) {
      try {
        await supabase.from('user_decks').delete().eq('user_id', user.id);
        await supabase.from('user_review_logs').delete().eq('user_id', user.id);
        await supabase.from('users').update({ streak_days: 1 }).eq('id', user.id);
      } catch (e) {
        console.error("Failed to clear remote database:", e);
      }
    }
  };

  return (
    <VocabContext.Provider value={{
      vocab,
      setVocab,
      streak,
      updateStreak,
      updateWordSrs, 
      reviewLogs,
      setReviewLogs,
      getProjectedIntervals,
      getSrsCounts, 
      addWordToDeck,
      deleteWordFromDeck,
      updateCardImages,
      updateWordProperties,
      addNewCurriculumWords,
      getAiWordRichDetails,
      providerStatus,
      resetCooldowns,
      pullNewWords,
      generateMemeAndUpload,
      approveWordDoodle,
      activeCurriculum,
      setActiveCurriculum,
      curriculumWords,
      curriculumList,
      loadingCurriculumWords,
      clearDeckAndResetStats,
      loading 
    }}>
      {children}
    </VocabContext.Provider>
  );
};
