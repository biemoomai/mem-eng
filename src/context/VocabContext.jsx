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

const getRestoredSrsLevel = (card) => {
  if (card?.archivedSrsLevel && card.archivedSrsLevel !== 'Mastered') {
    return card.archivedSrsLevel;
  }

  const state = typeof card?.state === 'number' ? card.state : State.New;
  return state === State.Review ? 'Normal' : 'Learning';
};

const normalizeStoredDeck = (deck) => {
  if (!Array.isArray(deck)) return [];

  return deck.filter(item => item && item.word).map(item => {
    const reps = typeof item.reps === 'number' ? item.reps : (item.repetition || 0);
    const easeFactor = typeof item.easeFactor === 'number' ? item.easeFactor : 2.5;
    const stability = typeof item.stability === 'number' ? item.stability : (item.interval || 1.0);
    const difficulty = typeof item.difficulty === 'number'
      ? item.difficulty
      : Math.min(10, Math.max(1, 10 - (easeFactor - 1.3) * 7.5));
    const state = typeof item.state === 'number' ? item.state : (reps > 0 ? State.Review : State.New);
    const normalized = {
      ...item,
      word: typeof item.word === 'string' ? item.word.toLowerCase() : String(item.word || '').toLowerCase(),
      stability,
      difficulty,
      reps,
      lapses: typeof item.lapses === 'number' ? item.lapses : 0,
      state,
      scheduled_days: typeof item.scheduled_days === 'number' ? item.scheduled_days : (item.interval || 0),
      elapsed_days: typeof item.elapsed_days === 'number' ? item.elapsed_days : 0,
      learning_steps: typeof item.learning_steps === 'number' ? item.learning_steps : 0,
      lastReviewDate: item.lastReviewDate || null,
      masteredAt: item.masteredAt || null,
    };

    if (normalized.srsLevel === 'Mastered' && !normalized.archivedSrsLevel) {
      normalized.archivedSrsLevel = getRestoredSrsLevel(normalized);
    }
    return normalized;
  });
};

const loadLocalDeck = () => {
  try {
    const saved = localStorage.getItem('chatgpt_anki_deck');
    return saved ? normalizeStoredDeck(JSON.parse(saved)) : [];
  } catch (error) {
    console.error('Failed to parse local deck', error);
    return [];
  }
};

