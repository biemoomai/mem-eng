import React, { useState } from 'react';
import { useVocab } from '../context/VocabContext';
import { Search, BrainCircuit, X, ThumbsUp, ThumbsDown, Filter, CheckCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Auditor = () => {
  const { globalDictionary, generateMemeAndUpload, approveWordDoodle, updateGlobalWordMedia, generateMemePromptAndUrl, uploadCustomMemeImage } = useVocab();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCefr, setSelectedCefr] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [previewWord, setPreviewWord] = useState(null);
  const [generatingMeme, setGeneratingMeme] = useState(false);
  const [tempMemeUrl, setTempMemeUrl] = useState('');
  const [tempMemePrompt, setTempMemePrompt] = useState('');

  const closePreview = () => {
    setPreviewWord(null);
    setTempMemeUrl('');
    setTempMemePrompt('');
    setGeneratingMeme(false);
  };

  const cefrTiers = ['All', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const statusTiers = ['All', 'Has Image', 'Approved Only', 'Pending Image'];

  // Clean media url helpers
  const cleanMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('approved:')) return url.substring('approved:'.length);
    return url;
  };

  const getStatus = (url) => {
    if (!url) return 'pending';
    if (url.startsWith('approved:')) return 'approved';
    if (url.startsWith('data:image/svg')) return 'generated';
    return 'pending';
  };

  // Filter list
  const filteredList = globalDictionary.filter(item => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchWord = item.word?.toLowerCase().includes(q);
      const matchMeaning = item.meaning?.toLowerCase().includes(q);
      if (!matchWord && !matchMeaning) return false;
    }

    // CEFR filter
    const cefr = item.cefr_level || item.cefrLevel || 'A1';
    if (selectedCefr !== 'All' && cefr.toUpperCase() !== selectedCefr.toUpperCase()) {
      return false;
    }

    // Status filter
    const status = getStatus(item.video_url);
    if (selectedStatus === 'Has Image' && status === 'pending') return false;
    if (selectedStatus === 'Approved Only' && status !== 'approved') return false;
    if (selectedStatus === 'Pending Image' && status !== 'pending') return false;

    return true;
  });

  // Calculate statistics
  const stats = (() => {
    let total = globalDictionary.length;
    let hasSvg = 0;
    let hasApprovedSvg = 0;
    let empty = 0;

    globalDictionary.forEach(row => {
      const url = row.video_url || '';
      if (!url) {
        empty++;
      } else if (url.startsWith('approved:data:image/svg')) {
        hasApprovedSvg++;
      } else if (url.startsWith('data:image/svg')) {
        hasSvg++;
      } else {
        empty++;
      }
    });

    return { total, hasSvg, hasApprovedSvg, pending: empty };
  })();

  return (
    <div className="scrollable-content" style={{ padding: '1.5rem', paddingBottom: '90px' }}>
      
      {/* Page Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'inline-block', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '24px', marginBottom: '0.8rem', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <BrainCircuit size={36} />
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>Doodle Auditor (Temp)</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Monitor and audit generated vocabulary SVGs in real-time</p>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Words</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{stats.total}</div>
        </div>
        <div className="glass-panel" style={{ padding: '0.8rem', textAlign: 'center', borderColor: 'rgba(96, 165, 250, 0.3)' }}>
          <div style={{ fontSize: '0.75rem', color: '#60a5fa' }}>Generated</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.2rem' }}>{stats.hasSvg}</div>
        </div>
        <div className="glass-panel" style={{ padding: '0.8rem', textAlign: 'center', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Approved</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>{stats.hasApprovedSvg}</div>
        </div>
        <div className="glass-panel" style={{ padding: '0.8rem', textAlign: 'center', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
          <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Pending</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.2rem' }}>{stats.pending}</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="glass-panel" style={{ padding: '1.2rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search word or meaning..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '0.8rem 2rem 0.8rem 2.2rem', borderRadius: '12px',
              background: 'var(--btn-bg-hover)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* CEFR Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>CEFR Level:</div>
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: '0.2rem' }}>
            {cefrTiers.map(tier => (
              <button
                key={tier}
                onClick={() => setSelectedCefr(tier)}
                className="glass-button"
                style={{
                  padding: '0.3rem 0.8rem', borderRadius: '15px', fontSize: '0.8rem', whiteSpace: 'nowrap',
                  background: selectedCefr === tier ? '#10b981' : 'rgba(255,255,255,0.05)',
                  color: selectedCefr === tier ? 'white' : 'var(--text-secondary)',
                  borderColor: selectedCefr === tier ? 'transparent' : 'rgba(255,255,255,0.1)'
                }}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Image Status:</div>
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: '0.2rem' }}>
            {statusTiers.map(tier => (
              <button
                key={tier}
                onClick={() => setSelectedStatus(tier)}
                className="glass-button"
                style={{
                  padding: '0.3rem 0.8rem', borderRadius: '15px', fontSize: '0.8rem', whiteSpace: 'nowrap',
                  background: selectedStatus === tier ? '#10b981' : 'rgba(255,255,255,0.05)',
                  color: selectedStatus === tier ? 'white' : 'var(--text-secondary)',
                  borderColor: selectedStatus === tier ? 'transparent' : 'rgba(255,255,255,0.1)'
                }}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid List */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <span>Showing {filteredList.length} words</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.8rem' }}>
        {filteredList.map(item => {
          const url = item.video_url || '';
          const status = getStatus(url);
          const cefr = item.cefr_level || item.cefrLevel || 'A1';

          return (
            <motion.div
              key={item.id}
              onClick={() => setPreviewWord(item)}
              whileHover={{ scale: 1.02 }}
              className="glass-panel"
              style={{
                padding: '0.6rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                cursor: 'pointer',
                overflow: 'hidden',
                background: 'rgba(20,22,35,0.3)',
                borderColor: status === 'approved' ? '#10b98150' : (status === 'generated' ? '#3b82f650' : 'var(--card-border)')
              }}
            >
              {/* Image Preview Window */}
              <div style={{ width: '100%', height: '140px', background: '#0b0c10', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {status === 'pending' ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pending ⏳</span>
                ) : (
                  <img 
                    src={cleanMediaUrl(url)} 
                    alt={item.word} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'white' }} 
                  />
                )}
              </div>

              {/* Word Meta */}
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.word}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#60a5fa', background: 'rgba(96,165,250,0.1)', padding: '0.05rem 0.3rem', borderRadius: '4px' }}>
                    {cefr}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: status === 'approved' ? '#10b981' : (status === 'generated' ? '#60a5fa' : '#f59e0b') }}>
                    {status.toUpperCase()}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Preview SVG / Doodle Modal */}
      <AnimatePresence>
        {previewWord && (() => {
          const currentItem = globalDictionary.find(w => w.id === previewWord.id) || previewWord;
          const url = currentItem.video_url || '';
          const status = getStatus(url);
          
          const handleRegen = async (e) => {
            e.stopPropagation();
            setTempMemeUrl('');
            setTempMemePrompt('');
            // Show immediate loading indicator in UI
            const loadingUrl = `generating-${currentItem.id}`;
            await updateGlobalWordMedia(currentItem.id, loadingUrl);
            
            // Pass a random variation seed to force the model to draw a fresh scene composition
            const randomVar = Math.floor(Math.random() * 1000) + 1;
            await generateMemeAndUpload(currentItem.word, currentItem.meaning, currentItem.id, randomVar, currentItem.example);
          };

          const handleApprove = async (e) => {
            e.stopPropagation();
            await approveWordDoodle(currentItem.id);
          };

          const handleMemeGenerate = async (e) => {
            e.stopPropagation();
            setGeneratingMeme(true);
            setTempMemeUrl('');
            try {
              const res = await generateMemePromptAndUrl(currentItem.word, currentItem.meaning, currentItem.example);
              if (res) {
                setTempMemeUrl(res.url);
                setTempMemePrompt(res.prompt);
              }
            } catch (err) {
              console.error(err);
            } finally {
              setGeneratingMeme(false);
            }
          };

          const handleSaveMeme = async (e) => {
            e.stopPropagation();
            if (!tempMemeUrl) return;
            const savedUrl = tempMemeUrl;
            setTempMemeUrl('');
            setTempMemePrompt('');
            // Show loading state
            const loadingUrl = `generating-${currentItem.id}`;
            await updateGlobalWordMedia(currentItem.id, loadingUrl);
            
            try {
              await uploadCustomMemeImage(currentItem.id, savedUrl);
            } catch (err) {
              console.error(err);
            }
          };

          return (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={closePreview}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 110, backdropFilter: 'blur(8px)' }}
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, x: '-50%', y: '-50%' }}
                animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
                exit={{ scale: 0.9, opacity: 0, x: '-50%', y: '-50%' }}
                style={{
                  position: 'fixed', top: '50%', left: '50%',
                  width: '90%', maxWidth: '440px', maxHeight: '90vh', background: 'var(--bg-primary)',
                  borderRadius: '24px', border: `1px solid rgba(255,255,255,0.1)`,
                  boxShadow: '0 20px 50px rgba(0,0,0,0.5)', zIndex: 111,
                  display: 'flex', flexDirection: 'column', overflow: 'hidden'
                }}
              >
                {/* Header */}
                <div style={{ padding: '1.2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {currentItem.word}
                      <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>{currentItem.pos}</span>
                    </h3>
                  </div>
                  <button onClick={closePreview} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
                    <X size={22} />
                  </button>
                </div>

                {/* Content */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', overflowY: 'auto', flex: 1 }}>
                  {/* SVG / Placeholder Container */}
                  <div style={{ width: '100%', height: '360px', borderRadius: '16px', background: '#0b0c10', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.05)' }}>
                    
                    {status === 'approved' && !tempMemeUrl && (
                      <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10, background: '#10b981', color: 'white', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        ✓ Approved
                      </div>
                    )}

                    {generatingMeme ? (
                      <div style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
                          <RefreshCw size={36} style={{ color: '#3b82f6' }} />
                        </motion.div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                          🎭 Gemini is thinking of a funny meme prompt and drawing it...
                        </p>
                      </div>
                    ) : status === 'pending' && !tempMemeUrl ? (
                      <div style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <svg viewBox="0 0 200 200" width="120" height="120">
                          <circle cx="100" cy="65" r="22" fill="none" stroke="#444" strokeWidth="3">
                            <animate attributeName="r" values="22;24;22" dur="1.5s" repeatCount="indefinite"/>
                          </circle>
                          <line x1="100" y1="87" x2="100" y2="135" stroke="#444" strokeWidth="3">
                            <animate attributeName="y2" values="135;130;135" dur="1.5s" repeatCount="indefinite"/>
                          </line>
                          <line x1="100" y1="105" x2="68" y2="90" stroke="#444" strokeWidth="3">
                            <animate attributeName="x2" values="68;60;68" dur="0.7s" repeatCount="indefinite"/>
                            <animate attributeName="y2" values="90;82;90" dur="0.7s" repeatCount="indefinite"/>
                          </line>
                          <line x1="100" y1="105" x2="132" y2="90" stroke="#444" strokeWidth="3">
                            <animate attributeName="x2" values="132;140;132" dur="0.7s" repeatCount="indefinite" begin="0.35s"/>
                            <animate attributeName="y2" values="90;82;90" dur="0.7s" repeatCount="indefinite" begin="0.35s"/>
                          </line>
                          <line x1="100" y1="135" x2="78" y2="165" stroke="#444" strokeWidth="3"/>
                          <line x1="100" y1="135" x2="122" y2="165" stroke="#444" strokeWidth="3"/>
                        </svg>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                          ✏️ AI is drawing this doodle...
                        </p>
                      </div>
                    ) : (
                      <img 
                        src={tempMemeUrl || cleanMediaUrl(url)} 
                        alt={currentItem.word}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'white' }}
                      />
                    )}
                  </div>

                  {/* Definition & Example */}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: 700 }}>MEANING:</div>
                    <div style={{ fontSize: '0.95rem', color: 'white', lineHeight: '1.4' }}>{currentItem.meaning}</div>
                    
                    {currentItem.example && (
                      <>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: 700, marginTop: '0.5rem' }}>EXAMPLE:</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.4' }}>"{currentItem.example}"</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Footer Controls (Approval / Regen) */}
                <div style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {tempMemeUrl ? (
                    <>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', wordBreak: 'break-word', textAlign: 'center', padding: '0 0.5rem' }}>
                        "{tempMemePrompt}"
                      </div>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                          onClick={() => { setTempMemeUrl(''); setTempMemePrompt(''); }}
                          className="glass-button" 
                          style={{ flex: 1, padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleSaveMeme}
                          className="glass-button primary" 
                          style={{ flex: 1, padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: '#3b82f6', borderColor: 'transparent', color: 'white' }}
                        >
                          💾 Save Meme
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                          onClick={handleRegen}
                          className="glass-button" 
                          style={{ flex: 1, padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                        >
                          👎 Regen SVG
                        </button>
                        <button 
                          onClick={handleApprove}
                          className="glass-button primary" 
                          style={{ flex: 1, padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: '#10b981', borderColor: 'transparent', color: 'white' }}
                        >
                          👍 Approve SVG
                        </button>
                      </div>
                      
                      <button 
                        onClick={handleMemeGenerate}
                        disabled={generatingMeme}
                        className="glass-button" 
                        style={{ width: '100%', padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.05)' }}
                      >
                        🎭 Generate Meme Photo
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

    </div>
  );
};

export default Auditor;
