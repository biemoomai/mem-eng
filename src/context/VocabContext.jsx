import React, { createContext, useState, useContext, useEffect } from 'react';
import { getVocabImageUrl, fetchVocabImage } from '../utils/imageHelper';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { createEmptyCard, fsrs, Rating, State } from 'ts-fsrs';

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


const fsrsScheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: false,
  enable_short_term: true,
  learning_steps: ['10m'],
  relearning_steps: ['10m'],
});

const reviewRatingMap = {
  again: Rating.Again,
  hard: Rating.Hard,
  normal: Rating.Good,
  easy: Rating.Easy,
};

const toValidDate = (value, fallback = new Date()) => {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const toFsrsCard = (card, now = new Date()) => {
  if (!card || (card.reps || card.repetition || 0) === 0) {
    return createEmptyCard(now);
  }

  const lastReviewValue = card.lastReviewDate || card.last_review || card.lastReview || null;
  const fsrsCard = {
    due: toValidDate(card.nextReviewDate, now),
    stability: typeof card.stability === 'number' ? card.stability : 0,
    difficulty: typeof card.difficulty === 'number' ? card.difficulty : 0,
    elapsed_days: typeof card.elapsed_days === 'number' ? card.elapsed_days : 0,
    scheduled_days: typeof card.scheduled_days === 'number' ? card.scheduled_days : (card.interval || 0),
    learning_steps: typeof card.learning_steps === 'number' ? card.learning_steps : 0,
    reps: typeof card.reps === 'number' ? card.reps : (card.repetition || 0),
    lapses: typeof card.lapses === 'number' ? card.lapses : 0,
    state: typeof card.state === 'number' ? card.state : State.Review,
  };

  if (lastReviewValue) {
    const lastReview = new Date(lastReviewValue);
    if (!Number.isNaN(lastReview.getTime())) {
      fsrsCard.last_review = lastReview;
    }
  }

  return fsrsCard;
};

const getDaysUntil = (date, now = new Date()) => {
  return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
};

const formatReviewInterval = (date, now = new Date()) => {
  const minutes = Math.max(0, Math.round((date.getTime() - now.getTime()) / (1000 * 60)));
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.max(1, Math.round(minutes / (60 * 24)));
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  return `${months}mo`;
};

const getLevelFromFsrs = (fsrsCard, rating) => {
  if (fsrsCard.state === State.Learning || fsrsCard.state === State.Relearning) return 'Learning';
  if (rating === Rating.Hard) return 'Hard';
  if (rating === Rating.Easy) return 'Easy';
  return 'Normal';
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

          const customMeaning = ud.custom_meaning || null;
          const effectiveMeaning = customMeaning || parsedRichData || parsedMeaning;

          return {
            id: ud.id,
            word: ud.custom_word || ud.global_dictionary.word,
            originalWord: ud.global_dictionary.word,
            pos: ud.global_dictionary.pos,
            meaning: effectiveMeaning,
            richCardData: effectiveMeaning,
            customMeaning,
            customVideoUrl: ud.custom_video_url,
            videoUrl: ud.custom_video_url || effectiveMeaning?.savedSceneImages?.[0] || parsedRichData?.savedSceneImages?.[0] || parsedMeaning?.savedSceneImages?.[0] || '',
            curriculum: parsedRichData?.curriculum || parsedMeaning?.curriculum || 'Self-Study only',
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
        const normalized = Array.isArray(parsed) ? parsed.filter(item => item && item.word).map(item => {
          const reps = typeof item.reps === 'number' ? item.reps : (item.repetition || 0);
          const easeFactor = typeof item.easeFactor === 'number' ? item.easeFactor : 2.5;
          const stability = typeof item.stability === 'number' ? item.stability : (item.interval || 1.0);
          const difficulty = typeof item.difficulty === 'number' ? item.difficulty : Math.min(10, Math.max(1, 10 - (easeFactor - 1.3) * 7.5));
          const state = typeof item.state === 'number' ? item.state : (reps > 0 ? 2 : 0);
          return {
            ...item,
            word: typeof item.word === 'string' ? item.word.toLowerCase() : String(item.word || '').toLowerCase(),
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
    const existing = vocab.find(v => v && v.word && v.word.toLowerCase() === normalizedWord);
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
      if (imgUrl) {
        if (!richDetails.savedSceneImages) richDetails.savedSceneImages = [];
        richDetails.savedSceneImages[0] = imgUrl;
      }
    }

    const newCard = {
      id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      word: normalizedWord,
      pos: richDetails.pos || 'n.',
      meaning: JSON.stringify(richDetails), // Keep string format for compatibility
      example: richDetails.scenes && richDetails.scenes[0] ? richDetails.scenes[0].dialogue : '',
      videoUrl: imgUrl,
      isImageSaved: !!richDetails.hasPinnedImage,
      curriculum: richDetails.curriculum || 'Self-Study only',
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
          .select('id, rich_data')
          .eq('word', normalizedWord)
          .maybeSingle();

        if (existingWord) {
          wordId = existingWord.id;
          // If the cached global_dictionary record doesn't have an image, update it
          const cachedRichData = existingWord.rich_data ? (typeof existingWord.rich_data === 'string' ? JSON.parse(existingWord.rich_data) : existingWord.rich_data) : null;
          if (cachedRichData && (!cachedRichData.savedSceneImages || !cachedRichData.savedSceneImages[0]) && imgUrl) {
            if (!cachedRichData.savedSceneImages) cachedRichData.savedSceneImages = [];
            cachedRichData.savedSceneImages[0] = imgUrl;
            await supabase
              .from('global_dictionary')
              .update({
                meaning: JSON.stringify(cachedRichData),
                rich_data: cachedRichData
              })
              .eq('id', wordId);
          }
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

  // Update custom word override (custom word, custom meaning, custom image)
  const updateUserCardOverride = async (cardId, overrides) => {
    // 1. Update local state
    setVocab(prevVocab => {
      const updated = prevVocab.map(item => {
        if (item.id === cardId) {
          const updatedItem = { ...item };
          if (overrides.customWord !== undefined) {
            updatedItem.word = overrides.customWord;
            updatedItem.customWord = overrides.customWord;
          }
          if (overrides.customMeaning !== undefined) {
            updatedItem.customMeaning = overrides.customMeaning;
            updatedItem.meaning = overrides.customMeaning;
            updatedItem.richCardData = overrides.customMeaning;
          }
          if (overrides.customVideoUrl !== undefined) {
            updatedItem.videoUrl = overrides.customVideoUrl;
            updatedItem.customVideoUrl = overrides.customVideoUrl;
          }
          return updatedItem;
        }
        return item;
      });
      localStorage.setItem('chatgpt_anki_deck', JSON.stringify(updated));
      return updated;
    });

    // 2. Update remote Supabase if user is logged in
    if (user) {
      const isLocalId = typeof cardId === 'string' && cardId.startsWith('local-');
      if (!isLocalId) {
        const payload = {};
        if (overrides.customWord !== undefined) payload.custom_word = overrides.customWord;
        if (overrides.customMeaning !== undefined) payload.custom_meaning = overrides.customMeaning;
        if (overrides.customVideoUrl !== undefined) payload.custom_video_url = overrides.customVideoUrl;

        const { error } = await supabase
          .from('user_decks')
          .update(payload)
          .eq('id', cardId);

        if (error) {
          console.error("Error updating user card override:", error);
        }
      }
    }
  };

  // Upload an image file to Supabase storage bucket user-card-images
  const uploadUserCardImage = async (file, cardId) => {
    if (!user || !file) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${cardId}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('user-card-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error("Supabase storage upload error:", error);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from('user-card-images')
        .getPublicUrl(fileName);

      return publicUrlData?.publicUrl || null;
    } catch (err) {
      console.error("Error in uploadUserCardImage:", err);
      return null;
    }
  };

  // Add new words from selected curriculum to the user's local deck
  const addNewCurriculumWords = async (curriculumName, count = 5, onWordAdded) => {
    // Fallback Self-Study to Oxford 5000 so the checkmark always works in every mode
    const targetCurriculum = (!curriculumName || curriculumName === 'Self-Study only') ? 'Oxford 5000' : curriculumName;
    const { data: dbWords, error: dbError } = await supabase
      .from('curriculum_words')
      .select('word, pos, cefr_level')
      .eq('curriculum_name', targetCurriculum);
      
    if (dbError || !dbWords) {
      console.error("Failed to fetch curriculum words:", dbError);
      return { success: false, error: 'Failed to load curriculum from database.' };
    }

    const existingWords = new Set(vocab.map(w => w.word.toLowerCase().trim()));
    const unadded = dbWords.filter(w => !existingWords.has(w.word.toLowerCase().trim()));
    
    if (unadded.length === 0) {
      return { success: false, error: 'All words in this curriculum are already in your deck!' };
    }
    
    // Prioritization check: find which unadded words are pre-cached in global_dictionary with images
    const cachedWithImages = new Set();
    try {
      const unaddedWordNames = unadded.map(w => w.word.toLowerCase().trim());
      const { data: cachedList } = await supabase
        .from('global_dictionary')
        .select('word, rich_data')
        .in('word', unaddedWordNames);

      if (cachedList) {
        for (const row of cachedList) {
          const rich = row.rich_data ? (typeof row.rich_data === 'string' ? JSON.parse(row.rich_data) : row.rich_data) : null;
          if (rich && rich.savedSceneImages && rich.savedSceneImages[0]) {
            cachedWithImages.add(row.word.toLowerCase().trim());
          }
        }
      }
    } catch (e) {
      console.warn("Could not check global_dictionary cache:", e);
    }

    // Split unadded words into pre-cached (fully loaded) and uncached
    const cachedGroup = unadded.filter(w => cachedWithImages.has(w.word.toLowerCase().trim()));
    const uncachedGroup = unadded.filter(w => !cachedWithImages.has(w.word.toLowerCase().trim()));

    // Shuffle both groups independently to prevent fatigue
    const shuffledCached = [...cachedGroup];
    for (let i = shuffledCached.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCached[i], shuffledCached[j]] = [shuffledCached[j], shuffledCached[i]];
    }

    const shuffledUncached = [...uncachedGroup];
    for (let i = shuffledUncached.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledUncached[i], shuffledUncached[j]] = [shuffledUncached[j], shuffledUncached[i]];
    }

    // Prioritize Cached Group first, then Uncached Group
    const targetWords = [...shuffledCached, ...shuffledUncached].slice(0, count);
    const addedCardsList = [];
    
    for (const item of targetWords) {
      try {
        const details = await getAiWordRichDetails(item.word);
        if (details && !details.error) {
          // Fetch auto-image if not present
          let imgUrl = details?.savedSceneImages?.[0] || '';
          if (!imgUrl) {
            const firstImagePrompt = details?.imagePrompts && details.imagePrompts[0]
              ? details.imagePrompts[0]
              : item.word;
            try {
              const imageRes = await fetchVocabImage(firstImagePrompt, 'photo');
              imgUrl = imageRes.url || '';
              if (imgUrl) {
                if (!details.savedSceneImages) details.savedSceneImages = [];
                details.savedSceneImages[0] = imgUrl;
              }
            } catch (err) {
              console.error("Failed to fetch auto-image for curriculum word:", item.word, err);
            }
          }

          let category = 'Daily Life';
          if (curriculumName.startsWith('TOEIC')) category = 'Business';
          else if (curriculumName.startsWith('IELTS')) category = 'Academic';

          let wordId = null;
          
          if (user) {
            const { data: existingWord } = await supabase
              .from('global_dictionary')
              .select('id, rich_data')
              .eq('word', item.word.toLowerCase().trim())
              .maybeSingle();
              
            if (existingWord) {
              wordId = existingWord.id;
              // If the cached global_dictionary record doesn't have an image, update it
              const cachedRichData = existingWord.rich_data ? (typeof existingWord.rich_data === 'string' ? JSON.parse(existingWord.rich_data) : existingWord.rich_data) : null;
              if (cachedRichData && (!cachedRichData.savedSceneImages || !cachedRichData.savedSceneImages[0]) && imgUrl) {
                if (!cachedRichData.savedSceneImages) cachedRichData.savedSceneImages = [];
                cachedRichData.savedSceneImages[0] = imgUrl;
                await supabase
                  .from('global_dictionary')
                  .update({
                    meaning: JSON.stringify(cachedRichData),
                    rich_data: cachedRichData
                  })
                  .eq('id', wordId);
              }
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
            videoUrl: imgUrl,
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
    if (!word) return;
    setVocab(prevVocab => {
      const updated = prevVocab.map(item => {
        if (item && item.word && item.word.toLowerCase() === word.toLowerCase()) {
          let parsedMeaning = null;
          try {
            if (item.meaning) {
              if (typeof item.meaning === 'object') {
                parsedMeaning = item.meaning;
              } else if (typeof item.meaning === 'string' && item.meaning.startsWith('{')) {
                parsedMeaning = JSON.parse(item.meaning);
              }
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

  // Preview intervals with the official FSRS scheduler.
  const getProjectedIntervals = (card) => {
    if (!card) return { again: '10m', hard: '1d', normal: '2d', easy: '6d' };
    const now = new Date();
    const fsrsCard = toFsrsCard(card, now);
    const preview = fsrsScheduler.repeat(fsrsCard, now);

    return {
      again: formatReviewInterval(preview[Rating.Again].card.due, now),
      hard: formatReviewInterval(preview[Rating.Hard].card.due, now),
      normal: formatReviewInterval(preview[Rating.Good].card.due, now),
      easy: formatReviewInterval(preview[Rating.Easy].card.due, now),
    };
  };

  // Update SRS with official FSRS. Master is a product-level escape hatch, not an FSRS rating.
  const updateWordSrs = (cardId, actionOrLevel, responseTimeMs) => {
    const itemToUpdate = vocab.find(item => item.id === cardId);
    if (!itemToUpdate) return;

    const now = new Date();
    const isMaster = actionOrLevel === 'master';
    let nextReviewDate = new Date(now);
    let stability = typeof itemToUpdate.stability === 'number' ? itemToUpdate.stability : 0;
    let difficulty = typeof itemToUpdate.difficulty === 'number' ? itemToUpdate.difficulty : 0;
    let reps = typeof itemToUpdate.reps === 'number' ? itemToUpdate.reps : (itemToUpdate.repetition || 0);
    let lapses = typeof itemToUpdate.lapses === 'number' ? itemToUpdate.lapses : 0;
    let state = typeof itemToUpdate.state === 'number' ? itemToUpdate.state : (reps > 0 ? State.Review : State.New);
    let scheduledDays = typeof itemToUpdate.scheduled_days === 'number' ? itemToUpdate.scheduled_days : (itemToUpdate.interval || 0);
    let elapsedDays = typeof itemToUpdate.elapsed_days === 'number' ? itemToUpdate.elapsed_days : 0;
    let learningSteps = typeof itemToUpdate.learning_steps === 'number' ? itemToUpdate.learning_steps : 0;
    let newSrsLevel = itemToUpdate.srsLevel || 'Learning';
    let newInterval = Math.max(0, scheduledDays);

    if (isMaster) {
      newSrsLevel = 'Mastered';
      state = State.Review;
      reps += 1;
      scheduledDays = 36500;
      newInterval = scheduledDays;
      nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 100);
    } else {
      const rating = reviewRatingMap[actionOrLevel] || Rating.Good;
      const fsrsCard = toFsrsCard(itemToUpdate, now);
      const result = fsrsScheduler.next(fsrsCard, now, rating);
      const nextCard = result.card;

      stability = nextCard.stability;
      difficulty = nextCard.difficulty;
      reps = nextCard.reps;
      lapses = nextCard.lapses;
      state = nextCard.state;
      scheduledDays = nextCard.scheduled_days;
      elapsedDays = nextCard.elapsed_days;
      learningSteps = nextCard.learning_steps;
      nextReviewDate = nextCard.due;
      newInterval = Math.max(0, getDaysUntil(nextReviewDate, now));
      newSrsLevel = getLevelFromFsrs(nextCard, rating);
    }

    const newRepetition = reps;
    const newEaseFactor = Math.max(1.3, Math.min(2.5, 1.3 + (10 - difficulty) * (1.2 / 10)));

    const newLog = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      word: itemToUpdate.word,
      rating: actionOrLevel,
      response_time_ms: typeof responseTimeMs === 'number' ? responseTimeMs : 1500,
      stability_before: itemToUpdate.stability || 0,
      stability_after: stability,
      review_date: now.toISOString()
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
      lastReviewDate: now.toISOString(),
      stability,
      difficulty,
      reps,
      lapses,
      state,
      scheduled_days: scheduledDays,
      elapsed_days: elapsedDays,
      learning_steps: learningSteps
    } : item);

    setVocab(updated);
    saveDeckToLocal(updated);

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
            if (error) console.error('Error updating remote deck:', error);
          });
      }

      supabase
        .from('user_review_logs')
        .insert({
          user_id: user.id,
          word: itemToUpdate.word,
          rating: actionOrLevel,
          response_time_ms: typeof responseTimeMs === 'number' ? responseTimeMs : 1500,
          stability_before: itemToUpdate.stability || 0,
          stability_after: stability,
          review_date: now.toISOString()
        })
        .then(({ error }) => {
          if (!error) {
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
      updateUserCardOverride,
      uploadUserCardImage,
      addNewCurriculumWords,
      getAiWordRichDetails,
      providerStatus,
      resetCooldowns,
      pullNewWords,

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

