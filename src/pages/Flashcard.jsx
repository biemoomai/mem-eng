import React, { useState, useRef } from 'react';
import { Volume2, ChevronRight, Mic, Skull } from 'lucide-react';
import { motion } from 'framer-motion';
import ClickableText from '../components/ClickableText';

const mockCard = {
  word: 'Mitigate',
  audio: null, // TTS will handle
  videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
  sentencePre: 'He wanted to ',
  sentencePost: ' misery in the world.',
  correctAnswer: 'mitigate',
  definition: 'Make less severe or painful. (ทำให้น้อยลง บรรเทา)',
};

const Flashcard = () => {
  const [inputVal, setInputVal] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'correct' or 'wrong'
  const [savageMsg, setSavageMsg] = useState('');
  const videoRef = useRef(null);

  const savageLines = [
    "Are you even trying? My grandma types faster.",
    "Bruh. That's not even close.",
    "Did you sleep during The Purge? Wake up!",
    "Wrong. But don't worry, average is a good look on you."
  ];

  const handleCheck = () => {
    if (inputVal.toLowerCase().trim() === mockCard.correctAnswer) {
      setFeedback('correct');
      setShowAnswer(true);
      setSavageMsg('');
    } else {
      setFeedback('wrong');
      setShowAnswer(true);
      // Pick random savage line
      const line = savageLines[Math.floor(Math.random() * savageLines.length)];
      setSavageMsg(line);
    }
  };

  const playTTS = () => {
    const utterance = new SpeechSynthesisUtterance(mockCard.word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="scrollable-content" style={{ padding: '0', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* Video Context */}
      <div style={{ width: '100%', height: '240px', background: '#000', position: 'relative' }}>
         {/* using w3schools placeholder video for prototype */}
         <video 
           ref={videoRef}
           src={mockCard.videoUrl} 
           autoPlay 
           loop 
           muted 
           playsInline
           style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
         />
         <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
           <button className="glass-button" style={{ padding: '0.4rem' }}>
              <Volume2 size={20} />
           </button>
         </div>
      </div>

      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Progress */}
        <div style={{ display: 'flex', gap: '5px', marginBottom: '2rem' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: '4px', flex: 1, background: i === 1 ? 'var(--accent-color)' : 'rgba(255,255,255,0.2)', borderRadius: '2px' }} />
          ))}
        </div>

        {/* Challenge Area */}
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '1.2rem', lineHeight: '1.8' }}>
            <span style={{ opacity: 0.7 }}><ClickableText text={mockCard.sentencePre} /></span>
            {showAnswer ? (
              <span style={{ 
                color: feedback === 'correct' ? 'var(--success-color)' : 'var(--accent-color)',
                fontWeight: 700,
                borderBottom: `2px dashed ${feedback === 'correct' ? 'var(--success-color)' : 'var(--accent-color)'}`,
                padding: '0 0.5rem'
              }}>
                {mockCard.correctAnswer}
              </span>
            ) : (
              <input 
                 type="text" 
                 className="glass-input" 
                 style={{ width: '120px', display: 'inline-block', padding: '0.2rem 0.5rem', margin: '0 0.5rem', textAlign: 'center', fontSize: '1.2rem' }}
                 value={inputVal}
                 onChange={(e) => setInputVal(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                 autoFocus
              />
            )}
            <span style={{ opacity: 0.7 }}><ClickableText text={mockCard.sentencePost} /></span>
          </p>
        </div>

        {/* Answer Reveal / Simple English */}
        {showAnswer && (
          <div className="glass-panel" style={{ padding: '1.5rem', animation: 'fadeIn 0.3s ease', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '2rem', color: 'white', margin: 0 }}>{mockCard.word}</h2>
              <button onClick={playTTS} className="glass-button" style={{ borderRadius: '50%', width: '45px', height: '45px' }}>
                <Volume2 size={24} />
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              <ClickableText text={mockCard.definition} />
            </p>
          </div>
        )}

        {/* Savage Mode Feedback */}
        {showAnswer && feedback === 'wrong' && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.08)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            padding: '1.2rem', 
            borderRadius: '20px',
            borderBottomLeftRadius: '4px', // Chat bubble effect
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            marginBottom: '1rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <div style={{ background: 'linear-gradient(135deg, #ef4444, #f43f5e)', padding: '0.6rem', borderRadius: '50%', flexShrink: 0, boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' }}>
              <Skull size={20} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                 <h4 style={{ color: '#f8fafc', fontSize: '0.9rem', fontWeight: 600 }}>AI Accountability Partner</h4>
                 <span style={{ fontSize: '0.6rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>SAVAGE MODE</span>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, fontStyle: 'italic' }}>"{savageMsg}"</p>
            </div>
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          {!showAnswer ? (
             <button className="glass-button primary" style={{ width: '100%' }} onClick={handleCheck}>
               Check Answer
             </button>
          ) : (
             <button className="glass-button secondary" style={{ width: '100%' }} onClick={() => {
                setInputVal('');
                setShowAnswer(false);
                setFeedback(null);
             }}>
               Next Card <ChevronRight size={20} />
             </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default Flashcard;
