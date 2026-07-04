import React, { useState } from 'react';
import { Youtube, Search, CheckCircle, Plus, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { useVocab } from '../context/VocabContext';
import { motion, AnimatePresence } from 'framer-motion';

const Sync = () => {
  const { extractVocabFromText, addExtractedWord, vocab } = useVocab();
  const [inputText, setInputText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [addedWords, setAddedWords] = useState(new Set()); // tracks word strings that have been successfully added
  const [errorMsg, setErrorMsg] = useState('');

  const handleScanText = async () => {
    if (!inputText.trim()) return;
    setScanning(true);
    setErrorMsg('');
    setResults(null);
    
    try {
      const extracted = await extractVocabFromText(inputText);
      if (extracted && extracted.length > 0) {
        setResults(extracted);
      } else {
        setErrorMsg('No advanced vocabulary words could be extracted. Try pasting a longer text with more advanced words!');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to the AI service. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleAddWord = async (item, index) => {
    try {
      const success = await addExtractedWord(item);
      if (success) {
        setAddedWords(prev => {
          const next = new Set(prev);
          next.add(item.word);
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to add extracted word:", err);
    }
  };

  // Helper to check if a word is already in the user's vocabulary deck
  const isWordInVocab = (wordStr) => {
    return vocab.some(v => v && v.word && v.word.toLowerCase() === wordStr.toLowerCase());
  };

  return (
    <div className="scrollable-content" style={{ padding: '1.5rem', paddingBottom: '90px' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-block', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '24px', marginBottom: '1rem', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <BookOpen size={40} />
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>The Magic Sync</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Extract vocabulary words directly from any English text</p>
      </div>

      {!results ? (
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, textAlign: 'center' }}>
            Paste any English text below (like a news article, video transcript, lyrics, or a book page). Gemini will instantly extract advanced words for your deck.
          </div>
          
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste English text here (minimum 2-3 sentences)..."
            rows={6}
            style={{
              width: '100%',
              background: 'var(--bg-primary)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-primary)',
              padding: '1rem',
              borderRadius: '16px',
              fontSize: '1rem',
              outline: 'none',
              resize: 'vertical',
              transition: 'border-color 0.3s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
          />

          {errorMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          <button 
            className={`glass-button primary`}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}
            onClick={handleScanText}
            disabled={scanning || !inputText.trim()}
          >
            {scanning ? (
              <>
                <Loader2 className="spin" size={20} /> 
                <span>Extracting with Gemini...</span>
              </>
            ) : (
              <>
                <Search size={20} /> 
                <span>Extract Advanced Vocabulary</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          <div className="glass-panel" style={{ padding: '1.2rem', marginBottom: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <CheckCircle size={28} color="var(--success-color)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Successfully Extracted!</h3>
              <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-secondary)' }}>Found {results.length} advanced vocabulary words from your text.</p>
            </div>
          </div>
          
          <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Select words to add:</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {results.map((res, i) => {
              const alreadyAdded = addedWords.has(res.word) || isWordInVocab(res.word);
              return (
                <div key={i} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', borderLeft: alreadyAdded ? '4px solid #10b981' : '4px solid transparent' }}>
                   <div style={{ flex: 1 }}>
                     <h3 style={{ fontSize: '1.2rem', marginBottom: '0.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       {res.word}
                       <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{res.pos || 'n.'}</span>
                     </h3>
                     <p style={{ fontSize: '0.95rem', margin: '0 0 0.4rem 0', color: 'var(--text-primary)' }}>{res.meaning}</p>
                     <p style={{ fontSize: '0.8rem', fontStyle: 'italic', margin: 0, color: 'var(--text-secondary)' }}>"{res.context}"</p>
                   </div>
                   
                   <button 
                     className="glass-button" 
                     disabled={alreadyAdded}
                     onClick={() => handleAddWord(res, i)}
                     style={{ 
                       padding: '0.6rem', 
                       background: alreadyAdded ? 'rgba(16, 185, 129, 0.1)' : 'var(--btn-bg-hover)',
                       borderColor: alreadyAdded ? 'rgba(16, 185, 129, 0.3)' : 'var(--card-border)',
                       color: alreadyAdded ? '#10b981' : 'var(--text-primary)',
                       cursor: alreadyAdded ? 'default' : 'pointer',
                       borderRadius: '12px'
                     }}
                   >
                     {alreadyAdded ? <CheckCircle size={20} /> : <Plus size={20} />}
                   </button>
                </div>
              );
            })}
          </div>

          <button className="glass-button secondary" style={{ width: '100%', marginTop: '2rem', padding: '1rem' }} onClick={() => { setResults(null); setInputText(''); setAddedWords(new Set()); }}>
            Scan Another Text
          </button>
        </div>
      )}

      {/* Global CSS for spin animation */}
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default Sync;
