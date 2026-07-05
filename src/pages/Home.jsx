import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useVocab } from '../context/VocabContext';
import { getVocabImageUrl } from '../utils/imageHelper';
import { SafeImage } from '../components/SafeImage';
import { Sparkles, Play, PlusCircle, RefreshCw, X, BookOpen, Layers, Award, ShieldAlert, Flame, CheckCircle, ChevronRight, Zap, Trash2, Lightbulb, Activity } from 'lucide-react';

const irregularVerbs = {
  be: ['am/is/are', 'was/were', 'been'],
  go: ['go', 'went', 'gone'],
  write: ['write', 'wrote', 'written'],
  eat: ['eat', 'ate', 'eaten'],
  do: ['do', 'did', 'done'],
  make: ['make', 'made', 'made'],
  see: ['see', 'saw', 'seen'],
  take: ['take', 'took', 'taken'],
  come: ['come', 'came', 'come'],
  give: ['give', 'gave', 'given'],
  find: ['find', 'found', 'found'],
  think: ['think', 'thought', 'thought'],
  tell: ['tell', 'told', 'told'],
  say: ['say', 'said', 'said'],
  run: ['run', 'ran', 'run'],
  speak: ['speak', 'spoke', 'spoken'],
  sing: ['sing', 'sang', 'sung'],
  break: ['break', 'broke', 'broken'],
  choose: ['choose', 'chose', 'chosen'],
  know: ['know', 'knew', 'known'],
  buy: ['buy', 'bought', 'bought'],
  bring: ['bring', 'brought', 'brought'],
  get: ['get', 'got', 'gotten'],
  begin: ['begin', 'began', 'begun'],
  drink: ['drink', 'drank', 'drunk'],
  drive: ['drive', 'drove', 'driven'],
  fall: ['fall', 'fell', 'fallen'],
  fly: ['fly', 'flew', 'flown'],
  forget: ['forget', 'forgot', 'forgotten'],
  grow: ['grow', 'grew', 'grown'],
  hide: ['hide', 'hid', 'hidden'],
  ride: ['ride', 'rode', 'ridden'],
  rise: ['rise', 'rose', 'risen'],
  shake: ['shake', 'shook', 'shaken'],
  steal: ['steal', 'stole', 'stolen'],
  swear: ['swear', 'swore', 'sworn'],
  swim: ['swim', 'swam', 'swum'],
  throw: ['throw', 'threw', 'thrown'],
  wake: ['wake', 'woke', 'woken'],
  wear: ['wear', 'wore', 'worn'],
  keep: ['keep', 'kept', 'kept'],
  leave: ['leave', 'left', 'left'],
  lose: ['lose', 'lost', 'lost'],
  meet: ['meet', 'met', 'met'],
  read: ['read', 'read', 'read'],
  send: ['send', 'sent', 'sent'],
  sleep: ['sleep', 'slept', 'slept'],
  spend: ['spend', 'spent', 'spent'],
  build: ['build', 'built', 'built'],
  feel: ['feel', 'felt', 'felt'],
  hear: ['hear', 'heard', 'heard'],
  hold: ['hold', 'held', 'held'],
  pay: ['pay', 'paid', 'paid'],
  sell: ['sell', 'sold', 'sold'],
  sit: ['sit', 'sat', 'sat'],
  stand: ['stand', 'stood', 'stood'],
  win: ['win', 'won', 'won'],
  catch: ['catch', 'caught', 'caught'],
  fight: ['fight', 'fought', 'fought'],
  teach: ['teach', 'taught', 'taught'],
  understand: ['understand', 'understood', 'understood'],
  cut: ['cut', 'cut', 'cut'],
  hit: ['hit', 'hit', 'hit'],
  hurt: ['hurt', 'hurt', 'hurt'],
  let: ['let', 'let', 'let'],
  put: ['put', 'put', 'put'],
  set: ['set', 'set', 'set'],
  shut: ['shut', 'shut', 'shut'],
  cost: ['cost', 'cost', 'cost']
};

