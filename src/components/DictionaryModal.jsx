import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, Volume2, BookOpen, Loader, Plus, Rocket } from 'lucide-react';
import { useDictionary } from '../context/DictionaryContext';
import { useVocab } from '../context/VocabContext';
import { splitSentenceAroundWord } from '../utils/textUtils';
import ClickableText from './ClickableText';

const DictionaryModal = () => {
  const { isOpen, currentWord, historyLength, goBack, closeDictionary } = useDictionary();
  const { vocab, addOrUpdateWord } = useVocab();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !currentWord) return;

    const fetchDefinition = async () => {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${currentWord}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Definition not found.');
          }
          throw new Error('Failed to fetch definition.');
        }
        const json = await response.json();
        setData(json[0]); // the API returns an array of entries
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDefinition();
  }, [currentWord, isOpen]);

  const playTTS = (phonetics) => {
    // Try to find a phonetic audio from the API response
    const phoneticObj = phonetics?.find(p => p.audio && p.audio.length > 0);
    if (phoneticObj) {
      const audio = new Audio(phoneticObj.audio);
      audio.play();
    } else if (window.speechSynthesis) {
      // Fallback to browser TTS
      const utterance = new SpeechSynthesisUtterance(currentWord);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAddToDeck = () => {
    if (!data) return;
    const existingWord = vocab.find(w => w.word.toLowerCase() === currentWord.toLowerCase());
    
    if (existingWord) {
      addOrUpdateWord({
        word: existingWord.word, 
        srsLevel: 'Learning',
        repetition: 0,
        interval: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date().toISOString()
      });
    } else {
      const rawExample = data.meanings[0]?.definitions[0]?.example || '';
      const { pre, post } = splitSentenceAroundWord(rawExample, currentWord);

      addOrUpdateWord({
        word: currentWord,
        pos: data.meanings[0]?.partOfSpeech || 'unknown',
        meaning: data.meanings[0]?.definitions[0]?.definition || 'No definition',
        sentencePre: pre,
        sentencePost: post,
        srsLevel: 'Learning',
        repetition: 0,
        interval: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date().toISOString()
      });
    }
    closeDictionary();
  };

  const isExisting = currentWord ? vocab.some(w => w.word.toLowerCase() === currentWord.toLowerCase()) : false;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDictionary}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 999
            }}
          />

          {/* Centering Wrapper */}
          <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            pointerEvents: 'none'
          }}>
            {/* Modal */}
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                pointerEvents: 'auto',
                width: '90%',
                maxWidth: '450px',
                maxHeight: '80vh',
                background: 'rgba(20, 22, 35, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                overflow: 'hidden' // So the header stays fixed and content scrolls
              }}
            >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.2rem',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: 'rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {historyLength > 1 && (
                  <button onClick={goBack} className="glass-button" style={{ padding: '0.4rem', borderRadius: '50%' }}>
                    <ArrowLeft size={20} />
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <BookOpen size={18} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' }}>Dictionary</span>
                </div>
              </div>

              <button onClick={closeDictionary} className="glass-button" style={{ padding: '0.4rem', borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            {/* Content Area */}
            <div className="scrollable-content" style={{ padding: '1.5rem', overflowY: 'auto' }}>
              {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', color: 'var(--accent-color)' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Loader size={32} />
                  </motion.div>
                  <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Looking up "{currentWord}"...</p>
                </div>
              )}

              {error && !loading && (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ display: 'inline-block', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
                    <BookOpen size={32} color="var(--error-color, #ef4444)" />
                  </div>
                  <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>{error}</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>We couldn't find a definition for <strong style={{ color: 'white' }}>"{currentWord}"</strong>.</p>
                </div>
              )}

              {data && !loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div>
                      <h2 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: 'white', textTransform: 'capitalize' }}>
                        {data.word}
                      </h2>
                      {data.phonetic && (
                        <span style={{ color: 'var(--accent-color)', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                          {data.phonetic}
                        </span>
                      )}
                    </div>
                    <button onClick={() => playTTS(data.phonetics)} className="glass-button" style={{ padding: '0.6rem', borderRadius: '50%', height: 'fit-content' }}>
                      <Volume2 size={24} />
                    </button>
                  </div>

                  <button 
                    onClick={handleAddToDeck}
                    className="glass-button primary"
                    style={{ width: '100%', marginBottom: '1.5rem', padding: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: isExisting ? 'var(--accent-color)' : 'var(--success-color)' }}
                  >
                    {isExisting ? (
                      <><Rocket size={18} /> Move to Learning Queue</>
                    ) : (
                      <><Plus size={18} /> Add to Deck</>
                    )}
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {data.meanings.map((meaning, idx) => (
                      <div key={idx}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                          <span style={{ 
                            fontSize: '0.85rem', 
                            fontWeight: 600, 
                            color: 'var(--text-primary)', 
                            background: 'rgba(255,255,255,0.1)', 
                            padding: '0.2rem 0.6rem', 
                            borderRadius: '12px',
                            textTransform: 'lowercase'
                          }}>
                            {meaning.partOfSpeech}
                          </span>
                        </div>
                        
                        <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                          {meaning.definitions.slice(0, 3).map((def, defIdx) => (
                            <li key={defIdx} style={{ lineHeight: '1.5' }}>
                              <ClickableText text={def.definition} style={{ color: 'rgba(255,255,255,0.9)' }} />
                              {def.example && (
                                <div style={{ marginTop: '0.4rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--accent-color)', fontStyle: 'italic', opacity: 0.8 }}>
                                  <ClickableText text={`"${def.example}"`} />
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DictionaryModal;
