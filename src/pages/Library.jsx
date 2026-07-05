import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useVocab } from '../context/VocabContext';
import { useAuth } from '../context/AuthContext';
import { Search, Edit2, Trash2, X, RefreshCw, Upload, Save, BookOpen, Clock, Activity, SearchX, CheckCircle } from 'lucide-react';
import { playClickSound, playSwipeSound, playSuccessSound } from '../utils/soundHelper';
import { fetchVocabImage } from '../utils/imageHelper';
import { SafeImage } from '../components/SafeImage';

export default function Library() {
  const { vocab, deleteWordFromDeck, updateUserCardOverride, uploadUserCardImage, getAiWordRichDetails } = useVocab();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('All');
  const [selectedCard, setSelectedCard] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit State
  const [editWord, setEditWord] = useState('');
  const [editDef, setEditDef] = useState('');
  const [editThai, setEditThai] = useState('');
  const [editImg, setEditImg] = useState('');
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const fileInputRef = useRef(null);

  const lowGraphics = false;

  const levels = ['All', 'Learning', 'Hard', 'Normal', 'Easy', 'Mastered'];

  const filteredVocab = useMemo(() => {
    return vocab.filter(item => {
      const matchesSearch = item.word?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterLevel === 'All' || item.srsLevel === filterLevel;
      return matchesSearch && matchesFilter;
    });
  }, [vocab, searchTerm, filterLevel]);

  const parseMeaning = (card) => {
    try {
      if (typeof card.meaning === 'object') return card.meaning;
      return JSON.parse(card.meaning);
    } catch {
      return { 
        englishExplanation: { definition: '' }, 
        thaiTranslation: { word: card.meaning || '' } 
      };
    }
  };

  const openCard = (card) => {
    playClickSound();
    const parsed = parseMeaning(card);
    setSelectedCard(card);
    setEditWord(card.word || '');
    setEditDef(parsed?.englishExplanation?.definition || '');
    setEditThai(parsed?.thaiTranslation?.word || (typeof card.meaning === 'string' ? card.meaning : ''));
    setEditImg(card.videoUrl || '');
    setIsEditing(false);
  };

  const closeCard = () => {
    playSwipeSound();
    setSelectedCard(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    playClickSound();
    if (!selectedCard) return;

    const parsed = parseMeaning(selectedCard);
    
    // Deep clone and update parsed meaning safely
    const updatedMeaning = { ...parsed };
    if (!updatedMeaning.englishExplanation) updatedMeaning.englishExplanation = {};
    if (!updatedMeaning.thaiTranslation) updatedMeaning.thaiTranslation = {};
    
    updatedMeaning.englishExplanation.definition = editDef;
    updatedMeaning.thaiTranslation.word = editThai;
    updatedMeaning.word = editWord;

    await updateUserCardOverride(selectedCard.id, {
      customWord: editWord,
      customMeaning: updatedMeaning,
      customVideoUrl: editImg
    });

    playSuccessSound();
    setIsEditing(false);
    setSelectedCard({
      ...selectedCard,
      word: editWord,
      meaning: updatedMeaning,
      videoUrl: editImg
    });
  };

  const handleSearchImageByKeyword = async (keyword) => {
    playClickSound();
    if (!keyword) return;
    setIsGeneratingImg(true);
    try {
      const res = await fetchVocabImage(keyword, 'photo');
      if (res && res.url) {
        setEditImg(res.url);
      }
    } catch (error) {
      console.error("Failed to fetch image by keyword:", error);
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleRegenerateAIDetails = async () => {
    playClickSound();
    if (!editWord) return;
    setIsGeneratingDetails(true);
    try {
      // Force AI validation and generation bypass cache
      const newDetails = await getAiWordRichDetails(editWord, true);
      if (newDetails && !newDetails.error) {
        setEditDef(newDetails.englishExplanation?.definition || '');
        setEditThai(newDetails.thaiTranslation?.word || '');
        
        // Find if there is an image in the new details
        const firstImagePrompt = newDetails.imagePrompts?.[0] || editWord;
        const res = await fetchVocabImage(firstImagePrompt, 'photo');
        if (res && res.url) {
          setEditImg(res.url);
        }

        // Update selectedCard preview details on the fly so the lexical connections update instantly
        setSelectedCard(prev => {
          if (!prev) return null;
          return {
            ...prev,
            word: editWord,
            meaning: newDetails,
            videoUrl: res?.url || prev.videoUrl
          };
        });
      }
    } catch (error) {
      console.error("Failed to regenerate AI details:", error);
    } finally {
      setIsGeneratingDetails(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCard) return;
    
    setIsUploadingImg(true);
    
    if (user) {
      const url = await uploadUserCardImage(file, selectedCard.id);
      if (url) {
        setEditImg(url);
      }
    } else {
      const url = URL.createObjectURL(file);
      setEditImg(url);
    }
    
    setIsUploadingImg(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to remove "${selectedCard.word}" from your deck?`)) {
      playSwipeSound();
      deleteWordFromDeck(selectedCard.id);
      closeCard();
    }
  };

  const getSrsColor = (level) => {
    switch(level) {
      case 'Learning': return '#cbd5e1';
      case 'Hard': return '#ef4444';
      case 'Normal': return '#10b981';
      case 'Easy': return '#3b82f6';
      case 'Mastered': return '#eab308';
      default: return '#cbd5e1';
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      boxSizing: 'border-box',
      padding: '20px 16px 104px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <BookOpen color="white" size={20} />
        </div>
        <div>
          <h1 style={{ color: 'white', margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Library</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.8rem' }}>{vocab.length} Words in your deck</p>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
        <input 
          type="text" 
          placeholder="Search words..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%', padding: '14px 16px 14px 44px',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', color: 'white', fontSize: '1rem',
            outline: 'none', boxSizing: 'border-box'
          }}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        overflowX: 'auto', 
        padding: '6px 16px 12px 16px', 
        margin: '0 -16px 4px -16px', 
        WebkitOverflowScrolling: 'touch', 
        scrollbarWidth: 'none',
        flexShrink: 0,
        position: 'relative',
        zIndex: 2
      }}>
        {levels.map(level => (
          <button
            key={level}
            onClick={() => setFilterLevel(level)}
            style={{
              padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap',
              background: filterLevel === level ? (level === 'All' ? 'rgba(167, 139, 250, 0.18)' : `${getSrsColor(level)}30`) : 'rgba(255,255,255,0.05)',
              border: `1px solid ${filterLevel === level ? (level === 'All' ? 'rgba(167, 139, 250, 0.5)' : getSrsColor(level)) : 'rgba(255,255,255,0.1)'}`,
              color: filterLevel === level ? (level === 'All' ? '#c084fc' : getSrsColor(level)) : 'rgba(255,255,255,0.6)',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {level}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px', paddingBottom: '24px' }}>
        {filteredVocab.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <SearchX size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p>No words found.</p>
          </div>
        ) : (
          filteredVocab.map((card) => {
            const parsed = parseMeaning(card);
            const thaiWord = parsed?.thaiTranslation?.word || 'Unknown';
            return (
              <motion.div 
                key={card.id}
                onClick={() => openCard(card)}
                whileHover={{ scale: 1.015, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.12)' }}
                whileTap={{ scale: 0.99 }}
                style={{
                  background: 'rgba(15, 18, 24, 0.45)', 
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px', 
                  padding: '12px', 
                  display: 'flex', 
                  gap: '16px',
                  alignItems: 'center', 
                  cursor: 'pointer', 
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  transition: 'border-color 0.2s, background-color 0.2s',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                }}
              >
                <div style={{ 
                  width: '60px', height: '60px', borderRadius: '10px', overflow: 'hidden',
                  background: 'rgba(0,0,0,0.5)', flexShrink: 0
                }}>
                  {card.videoUrl ? (
                    <img src={card.videoUrl} alt={card.word} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <SafeImage keyword={card.word} alt={card.word} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <h3 style={{ color: 'white', margin: 0, fontSize: '1.1rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {card.word}
                    </h3>
                    <div style={{ 
                      padding: '3px 8px',
                      borderRadius: '8px',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      background: `${getSrsColor(card.srsLevel)}16`,
                      border: `1px solid ${getSrsColor(card.srsLevel)}35`,
                      color: getSrsColor(card.srsLevel),
                      flexShrink: 0
                    }}>
                      {card.srsLevel}
                    </div>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', margin: '6px 0 0', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {thaiWord}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {createPortal(
        <AnimatePresence>
          {selectedCard && (() => {
            const parsed = parseMeaning(selectedCard);
            const pos = selectedCard.pos || parsed?.pos || '';
            const cefrLevel = parsed?.cefrLevel || '';
            const synonyms = parsed?.synonyms || [];
            const nearWords = parsed?.nearWords || [];
            const wordFamily = parsed?.wordFamily || [];
            return (
              <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCard}
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(5, 5, 8, 0.82)', backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                zIndex: 100000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                boxSizing: 'border-box'
              }}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 18 }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%', maxWidth: '500px', 
                  background: 'rgba(18, 20, 26, 0.95)',
                  borderRadius: '24px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '24px 20px 28px 20px', boxSizing: 'border-box',
                  maxHeight: 'min(82vh, 760px)', overflowY: 'auto',
                  boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: 800 }}>
                    {isEditing ? 'Edit Card' : 'Card Details'}
                  </h2>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {!isEditing && (
                      <button onClick={() => setIsEditing(true)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Edit2 size={16} />
                      </button>
                    )}
                    <button onClick={closeCard} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <div style={{ 
                    width: '100%', height: '220px', borderRadius: '16px', overflow: 'hidden',
                    background: 'rgba(0,0,0,0.5)', position: 'relative', marginBottom: isEditing ? '12px' : '0',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    {editImg ? (
                      <img src={editImg} alt={editWord} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <SafeImage keyword={editWord} alt={editWord} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    
                    {showSearchInput && (
                      <div style={{
                        position: 'absolute',
                        bottom: '10px', left: '10px', right: '10px',
                        background: 'rgba(15, 18, 24, 0.9)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '12px',
                        padding: '8px',
                        display: 'flex', gap: '6px', alignItems: 'center',
                        zIndex: 15
                      }}>
                        <input 
                          type="text" 
                          placeholder="Type image keyword..."
                          id="library-image-search-kw"
                          defaultValue={editWord}
                          autoFocus
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              await handleSearchImageByKeyword(e.target.value);
                              setShowSearchInput(false);
                            }
                          }}
                          style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.06)',
                            border: 'none', borderRadius: '8px',
                            padding: '8px 10px', color: 'white',
                            fontSize: '0.8rem', outline: 'none'
                          }}
                        />
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            const val = document.getElementById("library-image-search-kw")?.value;
                            if (val) {
                              await handleSearchImageByKeyword(val);
                            }
                            setShowSearchInput(false);
                          }}
                          style={{
                            padding: '6px 12px', borderRadius: '8px',
                            fontSize: '0.75rem', fontWeight: 700,
                            background: 'rgba(167, 139, 250, 0.2)',
                            border: '1px solid rgba(167, 139, 250, 0.4)',
                            color: '#c084fc', cursor: 'pointer'
                          }}
                        >
                          Search
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); setShowSearchInput(false); }}
                          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                    
                    {isGeneratingImg && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,8,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '8px', backdropFilter: 'blur(4px)', zIndex: 12 }}>
                        <RefreshCw size={20} className="animate-spin" /> Searching image...
                      </div>
                    )}
                    {isUploadingImg && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,8,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '8px', backdropFilter: 'blur(4px)', zIndex: 12 }}>
                        <RefreshCw size={20} className="animate-spin" /> Uploading...
                      </div>
                    )}
                    {isGeneratingDetails && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,8,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '8px', backdropFilter: 'blur(4px)', zIndex: 12 }}>
                        <RefreshCw size={20} className="animate-spin" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Analyzing word via Gemini...</span>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={(e) => { e.preventDefault(); setShowSearchInput(true); }} disabled={isGeneratingImg || isUploadingImg || isGeneratingDetails} style={{
                          flex: 1, padding: '10px', background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px',
                          color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          transition: 'all 0.2s'
                        }}>
                          <Search size={14} /> Search Photo
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} disabled={isGeneratingImg || isUploadingImg || isGeneratingDetails} style={{
                          flex: 1, padding: '10px', background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px',
                          color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          transition: 'all 0.2s'
                        }}>
                          <Upload size={14} /> Upload
                        </button>
                      </div>
                      
                      <button onClick={handleRegenerateAIDetails} disabled={isGeneratingImg || isUploadingImg || isGeneratingDetails} style={{
                        width: '100%', padding: '10px', background: 'rgba(167, 139, 250, 0.12)',
                        border: '1px solid rgba(167, 139, 250, 0.25)', borderRadius: '12px',
                        color: '#c084fc', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        transition: 'all 0.2s'
                      }}>
                        <RefreshCw size={14} /> Auto Generate Details
                      </button>
                      
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>English Word</label>
                      {!isEditing && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {pos && (
                            <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                              {pos}
                            </span>
                          )}
                          {cefrLevel && (
                            <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                              {cefrLevel}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <input value={editWord} onChange={e => setEditWord(e.target.value)} style={{
                        width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px', color: 'white', fontSize: '1rem', boxSizing: 'border-box', outline: 'none'
                      }} />
                    ) : (
                      <p style={{ margin: 0, color: 'white', fontSize: '1.3rem', fontWeight: 800 }}>{editWord}</p>
                    )}
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Thai Translation</label>
                    {isEditing ? (
                      <input value={editThai} onChange={e => setEditThai(e.target.value)} style={{
                        width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px', color: 'white', fontSize: '1rem', boxSizing: 'border-box', outline: 'none'
                      }} />
                    ) : (
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '1rem', fontWeight: 500 }}>{editThai}</p>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>English Definition</label>
                    {isEditing ? (
                      <textarea value={editDef} onChange={e => setEditDef(e.target.value)} rows={3} style={{
                        width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px', color: 'white', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical', outline: 'none'
                      }} />
                    ) : (
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', lineHeight: 1.6 }}>{editDef}</p>
                    )}
                  </div>
                </div>

                {!isEditing && (synonyms.length > 0 || nearWords.length > 0 || wordFamily.length > 0) && (
                  <div style={{
                    marginBottom: '32px',
                    padding: '16px',
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}>
                    <h4 style={{ margin: 0, color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Word Connections
                    </h4>
                    
                    {synonyms.length > 0 && (
                      <div>
                        <span style={{ display: 'block', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Synonyms</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {synonyms.map((s, idx) => (
                            <span key={idx} style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', color: '#818cf8', background: 'rgba(129, 140, 248, 0.1)', border: '1px solid rgba(129, 140, 248, 0.25)' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {nearWords.length > 0 && (
                      <div>
                        <span style={{ display: 'block', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Related Words</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {nearWords.map((nw, idx) => (
                            <span key={idx} style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.25)' }}>
                              {nw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {wordFamily.length > 0 && (
                      <div>
                        <span style={{ display: 'block', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Word Family</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {wordFamily.map((wf, idx) => (
                            <span key={idx} style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                              {wf}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isEditing ? (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setIsEditing(false)} style={{
                      flex: 1, padding: '14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '14px', color: 'white', fontWeight: 700, cursor: 'pointer'
                    }}>Cancel</button>
                    <button onClick={handleSave} style={{
                      flex: 2, padding: '14px', background: '#eab308', border: 'none',
                      borderRadius: '14px', color: 'black', fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}>
                      <Save size={18} /> Save Changes
                    </button>
                  </div>
                ) : (
                  <button onClick={handleDelete} style={{
                    width: '100%', padding: '14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '14px', color: '#f87171', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}>
                    <Trash2 size={18} /> Remove from Deck
                  </button>
                )}
              </motion.div>
            </motion.div>
            );
          })()}
        </AnimatePresence>,
        document.getElementById('root') || document.body
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