const getRegularVerbForms = (word) => {
  const w = word.toLowerCase().trim();
  if (w.endsWith('e')) {
    return [w, w + 'd', w + 'd'];
  }
  if (w.endsWith('y') && w.length > 1 && !['a','e','i','o','u'].includes(w[w.length - 2])) {
    const base = w.slice(0, -1);
    return [w, base + 'ied', base + 'ied'];
  }
  const vowels = ['a','e','i','o','u'];
  if (w.length >= 3) {
    const lastChar = w[w.length - 1];
    const secondLast = w[w.length - 2];
    const thirdLast = w[w.length - 3];
    const isLastConsonant = !vowels.includes(lastChar) && !['w','x','y'].includes(lastChar);
    const isSecondLastVowel = vowels.includes(secondLast);
    const isThirdLastConsonant = !vowels.includes(thirdLast);
    if (isLastConsonant && isSecondLastVowel && isThirdLastConsonant) {
      if (w.endsWith('er') || w.endsWith('en') || w.endsWith('open') || w.endsWith('limit')) {
        return [w, w + 'ed', w + 'ed'];
      }
      return [w, w + lastChar + 'ed', w + lastChar + 'ed'];
    }
  }
  return [w, w + 'ed', w + 'ed'];
};

const getVerbForms = (word, pos) => {
  if (!word) return null;
  const w = word.toLowerCase().trim();
  
  // Check if it's any form of an irregular verb
  for (const key in irregularVerbs) {
    const forms = irregularVerbs[key];
    if (forms.includes(w)) {
      return forms;
    }
  }

  const p = (pos || '').toLowerCase().trim();
  const isVerb = p === 'v' || p === 'verb' || p.includes('verb') || p.startsWith('v.') || p.includes('/v') || p.includes(' v ');
  if (isVerb) {
    return getRegularVerbForms(w);
  }
  return null;
};

