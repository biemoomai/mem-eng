import React, { useState, useRef, useEffect } from 'react';
import { useVocab } from '../context/VocabContext';
import { ArrowLeft, Search, MoreHorizontal, Send, ChevronDown, Volume2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Purge from './Purge';
import { speakEnglish } from '../utils/speechHelper';

export default function LineDemo() {
  const { getAiWordRichDetails, addWordToDeck } = useVocab();
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', type: 'text', content: 'พิมพ์คำศัพท์ภาษาอังกฤษที่อยากแปลมาได้เลยครับ! 😊' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showLiff, setShowLiff] = useState(false);
  const [liffComponent, setLiffComponent] = useState(null);
  
  const endOfMessagesRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    const word = inputText.trim();
    setInputText('');
    
    // Add User Message
    const userMsg = { id: Date.now(), sender: 'user', type: 'text', content: word };
    setMessages(prev => [...prev, userMsg]);
    
    // Show typing
    setIsTyping(true);
    
    try {
      const details = await getAiWordRichDetails(word);
      setIsTyping(false);
      
      if (details.error) {
        setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', type: 'text', content: 'ขออภัยครับ ตอนนี้ระบบแปลมีปัญหา ลองใหม่อีกครั้งนะครับ 😅' }]);
        return;
      }

      // Simulated Flex Message
      const flexMsg = {
        id: Date.now(),
        sender: 'bot',
        type: 'flex',
        details: details
      };
      setMessages(prev => [...prev, flexMsg]);

    } catch (err) {
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', type: 'text', content: 'เอ๊ะ ระบบมีปัญหานิดหน่อยครับ' }]);
    }
  };

  const handleAddWord = (details) => {
    addWordToDeck(details);
    setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', type: 'text', content: `เก็บคำว่า "${details.word}" เข้าเด็คเรียบร้อยแล้วครับ! อย่าลืมมากดทบทวนนะ 📚` }]);
  };

  const openLiff = (componentName) => {
    setLiffComponent(componentName);
    setShowLiff(true);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', background: '#e5e5e5', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      
      {/* Mobile Frame Simulator */}
      <div style={{ width: '100%', maxWidth: '400px', background: '#849ebf', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 0 40px rgba(0,0,0,0.2)' }}>
        
        {/* LINE Header */}
        <div style={{ background: '#273246', color: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ArrowLeft size={24} />
            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Mem-Eng 🤖</div>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Search size={20} />
            <MoreHorizontal size={20} />
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#ffffff99', marginBottom: '8px' }}>Today</div>
          
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
              
              {msg.sender === 'bot' && (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#11141c', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px', flexShrink: 0, border: '2px solid #06b6d4' }}>
                  🤖
                </div>
              )}

              {msg.type === 'text' && (
                <div style={{
                  background: msg.sender === 'user' ? '#00c300' : 'white',
                  color: msg.sender === 'user' ? 'white' : 'black',
                  padding: '10px 14px',
                  borderRadius: '16px',
                  borderTopRightRadius: msg.sender === 'user' ? '4px' : '16px',
                  borderTopLeftRadius: msg.sender === 'bot' ? '4px' : '16px',
                  maxWidth: '75%',
                  fontSize: '0.95rem',
                  lineHeight: '1.4',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {msg.content}
                </div>
              )}

              {msg.type === 'flex' && (
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  maxWidth: '85%',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}>
                  <div style={{ background: '#06b6d4', padding: '12px', color: 'white' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, textTransform: 'capitalize' }}>{msg.details.word}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{msg.details.pos}</div>
                  </div>
                  
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.9rem', color: '#333' }}>
                      <strong style={{ color: '#06b6d4' }}>แปล:</strong> {msg.details.thaiTranslation?.word || msg.details.validation?.thaiTranslationShort}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#555', fontStyle: 'italic' }}>
                      "{msg.details.englishExplanation?.definition || msg.details.validation?.englishExplanationShort}"
                    </div>

                    {msg.details.scenes?.[0] && (
                      <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', marginTop: '4px' }}>
                        <div><strong>EX:</strong> {msg.details.scenes[0].dialogue}</div>
                        <div style={{ color: '#64748b', marginTop: '4px' }}>{msg.details.scenes[0].meaning}</div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', borderTop: '1px solid #e2e8f0' }}>
                    <button 
                      onClick={() => speakEnglish(msg.details.word)}
                      style={{ flex: 1, padding: '12px', background: 'white', border: 'none', borderRight: '1px solid #e2e8f0', color: '#3b82f6', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    >
                      <Volume2 size={16} /> ฟังเสียง
                    </button>
                    <button 
                      onClick={() => handleAddWord(msg.details)}
                      style={{ flex: 1, padding: '12px', background: 'white', border: 'none', color: '#10b981', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    >
                      <Plus size={16} /> เก็บเข้าเด็ค
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#11141c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</div>
              <div style={{ background: 'white', padding: '10px 14px', borderRadius: '16px', display: 'flex', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', background: '#ccc', borderRadius: '50%', animation: 'pulse 1s infinite' }}></span>
                <span style={{ width: '6px', height: '6px', background: '#ccc', borderRadius: '50%', animation: 'pulse 1s infinite 0.2s' }}></span>
                <span style={{ width: '6px', height: '6px', background: '#ccc', borderRadius: '50%', animation: 'pulse 1s infinite 0.4s' }}></span>
              </div>
            </div>
          )}
          
          <div ref={endOfMessagesRef} />
        </div>

        {/* Input Bar */}
        <div style={{ background: '#f8f8f8', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button style={{ background: 'none', border: 'none', color: '#888' }}><Plus size={24} /></button>
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="พิมพ์ศัพท์..." 
            style={{ flex: 1, padding: '10px 16px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none', fontSize: '0.95rem' }}
          />
          <button onClick={handleSend} style={{ background: '#00c300', border: 'none', color: 'white', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Send size={18} />
          </button>
        </div>

        {/* Rich Menu Simulator */}
        <div style={{ height: '70px', background: '#ffffff', borderTop: '1px solid #eee', display: 'flex' }}>
          <button 
            onClick={() => openLiff('flashcards')}
            style={{ flex: 1, border: 'none', borderRight: '1px solid #eee', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', color: '#333' }}
          >
            <div style={{ fontSize: '1.5rem' }}>📚</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Flashcards</div>
          </button>
          <button 
            style={{ flex: 1, border: 'none', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', color: '#333' }}
          >
            <div style={{ fontSize: '1.5rem' }}>🏆</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Ranking</div>
          </button>
        </div>
        
        {/* Simulated LIFF Webview Modal */}
        <AnimatePresence>
          {showLiff && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#11141c', zIndex: 50, display: 'flex', flexDirection: 'column' }}
            >
              {/* LIFF Header Overlay - Floating above everything */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', color: 'black', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 99999, borderBottom: '1px solid #ddd', boxSizing: 'border-box' }}>
                <button onClick={() => setShowLiff(false)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 0 }}>
                  <ChevronDown size={24} /> <span style={{ fontSize: '0.9rem', fontWeight: 600, marginLeft: '4px' }}>Close</span>
                </button>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#666' }}>Mem-Eng Web</div>
                <div style={{ width: '24px' }}></div>
              </div>
              
              {/* Load actual app component inside the LIFF modal */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden', paddingTop: '50px' }}>
                {liffComponent === 'flashcards' && <Purge />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
