import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Volume2, ShieldAlert, Flame } from 'lucide-react';
import { useVocab } from '../context/VocabContext';
import ClickableText from '../components/ClickableText';

const Purge = () => {
  const { vocab, updateWordSrs } = useVocab();
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [showPopup, setShowPopup] = useState(true);

  // revealStep: 0=VideoOnly, 1=WordRevealed, 2=MeaningRevealed, 3=SentenceRevealed
  const [revealStep, setRevealStep] = useState(0);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const overlayRed = useTransform(x, [-50, -150], [0, 0.4]);
  const overlayGreen = useTransform(x, [50, 150], [0, 0.4]);

  const videoRef = useRef(null);

  // Filter global vocab for only DUE words based on SRS
  const dueVocab = vocab.filter(w => new Date(w.nextReviewDate) <= new Date());

  const wordObj = dueVocab[currentQueueIndex];

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPopup(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (revealStep === 0 && videoRef.current && wordObj) {
      videoRef.current.play().catch(e => console.log('Autoplay blocked', e));
    }
  }, [currentQueueIndex, revealStep, wordObj]);

  const handleNextStep = () => {
    if (revealStep < 3) {
      setRevealStep(prev => prev + 1);
    }
  };

  const [exitDirection, setExitDirection] = useState(0);

  const handleSrsChoice = (choice) => {
    // delay for exit animation
    setTimeout(() => {
      updateWordSrs(wordObj.id, choice);
      setRevealStep(0);
      x.set(0); 
      setExitDirection(0);
    }, 250);
  };

  const handleDragEnd = (event, info) => {
    if (revealStep < 1) return; // Only allow swipe after revealing something
    const threshold = 120;
    if (info.offset.x > threshold) {
      setExitDirection(1);
      handleSrsChoice('easy');
    } else if (info.offset.x < -threshold) {
      setExitDirection(-1);
      handleSrsChoice('hard');
    }
  };

  if (!dueVocab || dueVocab.length === 0) {
    return (
      <div className="app-container" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '3rem', color: 'var(--success-color)' }}>🎉</h1>
        </div>
        <h2 style={{ color: 'white', marginBottom: '0.5rem' }}>You're all caught up!</h2>
        <p style={{ color: 'var(--text-secondary)' }}>No vocabulary words left in your queue for today. Come back tomorrow.</p>
      </div>
    );
  }

  return (
    <div className="scrollable-content" style={{ padding: '0', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>

      {/* Introduction Popup */}
      <AnimatePresence>
        {showPopup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, backdropFilter: 'blur(5px)' }}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                background: 'rgba(20, 22, 35, 0.95)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '2rem', borderRadius: '24px', zIndex: 51, width: '85%', maxWidth: '400px',
                textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{ display: 'inline-block', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
                <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--success-color)' }}>156<span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/5000</span></h1>
              </div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'white' }}>Welcome Back</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                You've mastered 156 core words. Ready to chip away at the next batch?
              </p>
              <button
                className="glass-button primary"
                style={{ width: '100%' }}
                onClick={() => setShowPopup(false)}
              >
                Let's Go
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem 1.5rem 6rem 1.5rem', paddingTop: '2rem' }}>

        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px' }}>Purge Mode</h2>
        </div>

        {/* Learning Card */}
        <motion.div
          key={wordObj.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ x: exitDirection === 1 ? 1000 : (exitDirection === -1 ? -1000 : 0), opacity: 0, transition: { duration: 0.25 } }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragSnapToOrigin={true}
          onDragEnd={handleDragEnd}
          className="glass-panel"
          style={{
            x,
            rotate,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: 0,
            cursor: revealStep >= 1 ? 'grab' : 'default',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            touchAction: 'none'
          }}
        >
          {/* Swiping Feedback Overlays */}
          <motion.div
            style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,1)', opacity: overlayRed, zIndex: 50, pointerEvents: 'none', mixBlendMode: 'overlay' }}
          />
          <motion.div
            style={{ position: 'absolute', inset: 0, background: 'rgba(16,185,129,1)', opacity: overlayGreen, zIndex: 50, pointerEvents: 'none', mixBlendMode: 'overlay' }}
          />

          {/* Tinder Stamps */}
          <motion.div
            style={{ 
              position: 'absolute', top: 40, right: 40, opacity: useTransform(x, [-50, -150], [0, 1]), rotate: 15, zIndex: 60, pointerEvents: 'none', 
              border: '4px solid #ef4444', borderRadius: '16px', padding: '0.5rem 1rem', color: '#ef4444', fontWeight: 900, fontSize: '1.8rem', 
              textTransform: 'uppercase', background: 'rgba(20,22,35,0.8)', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 10px 30px rgba(239,68,68,0.3)'
            }}
          >
            <ShieldAlert size={36}/> REPAIR
          </motion.div>
          
          <motion.div
            style={{ 
              position: 'absolute', top: 40, left: 40, opacity: useTransform(x, [50, 150], [0, 1]), rotate: -15, zIndex: 60, pointerEvents: 'none', 
              border: '4px solid #10b981', borderRadius: '16px', padding: '0.5rem 1rem', color: '#10b981', fontWeight: 900, fontSize: '1.8rem', 
              textTransform: 'uppercase', background: 'rgba(20,22,35,0.8)', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 10px 30px rgba(16,185,129,0.3)'
            }}
          >
            <Flame size={36}/> PERFECT
          </motion.div>

          {/* Top Video Area */}
          <div style={{ width: '100%', height: '40%', minHeight: '200px', background: '#000', position: 'relative' }}>
            {wordObj.videoUrl && wordObj.videoUrl.match(/\\.(mp4|webm|ogg)$/i) ? (
              <video
                ref={videoRef}
                src={wordObj.videoUrl}
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                loop
                muted
                playsInline
              />
            ) : (
              <img
                src={wordObj.videoUrl}
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                alt={wordObj.word}
              />
            )}
            <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
              <button className="glass-button" style={{ padding: '0.4rem', background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <Volume2 size={20} color="white" />
              </button>
            </div>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(20, 22, 35, 1), transparent)' }} />
          </div>

          {/* Text Reveal Area */}
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center', marginTop: '-30px', position: 'relative', zIndex: 10 }}>

            {/* Step 1: Word + POS */}
            <AnimatePresence>
              {revealStep >= 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
                >
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 1rem 0', letterSpacing: '-0.5px', color: 'white', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    {wordObj.word}
                    <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--accent-color)', background: 'rgba(59, 130, 246, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '8px' }}>
                      {wordObj.pos}
                    </span>
                  </h1>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 2: Meaning */}
            <AnimatePresence>
              {revealStep >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel"
                  style={{ padding: '1rem', textAlign: 'center', width: '100%' }}
                >
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.05rem', lineHeight: '1.5' }}>
                    <ClickableText text={wordObj.meaning} />
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 3: Sentence */}
            <AnimatePresence>
              {revealStep >= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel"
                  style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.02)', marginTop: '0.8rem', width: '100%' }}
                >
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.6', margin: 0, textAlign: 'center' }}>
                    <span style={{ opacity: 0.7 }}><ClickableText text={wordObj.sentencePre} /></span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-color)', padding: '0 0.2rem' }}>{wordObj.word.toLowerCase()}</span>
                    <span style={{ opacity: 0.7 }}><ClickableText text={wordObj.sentencePost} /></span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </motion.div>

        {/* Dynamic Controls Anchor (pushed to bottom) */}
        <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
          {revealStep === 0 && (
            <button className="glass-button primary" style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }} onClick={handleNextStep}>
              Show Word
            </button>
          )}

          {revealStep === 1 && (
            <button className="glass-button secondary" style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }} onClick={handleNextStep}>
              Show Meaning
            </button>
          )}

          {revealStep === 2 && (
            <button className="glass-button secondary" style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }} onClick={handleNextStep}>
              Show Example Sentence
            </button>
          )}

          {revealStep === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}
            >
              <button
                onClick={() => handleSrsChoice('super_easy')}
                className="glass-button"
                style={{ flexDirection: 'column', gap: '0.2rem', padding: '0.8rem 0', background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 700, textAlign: 'center', lineHeight: 1.1 }}>Super<br />Easy</span>
              </button>

              <button
                onClick={() => handleSrsChoice('easy')}
                className="glass-button"
                style={{ flexDirection: 'column', gap: '0.2rem', padding: '0.8rem 0', background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Easy</span>
              </button>

              <button
                onClick={() => handleSrsChoice('normal')}
                className="glass-button"
                style={{ flexDirection: 'column', gap: '0.2rem', padding: '0.8rem 0', background: 'rgba(249, 115, 22, 0.05)', borderColor: 'rgba(249, 115, 22, 0.2)', color: '#f97316' }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Normal</span>
              </button>

              <button
                onClick={() => handleSrsChoice('hard')}
                className="glass-button"
                style={{ flexDirection: 'column', gap: '0.2rem', padding: '0.8rem 0', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Hard</span>
              </button>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Purge;