const Home = () => {
  const { vocab, streak, deleteWordFromDeck } = useVocab();
  const [selectedCard, setSelectedCard] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const navigate = useNavigate();

  // Filter due cards
  const dueVocab = vocab.filter(w => w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date());
  
  // Stats
  const totalCardsCount = vocab.length;
  const dueCount = dueVocab.length;
  const masteredCount = vocab.filter(w => w.srsLevel === 'Mastered').length;

  const getSrsLevelColor = (level) => {
    switch(level) {
      case 'Super Easy': return '#10b981';
      case 'Easy': return '#06b6d4';
      case 'Normal': return '#f59e0b';
      case 'Hard': return '#ef4444';
      case 'Mastered': return '#a78bfa';
      default: return '#64748b';
    }
  };

  const getCefrBadgeColor = (cefr) => {
    if (!cefr) return 'rgba(255,255,255,0.05)';
    const upper = cefr.toUpperCase();
    if (upper.startsWith('A')) return 'rgba(16, 185, 129, 0.15)';
    if (upper.startsWith('B')) return 'rgba(6, 182, 212, 0.15)';
    return 'rgba(139, 92, 246, 0.15)';
  };

  const cleanMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('approved:')) return url.substring(9);
    return url;
  };

  return (
    <div className="scrollable-content" style={{ padding: '1.25rem', paddingBottom: '100px' }}>
      
      {/* 1. Header Profile & Streak Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', marginBottom: '1.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--accent-color), var(--secondary-accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            color: 'white',
            fontSize: '1rem',
            border: '2px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
          }}>
            A
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Welcome back,</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white' }}>Anki Master</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* Streak Badge */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.3rem', 
            padding: '0.35rem 0.75rem', 
            background: 'rgba(244, 63, 94, 0.1)', 
            border: '1px solid rgba(244, 63, 94, 0.25)', 
            borderRadius: '12px',
            color: '#f43f5e',
            fontSize: '0.8rem',
            fontWeight: 800,
            boxShadow: '0 0 10px rgba(244, 63, 94, 0.1)'
          }}>
            <Flame size={14} fill="currentColor" />
            <span>{streak}d</span>
          </div>
        </div>
      </div>

      {/* 2. Slogan Section */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '2.4rem', 
          fontWeight: 950, 
          margin: 0, 
          background: 'linear-gradient(135deg, #a78bfa 0%, #06b6d4 50%, #ec4899 100%)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent', 
          letterSpacing: '-1.5px',
          textShadow: '0 10px 30px rgba(139, 92, 246, 0.15)'
        }}>
          ChatGPT Anki
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.4rem', fontWeight: 500 }}>
          Spaced Repetition with Rich Contexts & Emojis
        </p>
      </div>

      {/* 3. Primary Study Card (Dashboard Status) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel"
        style={{ 
          padding: '1.5rem', 
          marginBottom: '1.8rem', 
          border: '1px solid rgba(139, 92, 246, 0.25)', 
          background: 'linear-gradient(135deg, rgba(22, 21, 38, 0.8) 0%, rgba(10, 8, 20, 0.95) 100%)',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white', fontWeight: 800 }}>Spaced Repetition</h3>
            <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Daily Review Queue</p>
          </div>
          <span style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 0 8px var(--accent-glow))' }}>🧠</span>
        </div>

        {/* Stats breakdown grids */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '1.2rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '0.6rem 0.4rem', borderRadius: '12px', textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>{totalCardsCount}</span>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
          </div>
          <div style={{ background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.15)', padding: '0.6rem 0.4rem', borderRadius: '12px', textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 800, color: '#f43f5e' }}>{dueCount}</span>
            <span style={{ fontSize: '0.6rem', color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Due Today</span>
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '0.6rem 0.4rem', borderRadius: '12px', textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>{masteredCount}</span>
            <span style={{ fontSize: '0.6rem', color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mastered</span>
          </div>
        </div>

        <button 
          onClick={() => navigate('/purge')}
          disabled={dueCount === 0}
          className="glass-button primary" 
          style={{ width: '100%', padding: '0.9rem', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: dueCount === 0 ? 0.55 : 1, cursor: dueCount === 0 ? 'default' : 'pointer' }}
        >
          {dueCount > 0 ? (
            <>
              <Play size={16} fill="currentColor" />
              <span>Study {dueCount} due cards</span>
            </>
          ) : (
            <>
              <CheckCircle size={16} />
              <span>All caught up!</span>
            </>
          )}
        </button>
      </motion.div>

      {/* 4. Quick Actions */}
      <div style={{ marginBottom: '2rem' }}>
        <Link 
          to="/add" 
          className="glass-panel glow-hover" 
          style={{ 
            padding: '1.25rem', 
            textDecoration: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.25)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.6rem', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '12px', color: 'var(--accent-hover)' }}>
              <Sparkles size={22} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h4 style={{ margin: 0, color: 'white', fontSize: '0.95rem', fontWeight: 800 }}>AI Translator & Auto-Save</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Translate words and instantly save as flashcards</span>
            </div>
          </div>
          <ChevronRight size={20} color="var(--text-secondary)" />
        </Link>
      </div>

      {/* 5. Collections Title */}
      <h3 style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
        <Layers size={15} /> My Deck Library ({totalCardsCount})
      </h3>

      {totalCardsCount > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
          {vocab.map((item) => {
            let isRich = false;
            let richData = null;
            try {
              if (item.meaning && typeof item.meaning === 'object') {
                richData = item.meaning;
                isRich = true;
              } else if (item.meaning && typeof item.meaning === 'string' && item.meaning.startsWith('{')) {
                richData = JSON.parse(item.meaning);
                isRich = true;
              }
            } catch (e) {}

            return (
              <div 
                key={item.id} 
                onClick={() => setSelectedCard({ ...item, richData })}
                className="glass-panel glow-hover" 
                style={{ 
                  borderRadius: '16px', 
                  overflow: 'hidden', 
                  cursor: 'pointer',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  background: 'rgba(16, 15, 28, 0.5)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {/* Thumbnail / Image preview */}
                <div style={{ height: '85px', width: '100%', background: '#040306', position: 'relative' }}>
                  {item.videoUrl ? (
                    <img 
                      src={cleanMediaUrl(item.videoUrl)} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} 
                      alt={item.word} 
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '0.65rem' }}>
                      No Media
                    </div>
                  )}
                  {isRich && (
                    <span style={{ 
                      position: 'absolute', 
                      top: '6px', 
                      right: '6px', 
                      background: 'rgba(139, 92, 246, 0.9)', 
                      color: 'white', 
                      fontSize: '0.55rem', 
                      fontWeight: 900, 
                      padding: '0.15rem 0.35rem', 
                      borderRadius: '5px', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)'
                    }}>
                      ✨ Rich
                    </span>
                  )}
                </div>

                {/* Info Text */}
                <div style={{ padding: '0.75rem' }}>
                  <h4 style={{ margin: 0, color: 'white', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{item.word}</span>
                    <span style={{ 
                      fontSize: '0.6rem', 
                      background: getCefrBadgeColor(item.cefrLevel), 
                      color: '#a78bfa', 
                      padding: '0.1rem 0.3rem', 
                      borderRadius: '4px',
                      fontWeight: 700 
                    }}>
                      {item.cefrLevel || 'C1'}
                    </span>
                  </h4>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                    {isRich ? richData.englishExplanation.definition : item.meaning}
                  </p>
                  
                  {/* SRS Level Bullet */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.4rem' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: getSrsLevelColor(item.srsLevel) }} />
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{item.srsLevel}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(16, 15, 28, 0.4)', borderRadius: '20px', border: '1px dashed rgba(139, 92, 246, 0.2)' }}>
          <BookOpen size={28} color="var(--text-secondary)" style={{ marginBottom: '0.8rem' }} />
          <h4 style={{ color: 'white', margin: '0 0 0.15rem 0', fontSize: '0.95rem' }}>Your deck is empty</h4>
          <p style={{ margin: 0, fontSize: '0.75rem' }}>Add rich vocabulary words or auto-sync some blocks to get started.</p>
        </div>
      )}

      {/* 6. Rich Card Detail Modal overlay */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'rgba(4, 3, 6, 0.85)', 
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 9999, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '1rem' 
            }}
          >
            <motion.div 
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              className="glass-panel"
              style={{ 
                width: '100%', 
                maxHeight: '82%', 
                overflowY: 'auto', 
                background: '#0a0911', 
                border: '1px solid rgba(139, 92, 246, 0.3)',
                padding: '1.25rem',
                position: 'relative',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
              }}
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedCard(null)}
                style={{ 
                  position: 'absolute', 
                  top: '12px', 
                  right: '12px', 
                  background: 'rgba(255,255,255,0.06)', 
                  border: 'none', 
                  borderRadius: '50%', 
                  width: '28px', 
                  height: '28px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  color: 'white',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.06)'}
              >
                <X size={15} />
              </button>

              {/* Card Contents */}
              {selectedCard.richData ? (
                /* RICH CARD LAYOUT */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left', marginTop: '0.5rem' }}>
                  
                  {/* Header */}
                  <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {selectedCard.word}
                      <span className="badge-neon" style={{ fontSize: '0.7rem' }}>{selectedCard.pos || 'n.'}</span>
                    </h2>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                      <span className="badge-cyan" style={{ fontSize: '0.65rem' }}>
                        SRS: {selectedCard.srsLevel}
                      </span>
                      <span className="badge-neon" style={{ fontSize: '0.65rem' }}>
                        CEFR: {selectedCard.cefrLevel || 'C1'}
                      </span>
                    </div>
                  </div>

                  {/* Definition */}
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.8rem' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#c084fc', fontWeight: 800, display: 'block', letterSpacing: '0.5px', marginBottom: '0.15rem' }}>English Explanation</span>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.95)', lineHeight: 1.4, fontWeight: 500 }}>
                      {selectedCard.richData.englishExplanation.definition}
                    </p>
                    
                    {selectedCard.richData.englishExplanation.phrase && (
                      <div style={{ marginTop: '0.6rem', background: 'rgba(139, 92, 246, 0.05)', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                        <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: '#a78bfa', fontWeight: 800, display: 'block' }}>Key Collocation</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white' }}>{selectedCard.richData.englishExplanation.phrase}</span>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginLeft: '0.3rem' }}>— {selectedCard.richData.englishExplanation.phraseMeaning}</span>
                      </div>
                    )}
                  </div>

                  {/* Image Prompts */}
                   {selectedCard.richData.imagePrompts && (
                    <div>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#06b6d4', fontWeight: 800, display: 'block', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>AI Context Art</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                        {selectedCard.richData.imagePrompts.map((promptText, idx) => (
                          <div key={idx} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', height: '80px', background: '#000', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <SafeImage keyword={promptText} alt={`Scene ${idx+1}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scenes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedCard.richData.scenes && selectedCard.richData.scenes.map((scene, idx) => (
                      <div key={idx} style={{ padding: '0.7rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#06b6d4', fontWeight: 800, marginBottom: '0.15rem' }}>
                          <span>{scene.emoji}</span>
                          <span>{scene.title}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{scene.situation}</p>
                        <p style={{ margin: '0.15rem 0', fontSize: '0.8rem', fontWeight: 800, color: '#10b981', fontStyle: 'italic' }}>{scene.dialogue}</p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}><strong>Meaning:</strong> {scene.meaning}</p>
                      </div>
                    ))}
                  </div>

                  {/* Thai */}
                  {selectedCard.richData.thaiTranslation && (
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.6rem' }}>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#10b981', fontWeight: 800, display: 'block', marginBottom: '0.15rem' }}>ภาษาไทย</span>
                      <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <div><strong>คำแปล:</strong> {selectedCard.richData.thaiTranslation.word}</div>
                        <div><strong>วลี:</strong> {selectedCard.richData.thaiTranslation.phrase}</div>
                      </div>
                    </div>
                  )}

                  {/* Takeaway */}
                  {selectedCard.richData.takeaway && (
                    <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', padding: '0.65rem 0.8rem', borderRadius: '10px' }}>
                      <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: '#34d399', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.05rem' }}>
                        <Lightbulb size={12} color="#eab308" fill="rgba(234, 179, 8, 0.1)" /> Key Takeaway
                      </span>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.3 }}>{selectedCard.richData.takeaway}</p>
                    </div>
                  )}

                  {/* Verb Forms (V1, V2, V3) */}
                  {(() => {
                    const verbForms = getVerbForms(selectedCard.word, selectedCard.pos);
                    if (!verbForms) return null;
                    const [v1, v2, v3] = verbForms;
                    return (
                      <div style={{ background: 'rgba(255, 255, 255, 0.012)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '0.85rem 1.1rem', borderRadius: '14px' }}>
                        <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                          Verb Forms (Tenses)
                        </span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.82rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                            <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: '0.2px' }}>V1 (Base)</span>
                            <span style={{ color: 'white', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.01em' }}>{v1}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: '0.2px' }}>V2 (Past)</span>
                              <span style={{ color: 'white', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.01em' }}>{v2}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: '0.2px' }}>V3 (Participle)</span>
                              <span style={{ color: 'white', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.01em' }}>{v3}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              ) : (
                /* SIMPLE CARD LAYOUT */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left', marginTop: '0.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {selectedCard.word}
                      <span className="badge-neon" style={{ fontSize: '0.7rem' }}>{selectedCard.pos || 'n.'}</span>
                    </h2>
                    <span className="badge-cyan" style={{ fontSize: '0.65rem', marginTop: '0.4rem' }}>
                      SRS Level: {selectedCard.srsLevel}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#c084fc', fontWeight: 800, display: 'block', letterSpacing: '0.5px', marginBottom: '0.15rem' }}>Meaning</span>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'white', fontWeight: 500 }}>{selectedCard.meaning}</p>
                  </div>

                  {selectedCard.example && (
                    <div>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#06b6d4', fontWeight: 800, display: 'block', letterSpacing: '0.5px', marginBottom: '0.15rem' }}>Example Sentence</span>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', lineHeight: 1.4 }}>
                        "{selectedCard.example}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Delete Card Button */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      message: `Are you sure you want to delete "${selectedCard.word}"?`,
                      onConfirm: () => {
                        deleteWordFromDeck(selectedCard.id);
                        setSelectedCard(null);
                      }
                    });
                  }}
                  className="glass-button animate-scale"
                  style={{
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                    background: 'rgba(239, 68, 68, 0.06)',
                    color: '#ef4444',
                    fontSize: '0.8rem',
                    padding: '0.45rem 0.95rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete Card</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 9999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}
            onClick={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                background: 'rgba(30, 41, 59, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '24px',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '360px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ color: 'white', margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800 }}>
                Confirm Action
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9rem', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                {confirmModal.message}
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid rgba(239, 68, 68, 0.22)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#f87171',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  No
                </button>
                <button
                  onClick={() => {
                    const confirmAction = confirmModal.onConfirm;
                    setConfirmModal({ isOpen: false, message: '', onConfirm: null });
                    if (typeof confirmAction === 'function') confirmAction();
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid rgba(34, 197, 94, 0.24)',
                    background: 'rgba(34, 197, 94, 0.16)',
                    color: '#4ade80',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Yes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Home;