const loadLocalReviewLogs = () => {
  try {
    const saved = localStorage.getItem('vocab_review_logs');
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const createLocalCardId = () => {
  if (globalThis.crypto?.randomUUID) return `local-${globalThis.crypto.randomUUID()}`;
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(4);
    globalThis.crypto.getRandomValues(values);
    return `local-${Array.from(values, value => value.toString(16).padStart(8, '0')).join('')}`;
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const isRemoteDeckId = (cardId) => {
  return typeof cardId === 'string'
    && !cardId.startsWith('local-')
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cardId);
};

const ACTIVITY_TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const touchUserActivity = (userId) => {
  if (!userId) return;

  const storageKey = `memeng_last_activity_touch_${userId}`;
  const now = Date.now();
  try {
    const lastTouch = Number(localStorage.getItem(storageKey) || 0);
    if (lastTouch > 0 && now >= lastTouch && now - lastTouch < ACTIVITY_TOUCH_INTERVAL_MS) return;
    localStorage.setItem(storageKey, String(now));
  } catch (error) {
    console.warn('Could not persist the activity heartbeat guard:', error);
  }

  void supabase.rpc('touch_user_activity')
    .then(({ error }) => {
      if (error) console.warn('Could not update user activity:', error);
    })
    .catch(error => {
      console.warn('Could not update user activity:', error);
    });
};

const VocabContext = createContext();

export const useVocab = () => useContext(VocabContext);

export const VocabProvider = ({ children }) => {
  const [vocab, setVocab] = useState(loadLocalDeck);
  const [streak, setStreak] = useState(() => {
    try {
      return parseInt(localStorage.getItem('chatgpt_anki_streak') || '1', 10) || 1;
    } catch (error) {
      return 1;
    }
  });
  const [loading, setLoading] = useState(true);
  const [reviewLogs, setReviewLogs] = useState(loadLocalReviewLogs);

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
    // Sync only when the authenticated identity changes; syncData is intentionally not memoized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const syncData = async (userId) => {
    try {
      setLoading(true);

      const localDeckSnapshot = loadLocalDeck();
      const localCards = localDeckSnapshot.filter(item => (
        typeof item.id === 'string' && item.id.startsWith('local-')
      ));

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

      touchUserActivity(userId);

      for (const card of localCards) {
        try {
          const wordId = await resolveDictionaryId(card.word);
          if (!wordId) continue;

          let privateMeaning = card.meaning;
          try {
            if (typeof privateMeaning === 'string') privateMeaning = JSON.parse(privateMeaning);
          } catch (error) {}

          const { error: uploadError } = await supabase
            .from('user_decks')
            .insert({
              user_id: userId,
              word_id: wordId,
              custom_word: card.word,
              custom_meaning: privateMeaning,
              custom_video_url: card.videoUrl || null,
              srs_level: card.masteredAt ? getRestoredSrsLevel(card) : card.srsLevel,
              repetition: card.repetition,
              interval: card.interval,
              ease_factor: card.easeFactor,
              next_review_date: card.nextReviewDate,
              stability: card.stability ?? 0.1,
              difficulty: card.difficulty ?? 3.0,
              reps: card.reps ?? 0,
              lapses: card.lapses ?? 0,
              state: card.state ?? State.New,
              scheduled_days: card.scheduled_days ?? 0,
              elapsed_days: card.elapsed_days ?? 0,
              learning_steps: card.learning_steps ?? 0,
              last_review_date: card.lastReviewDate || null,
              mastered_at: card.masteredAt || null
            });

          if (uploadError) {
            console.error(`Failed to upload local card "${card.word}":`, uploadError);
          }
        } catch (error) {
          console.error(`Failed to prepare local card "${card.word}" for sync:`, error);
        }
      }

      const { data: remoteDecks, error: fetchError } = await supabase
        .from('user_decks')
        .select(`
          *,
          global_dictionary (*)
        `)
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      const remoteCards = (remoteDecks || [])
        .filter(ud => ud.global_dictionary)
        .map(ud => {
          let parsedMeaning = ud.global_dictionary.meaning;
          let parsedRichData = ud.global_dictionary.rich_data;
          try {
            if (typeof parsedMeaning === 'string') parsedMeaning = JSON.parse(parsedMeaning);
          } catch (error) {}
          try {
            if (typeof parsedRichData === 'string') parsedRichData = JSON.parse(parsedRichData);
          } catch (error) {}

          const customMeaning = ud.custom_meaning || null;
          const effectiveMeaning = customMeaning || parsedRichData || parsedMeaning;
          const restoredSrsLevel = ud.srs_level === 'Mastered' ? getRestoredSrsLevel(ud) : ud.srs_level;

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
            srsLevel: ud.mastered_at ? 'Mastered' : restoredSrsLevel,
            archivedSrsLevel: ud.mastered_at ? restoredSrsLevel : null,
            repetition: ud.repetition,
            interval: ud.interval,
            easeFactor: ud.ease_factor,
            nextReviewDate: ud.next_review_date,
            stability: ud.stability,
            difficulty: ud.difficulty,
            reps: ud.reps,
            lapses: ud.lapses,
            state: ud.state,
            scheduled_days: ud.scheduled_days || 0,
            elapsed_days: ud.elapsed_days || 0,
            learning_steps: ud.learning_steps || 0,
            lastReviewDate: ud.last_review_date || null,
            masteredAt: ud.mastered_at || null,
            created_at: ud.created_at
          };
        });

      const remoteWords = new Set(remoteCards.map(card => card.word.toLowerCase().trim()));
      const remainingLocalCards = localCards.filter(card => !remoteWords.has(card.word.toLowerCase().trim()));
      const merged = [...remoteCards, ...remainingLocalCards];
      setVocab(merged);
      saveDeckToLocal(merged);

      const pendingLogs = loadLocalReviewLogs();
      if (pendingLogs.length > 0) {
        const unsyncedLocalWords = new Set(remainingLocalCards.map(card => card.word.toLowerCase().trim()));
        const logsToUpload = pendingLogs.filter(log => !unsyncedLocalWords.has(String(log.word || '').toLowerCase().trim()));

        if (logsToUpload.length > 0) {
          const { error: logsError } = await supabase
            .from('user_review_logs')
            .insert(logsToUpload.map(log => ({
              user_id: userId,
              word: log.word,
              rating: log.rating,
              response_time_ms: log.response_time_ms,
              stability_before: log.stability_before,
              stability_after: log.stability_after,
              review_date: log.review_date
            })));

          if (!logsError) {
            const getLogKey = log => log.id || `${log.word}:${log.rating}:${log.review_date}`;
            const uploadedLogKeys = new Set(logsToUpload.map(getLogKey));
            setReviewLogs(prevLogs => {
              const remainingLogs = prevLogs.filter(log => !uploadedLogKeys.has(getLogKey(log)));
              if (remainingLogs.length > 0) saveLogsToLocal(remainingLogs);
              else localStorage.removeItem('vocab_review_logs');
              return remainingLogs;
            });
          }
        }
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
  
  useEffect(() => {
    if (!user) setLoading(false);
  }, [user]);

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
      id: createLocalCardId(),
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
      state: 0,
      scheduled_days: 0,
      elapsed_days: 0,
      learning_steps: 0,
      lastReviewDate: null,
      masteredAt: null
    };

    // Push to Supabase if logged in
    if (user) {
      try {
        const wordId = await resolveDictionaryId(normalizedWord, richDetails);

        if (wordId) {
          const { data: userDeckRecord, error: deckError } = await supabase
            .from('user_decks')
            .insert({
              user_id: user.id,
              word_id: wordId,
              custom_meaning: richDetails,
              custom_video_url: imgUrl || null,
              srs_level: newCard.srsLevel,
              repetition: newCard.repetition,
              interval: newCard.interval,
              ease_factor: newCard.easeFactor,
              next_review_date: newCard.nextReviewDate,
              stability: newCard.stability,
              difficulty: newCard.difficulty,
              reps: newCard.reps,
              lapses: newCard.lapses,
              state: newCard.state,
              scheduled_days: newCard.scheduled_days || 0,
              elapsed_days: newCard.elapsed_days || 0,
              learning_steps: newCard.learning_steps || 0,
              last_review_date: newCard.lastReviewDate || null,
              mastered_at: newCard.masteredAt || null
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
    return { success: true, card: newCard };
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

  // Upload a small image to a single bounded cover path owned by the current user.
  const uploadUserCardImage = async (file, cardId) => {
    if (!user || !file || cardId === null || cardId === undefined) return null;
    const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
    const ext = String(file.name || '').split('.').pop()?.toLowerCase() || '';
    const cardPathId = String(cardId);
    const isImage = typeof file.type === 'string' && file.type.startsWith('image/');
    const isSafeCardPath = /^[a-zA-Z0-9_-]{1,64}$/.test(cardPathId);
    if (!isImage || !isSafeCardPath || !allowedExtensions.has(ext) || file.size > 5 * 1024 * 1024) {
      console.warn('Rejected unsafe or oversized image upload.');
      return null;
    }

    try {
      const bucket = supabase.storage.from('user-card-images');
      const fileName = `${user.id}/${cardId}/cover.${ext}`;
      const otherCoverPaths = Array.from(allowedExtensions)
        .filter(extension => extension !== ext)
        .map(extension => `${user.id}/${cardId}/cover.${extension}`);
      const { error: cleanupError } = await bucket.remove(otherCoverPaths);
      if (cleanupError) {
        console.error('Supabase cover cleanup error:', cleanupError);
        return null;
      }

      const { error: uploadError } = await bucket
        .upload(fileName, file, { cacheControl: '3600', upsert: true, contentType: file.type });
      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        return null;
      }

      const { data: publicUrlData } = bucket.getPublicUrl(fileName);
      return publicUrlData?.publicUrl || null;
    } catch (error) {
      console.error('Error in uploadUserCardImage:', error);
      return null;
    }
  };

  // Add new words from selected curriculum to the user's local deck
  const addNewCurriculumWords = async (curriculumName, count = 5, onWordAdded) => {
    const targetCurriculum = (!curriculumName || curriculumName === 'Self-Study only') ? 'Oxford 5000' : curriculumName;
    const requestedCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 5;
    if (requestedCount === 0) {
      return { success: true, count: 0, requestedCount: 0, addedWords: [], failures: [], exhausted: false };
    }

    const dbWords = [];
    const pageSize = 1000;
    let startRow = 0;
    while (true) {
      const { data: page, error: dbError } = await supabase
        .from('curriculum_words')
        .select('id, word, pos, cefr_level')
        .eq('curriculum_name', targetCurriculum)
        .order('id', { ascending: true })
        .range(startRow, startRow + pageSize - 1);

      if (dbError) {
        console.error('Failed to fetch curriculum words:', dbError);
        return { success: false, error: 'Failed to load curriculum from database.', failures: [] };
      }
      if (!page || page.length === 0) break;
      dbWords.push(...page);
      if (page.length < pageSize) break;
      startRow += pageSize;
    }

    const existingWords = new Set(vocab.map(item => String(item?.word || '').toLowerCase().trim()).filter(Boolean));
    const uniqueCandidates = new Map();
    for (const item of dbWords) {
      const normalizedWord = String(item?.word || '').toLowerCase().trim();
      if (normalizedWord && !existingWords.has(normalizedWord) && !uniqueCandidates.has(normalizedWord)) {
        uniqueCandidates.set(normalizedWord, item);
      }
    }
    const unadded = Array.from(uniqueCandidates.values());

    if (unadded.length === 0) {
      return { success: false, error: 'All words in this curriculum are already in your deck!', failures: [], exhausted: true };
    }

    const getRandomFloat = () => {
      if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
        const values = new Uint32Array(1);
        globalThis.crypto.getRandomValues(values);
        return values[0] / 0x100000000;
      }
      return Math.random();
    };

    const shuffleWords = (words) => {
      const shuffled = [...words];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(getRandomFloat() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const diversifyWords = (words) => {
      const buckets = new Map();
      for (const item of shuffleWords(words)) {
        const cefr = item.cefr_level || 'unranked';
        const pos = String(item.pos || 'word').split(/[,/ ]+/)[0] || 'word';
        const key = `${cefr}:${pos}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(item);
      }

      let activeBuckets = shuffleWords(Array.from(buckets.values()).map(bucket => shuffleWords(bucket)));
      const diversified = [];
      while (activeBuckets.length > 0) {
        activeBuckets = shuffleWords(activeBuckets);
        const nextBuckets = [];
        for (const bucket of activeBuckets) {
          const next = bucket.shift();
          if (next) diversified.push(next);
          if (bucket.length > 0) nextBuckets.push(bucket);
        }
        activeBuckets = nextBuckets;
      }
      return diversified;
    };

    const targetWords = diversifyWords(unadded).slice(0, count);
    const targetWordNames = new Set(targetWords.map(item => item.word.toLowerCase().trim()));
    const replacementWords = diversifyWords(unadded.filter(item => !targetWordNames.has(item.word.toLowerCase().trim())));
    const candidates = [...targetWords, ...replacementWords];
    const addedCardsList = [];
    const failures = [];
    let lastError = null;
    let attempted = 0;

    for (const item of candidates) {
      if (addedCardsList.length >= requestedCount) break;
      attempted += 1;

      try {
        const details = await getAiWordRichDetails(item.word);
        if (!details || details.error) {
          lastError = details?.error || 'Empty response from translation provider';
          failures.push({ word: item.word, stage: 'generation', error: String(lastError) });
          continue;
        }

        let imgUrl = details.savedSceneImages?.[0] || '';
        if (!imgUrl) {
          const firstImagePrompt = details.imagePrompts?.[0] || item.word;
          try {
            const imageRes = await fetchVocabImage(firstImagePrompt, 'photo');
            imgUrl = imageRes.url || '';
            if (imgUrl) {
              if (!details.savedSceneImages) details.savedSceneImages = [];
              details.savedSceneImages[0] = imgUrl;
            }
          } catch (error) {
            console.error('Failed to fetch auto-image for curriculum word:', item.word, error);
          }
        }

        let category = 'Daily Life';
        if (String(curriculumName || '').startsWith('TOEIC')) category = 'Business';
        else if (String(curriculumName || '').startsWith('IELTS')) category = 'Academic';

        const newCard = {
          id: createLocalCardId(),
          word: item.word.toLowerCase().trim(),
          meaning: JSON.stringify(details),
          pos: item.pos,
          cefrLevel: item.cefr_level || 'B2',
          category,
          curriculum: curriculumName || 'Self-Study only',
          videoUrl: imgUrl,
          srsLevel: 'Learning',
          repetition: 0,
          interval: 0,
          easeFactor: 2.5,
          nextReviewDate: new Date(Date.now() - 60000).toISOString(),
          stability: 1.0,
          difficulty: 5.0,
          reps: 0,
          lapses: 0,
          state: State.New,
          scheduled_days: 0,
          elapsed_days: 0,
          learning_steps: 0,
          lastReviewDate: null,
          masteredAt: null
        };

        if (user) {
          const wordId = await resolveDictionaryId(item.word, details);
          if (!wordId) {
            lastError = 'Could not create a verified dictionary entry.';
            failures.push({ word: item.word, stage: 'dictionary', error: lastError });
            continue;
          }

          const { data: userDeckRecord, error: insertError } = await supabase
            .from('user_decks')
            .insert({
              user_id: user.id,
              word_id: wordId,
              custom_meaning: details,
              custom_video_url: imgUrl || null,
              srs_level: newCard.srsLevel,
              repetition: newCard.repetition,
              interval: newCard.interval,
              ease_factor: newCard.easeFactor,
              next_review_date: newCard.nextReviewDate,
              stability: newCard.stability,
              difficulty: newCard.difficulty,
              reps: newCard.reps,
              lapses: newCard.lapses,
              state: newCard.state,
              scheduled_days: newCard.scheduled_days,
              elapsed_days: newCard.elapsed_days,
              learning_steps: newCard.learning_steps,
              last_review_date: null,
              mastered_at: null
            })
            .select('id')
            .single();

          if (insertError || !userDeckRecord?.id) {
            lastError = insertError?.message || 'Remote card insert returned no id.';
            failures.push({ word: item.word, stage: 'remote_insert', error: lastError });
            continue;
          }
          newCard.id = userDeckRecord.id;
        }

        setVocab(prev => {
          const updated = [newCard, ...prev];
          saveDeckToLocal(updated);
          return updated;
        });
        addedCardsList.push(newCard);
        if (typeof onWordAdded === 'function') onWordAdded(addedCardsList.length);
      } catch (error) {
        lastError = error?.message || String(error);
        failures.push({ word: item.word, stage: 'import', error: lastError });
        console.error(`Failed to automatically import "${item.word}":`, error);
      }
    }

    const exhausted = addedCardsList.length < requestedCount && attempted >= candidates.length;
    if (addedCardsList.length > 0) {
      return {
        success: true,
        count: addedCardsList.length,
        requestedCount,
        addedWords: addedCardsList,
        failures,
        exhausted
      };
    }

    return {
      success: false,
      error: lastError || 'Could not fetch details for any new words at this time.',
      count: 0,
      requestedCount,
      addedWords: [],
      failures,
      exhausted
    };
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

  // Preview official FSRS intervals. Master is a manual archive action, not an FSRS rating.
  const getProjectedIntervals = (card) => {
    if (!card) return { again: 'Loop', hard: '10m', normal: '2d', easy: '6d' };
    const now = new Date();
    const fsrsCard = toFsrsCard(card, now);
    const preview = fsrsScheduler.repeat(fsrsCard, now);

    return {
      again: 'Loop',
      hard: formatReviewInterval(preview[Rating.Hard].card.due, now),
      normal: formatReviewInterval(preview[Rating.Good].card.due, now),
      easy: formatReviewInterval(preview[Rating.Easy].card.due, now),
    };
  };

  // Manual Master archives a word without corrupting its FSRS memory state.
  const updateWordSrs = async (cardId, actionOrLevel, responseTimeMs) => {
    const itemToUpdate = vocab.find(item => item.id === cardId);
    if (!itemToUpdate) return { success: false, error: 'Card not found.' };

    const isRemoteBacked = isRemoteDeckId(cardId);
    if (isRemoteBacked && !user) {
      return { success: false, error: 'Sign in again before saving this review.' };
    }

    const commitCardPatch = (patch) => {
      const updatedCard = { ...itemToUpdate, ...patch };
      setVocab(prevVocab => {
        const updated = prevVocab.map(item => item.id === cardId ? { ...item, ...patch } : item);
        saveDeckToLocal(updated);
        return updated;
      });
      return updatedCard;
    };

    if (actionOrLevel === 'master') {
      if (itemToUpdate.masteredAt || itemToUpdate.srsLevel === 'Mastered') {
        return { success: true, card: itemToUpdate };
      }

      const masteredAt = new Date().toISOString();
      if (isRemoteBacked) {
        const { error } = await supabase
          .from('user_decks')
          .update({ mastered_at: masteredAt })
          .eq('id', cardId);
        if (error) {
          console.error('Error archiving remote card:', error);
          return { success: false, error: error.message || 'Could not archive this card.' };
        }
      }

      const updatedCard = commitCardPatch({
        srsLevel: 'Mastered',
        archivedSrsLevel: itemToUpdate.srsLevel || getRestoredSrsLevel(itemToUpdate),
        masteredAt
      });
      return { success: true, card: updatedCard };
    }

    if (itemToUpdate.masteredAt || itemToUpdate.srsLevel === 'Mastered') {
      const restoredSrsLevel = getRestoredSrsLevel(itemToUpdate);
      if (isRemoteBacked) {
        const remotePatch = { mastered_at: null };
        if (!itemToUpdate.archivedSrsLevel || itemToUpdate.archivedSrsLevel === 'Mastered') {
          remotePatch.srs_level = restoredSrsLevel;
        }
        const { error } = await supabase
          .from('user_decks')
          .update(remotePatch)
          .eq('id', cardId);
        if (error) {
          console.error('Error restoring remote card:', error);
          return { success: false, error: error.message || 'Could not restore this card.' };
        }
      }

      const updatedCard = commitCardPatch({
        srsLevel: restoredSrsLevel,
        archivedSrsLevel: null,
        masteredAt: null
      });
      return { success: true, card: updatedCard };
    }

    const rating = reviewRatingMap[actionOrLevel];
    if (!rating) return { success: false, error: 'Unknown review rating.' };

    const now = new Date();
    const fsrsCard = toFsrsCard(itemToUpdate, now);
    const result = fsrsScheduler.next(fsrsCard, now, rating);
    const nextCard = result.card;
    const stability = nextCard.stability;
    const difficulty = nextCard.difficulty;
    const reps = nextCard.reps;
    const lapses = nextCard.lapses;
    const state = nextCard.state;
    const scheduledDays = nextCard.scheduled_days;
    const elapsedDays = nextCard.elapsed_days;
    const learningSteps = nextCard.learning_steps;
    const nextReviewDate = nextCard.due;
    const newInterval = Math.max(0, scheduledDays);
    const newSrsLevel = getLevelFromFsrs(nextCard, rating);
    const newRepetition = reps;
    const newEaseFactor = Math.max(1.3, Math.min(2.5, 1.3 + (10 - difficulty) * (1.2 / 10)));
    const responseTime = typeof responseTimeMs === 'number' ? responseTimeMs : 1500;
    const lastReviewDate = now.toISOString();
    const stabilityBefore = itemToUpdate.stability || 0;

    if (isRemoteBacked) {
      const { error } = await supabase.rpc('record_fsrs_review', {
        p_deck_id: cardId,
        p_srs_level: newSrsLevel,
        p_repetition: newRepetition,
        p_interval: newInterval,
        p_ease_factor: newEaseFactor,
        p_next_review_date: nextReviewDate.toISOString(),
        p_stability: stability,
        p_difficulty: difficulty,
        p_reps: reps,
        p_lapses: lapses,
        p_state: state,
        p_scheduled_days: scheduledDays,
        p_elapsed_days: elapsedDays,
        p_learning_steps: learningSteps,
        p_last_review_date: lastReviewDate,
        p_word: itemToUpdate.word,
        p_rating: actionOrLevel,
        p_response_time_ms: responseTime,
        p_stability_before: stabilityBefore,
        p_stability_after: stability
      });

      if (error) {
        console.error('Error recording FSRS review:', error);
        return { success: false, error: error.message || 'Could not save this review.' };
      }
    }

    const updatedCard = commitCardPatch({
      srsLevel: newSrsLevel,
      repetition: newRepetition,
      interval: newInterval,
      easeFactor: newEaseFactor,
      nextReviewDate: nextReviewDate.toISOString(),
      lastReviewDate,
      stability,
      difficulty,
      reps,
      lapses,
      state,
      scheduled_days: scheduledDays,
      elapsed_days: elapsedDays,
      learning_steps: learningSteps
    });

    if (!isRemoteBacked) {
      const newLog = {
        id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).substring(2),
        word: itemToUpdate.word,
        rating: actionOrLevel,
        response_time_ms: responseTime,
        stability_before: stabilityBefore,
        stability_after: stability,
        review_date: lastReviewDate
      };
      setReviewLogs(prevLogs => {
        const updatedLogs = [...prevLogs, newLog];
        saveLogsToLocal(updatedLogs);
        return updatedLogs;
      });
    }

    return { success: true, card: updatedCard };
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

  // Query the server with only the normalized word; validation authority stays server-side.
  const queryGemini = async (word) => {
    console.log(`Invoking Supabase Edge Function for "${word}"...`);
    const { data, error } = await supabase.functions.invoke('get-word-details', {
      body: { word }
    });

    if (error) throw new Error(`Edge Function error: ${error.message}`);
    if (!data) throw new Error('Edge Function returned empty response');

    return data;
  };

  // Suggested spellings are looked up as their own normalized words by the caller.
  const getAiWordRichDetails = async (word) => {
    const normalizedWord = typeof word === 'string' ? word.toLowerCase().trim() : '';
    if (!normalizedWord) return { error: 'A word is required.' };

    try {
      const { data: existingWord, error: fetchErr } = await supabase
        .from('global_dictionary')
        .select('id, rich_data')
        .eq('word', normalizedWord)
        .maybeSingle();

      if (!fetchErr && existingWord?.rich_data) {
        console.log(`Rich card data loaded from DB cache for "${normalizedWord}"`);
        const parsed = typeof existingWord.rich_data === 'string'
          ? JSON.parse(existingWord.rich_data)
          : existingWord.rich_data;

        if (parsed && !parsed._provider) parsed._provider = 'DB Cache';
        return { ...parsed, _dictionaryId: existingWord.id };
      }
    } catch (cacheError) {
      console.warn('global_dictionary cache lookup failed, falling back to AI:', cacheError);
    }

    let details;
    try {
      console.log(`Requesting word translation via Edge Function: "${normalizedWord}"...`);
      details = await queryGemini(normalizedWord);
      if (!details || typeof details === 'string' || details.error) {
        throw new Error(details?.error || (typeof details === 'string' ? details : 'Empty response from server'));
      }
    } catch (error) {
      console.error('Server-side translation failed:', error.message);
      return { error: error.message };
    }

    try {
      const sanitized = sanitizeThaiInObject(details);
      const usedProvider = sanitized._provider || 'API Backend';
      console.log(`Rich card data generated for "${normalizedWord}" using ${usedProvider}:`, sanitized);
      return sanitized;
    } catch (jsonError) {
      console.error('Failed to process AI response:', details, jsonError);
      return { error: `Failed to process AI response: ${jsonError.message}` };
    }
  };

  // Resolve a shared dictionary id without letting the browser write shared data.
  const resolveDictionaryId = async (word, knownDetails = null) => {
    if (knownDetails?._dictionaryId) return knownDetails._dictionaryId;
    const normalizedWord = typeof word === 'string' ? word.trim().toLowerCase() : '';
    if (!normalizedWord) return null;

    const lookup = async () => {
      const { data } = await supabase
        .from('global_dictionary')
        .select('id')
        .eq('word', normalizedWord)
        .maybeSingle();
      return data?.id || null;
    };

    const existingId = await lookup();
    if (existingId) return existingId;

    const generated = await getAiWordRichDetails(normalizedWord);
    if (generated?._dictionaryId) return generated._dictionaryId;
    return lookup();
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

