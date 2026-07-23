import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookmarkPlus,
  Check,
  CircleHelp,
  Library,
  MoreHorizontal,
  Play,
  Search,
  Send,
  Volume2,
} from 'lucide-react';
import { useVocab } from '../context/VocabContext';
import { speakEnglish } from '../utils/speechHelper';

const newMessageId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const getThai = (details) =>
  details?.thaiTranslation?.word ||
  details?.validation?.thaiTranslationShort ||
  'ยังไม่มีคำแปลไทย';

const getDefinition = (details) =>
  details?.englishExplanation?.definition ||
  details?.validation?.englishExplanationShort ||
  'No definition yet.';

export default function LineDemo() {
  const navigate = useNavigate();
  const { getAiWordRichDetails, addWordToDeck } = useVocab();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      type: 'text',
      content:
        'หวัดดี เราไอ้แปร๋ ส่งคำศัพท์อังกฤษมาได้เลย เดี๋ยวแปลให้และเก็บไว้ทวนได้ทันที',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, isTyping]);

  const addMessage = (message) => {
    setMessages((current) => [
      ...current,
      { id: newMessageId(), sender: 'bot', ...message },
    ]);
  };

  const requestWord = async (requestedWord, forceValid = false) => {
    const word = requestedWord.trim();
    if (!word || isTyping) return;

    setIsTyping(true);
    try {
      const details = await getAiWordRichDetails(word, forceValid);
      if (!details || details.error) {
        addMessage({
          type: 'text',
          content: 'ระบบแปลกำลังพัก ลองส่งคำนี้มาอีกครั้งนะ',
        });
        return;
      }

      if (details.validation?.isInvalid && !forceValid) {
        addMessage({
          type: 'suggestion',
          input: word,
          suggestion: details.validation.suggestion,
          thai: details.validation.thaiTranslationShort,
        });
        return;
      }

      addMessage({
        type: 'card',
        details: {
          ...details,
          word: forceValid ? word.toLowerCase() : details.word || word,
          _forcedOriginal: forceValid,
        },
        saved: false,
      });
    } catch (error) {
      console.error('LINE preview lookup failed:', error);
      addMessage({
        type: 'text',
        content: 'ระบบสะดุดนิดหน่อย ลองส่งคำนี้มาอีกครั้งนะ',
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    const word = inputText.trim();
    if (!word || isTyping) return;

    setMessages((current) => [
      ...current,
      {
        id: newMessageId(),
        sender: 'user',
        type: 'text',
        content: word,
      },
    ]);
    setInputText('');
    await requestWord(word);
  };

  const handleSave = async (message) => {
    const details = message.details;
    const result = await addWordToDeck(details.word, details);

    setMessages((current) =>
      current.map((item) =>
        item.id === message.id ? { ...item, saved: result.success } : item,
      ),
    );

    addMessage({
      type: 'text',
      content: result.success
        ? 'เก็บ "' + details.word + '" แล้ว กดเริ่มทวนได้เลย'
        : result.error || 'คำนี้อยู่ในคลังของคุณแล้ว',
    });
  };

  const showHelp = () => {
    addMessage({
      type: 'text',
      content:
        'พิมพ์คำอังกฤษ แล้วกดเก็บคำนี้บนการ์ด จากนั้นกดเริ่มทวนเพื่อเล่นแฟลชการ์ดได้เลย',
    });
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        display: 'grid',
        placeItems: 'center',
        background: '#08090C',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          background: '#161B24',
          color: '#FFFFFF',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            height: 64,
            flex: '0 0 64px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#242B38',
            borderBottom: '1px solid rgba(255,255,255,.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Back"
              style={iconButtonStyle}
            >
              <ArrowLeft size={21} />
            </button>
            <img
              src="/line/ai-prae-mascot-v1.png"
              alt=""
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                objectFit: 'cover',
                objectPosition: '50% 22%',
              }}
            />
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>ไอ้แปร๋</div>
              <div style={{ color: '#AEB5C4', fontSize: 11 }}>
                พิมพ์คำ แปล เก็บ แล้วทวน
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" aria-label="Search" style={iconButtonStyle}>
              <Search size={19} />
            </button>
            <button type="button" aria-label="More" style={iconButtonStyle}>
              <MoreHorizontal size={20} />
            </button>
          </div>
        </header>

        <main
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '18px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div
            style={{
              alignSelf: 'center',
              color: '#8D96A8',
              fontSize: 11,
              marginBottom: 2,
            }}
          >
            LINE preview
          </div>

          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent:
                  message.sender === 'user' ? 'flex-end' : 'flex-start',
                gap: 8,
              }}
            >
              {message.sender === 'bot' && (
                <img
                  src="/line/ai-prae-mascot-v1.png"
                  alt=""
                  style={{
                    width: 34,
                    height: 34,
                    flex: '0 0 34px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    objectPosition: '50% 22%',
                  }}
                />
              )}

              {message.type === 'text' && (
                <div
                  style={{
                    maxWidth: '78%',
                    padding: '10px 13px',
                    borderRadius: 12,
                    borderTopLeftRadius:
                      message.sender === 'bot' ? 3 : 12,
                    borderTopRightRadius:
                      message.sender === 'user' ? 3 : 12,
                    background:
                      message.sender === 'user' ? '#20B65A' : '#F7F7F4',
                    color:
                      message.sender === 'user' ? '#FFFFFF' : '#15161B',
                    fontSize: 14,
                    lineHeight: 1.55,
                  }}
                >
                  {message.content}
                </div>
              )}

              {message.type === 'suggestion' && (
                <section style={cardStyle}>
                  <div style={{ color: '#8D96A8', fontSize: 12 }}>
                    สะกดแบบนี้หรือเปล่า?
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontWeight: 950,
                      fontSize: 26,
                    }}
                  >
                    {message.suggestion}
                  </div>
                  {message.thai && (
                    <div
                      style={{
                        marginTop: 4,
                        color: '#5DE0A3',
                        fontWeight: 800,
                      }}
                    >
                      {message.thai}
                    </div>
                  )}
                  <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => requestWord(message.suggestion)}
                      style={primaryButtonStyle}
                    >
                      ใช่ คำนี้แหละ
                    </button>
                    <button
                      type="button"
                      onClick={() => requestWord(message.input, true)}
                      style={secondaryButtonStyle}
                    >
                      ใช้คำเดิม
                    </button>
                  </div>
                </section>
              )}

              {message.type === 'card' && (
                <section style={cardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 950,
                        fontSize: 27,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {message.details.word}
                    </div>
                    <button
                      type="button"
                      onClick={() => speakEnglish(message.details.word)}
                      aria-label="Play pronunciation"
                      style={roundButtonStyle}
                    >
                      <Volume2 size={17} />
                    </button>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 7,
                      marginTop: 7,
                      color: '#AEB5C4',
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                    }}
                  >
                    <span>{message.details.cefrLevel || '—'}</span>
                    <span>{message.details.pos || 'word'}</span>
                  </div>
                  <div
                    style={{
                      marginTop: 14,
                      color: '#5DE0A3',
                      fontWeight: 900,
                      fontSize: 17,
                    }}
                  >
                    {getThai(message.details)}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      color: '#D6DAE3',
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    {getDefinition(message.details)}
                  </div>
                  {message.details.scenes?.[0]?.dialogue && (
                    <div
                      style={{
                        marginTop: 13,
                        padding: 11,
                        borderRadius: 7,
                        background: '#20232A',
                        color: '#FFFFFF',
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      {message.details.scenes[0].dialogue}
                    </div>
                  )}
                  {message.details._forcedOriginal && (
                    <div
                      style={{
                        marginTop: 12,
                        color: '#F5C842',
                        fontSize: 11,
                        lineHeight: 1.45,
                      }}
                    >
                      คำนี้อาจสะกดไม่มาตรฐาน แต่บันทึกตามที่ยืนยัน
                    </div>
                  )}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      marginTop: 16,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSave(message)}
                      disabled={message.saved}
                      style={{
                        ...primaryButtonStyle,
                        background: message.saved ? '#264D3C' : '#2DAA73',
                        color: message.saved ? '#82D8B1' : '#FFFFFF',
                      }}
                    >
                      {message.saved ? (
                        <Check size={16} />
                      ) : (
                        <BookmarkPlus size={16} />
                      )}
                      {message.saved ? 'เก็บแล้ว' : 'เก็บคำนี้'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/purge')}
                      style={secondaryButtonStyle}
                    >
                      <Play size={16} fill="currentColor" />
                      เริ่มทวน
                    </button>
                  </div>
                </section>
              )}
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <img
                src="/line/ai-prae-mascot-v1.png"
                alt=""
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  objectPosition: '50% 22%',
                }}
              />
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  borderTopLeftRadius: 3,
                  background: '#F7F7F4',
                  color: '#586173',
                  fontSize: 13,
                }}
              >
                กำลังหาคำให้...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </main>

        <div
          style={{
            flex: '0 0 auto',
            padding: '9px 10px',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: '#F1F2F4',
          }}
        >
          <input
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSend();
            }}
            placeholder="พิมพ์คำศัพท์อังกฤษ"
            maxLength={80}
            style={{
              flex: 1,
              minWidth: 0,
              height: 40,
              padding: '0 15px',
              border: '1px solid #D3D7DE',
              borderRadius: 20,
              outline: 'none',
              fontSize: 14,
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isTyping || !inputText.trim()}
            aria-label="Send"
            style={{
              width: 40,
              height: 40,
              display: 'grid',
              placeItems: 'center',
              border: 0,
              borderRadius: '50%',
              background: '#20B65A',
              color: '#FFFFFF',
              opacity: isTyping || !inputText.trim() ? 0.5 : 1,
            }}
          >
            <Send size={18} />
          </button>
        </div>

        <nav
          style={{
            height: 76,
            flex: '0 0 76px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            background: '#0E1015',
            borderTop: '1px solid #292C34',
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/purge')}
            style={menuButtonStyle}
          >
            <Play size={22} fill="currentColor" />
            <span>เริ่มทวน</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/library')}
            style={{ ...menuButtonStyle, color: '#5DE0A3' }}
          >
            <Library size={22} />
            <span>คลังของฉัน</span>
          </button>
          <button
            type="button"
            onClick={showHelp}
            style={{ ...menuButtonStyle, color: '#B69CFF' }}
          >
            <CircleHelp size={22} />
            <span>วิธีใช้</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

const iconButtonStyle = {
  width: 34,
  height: 34,
  display: 'grid',
  placeItems: 'center',
  padding: 0,
  border: 0,
  borderRadius: '50%',
  background: 'transparent',
  color: '#FFFFFF',
  cursor: 'pointer',
};

const roundButtonStyle = {
  width: 34,
  height: 34,
  flex: '0 0 34px',
  display: 'grid',
  placeItems: 'center',
  padding: 0,
  border: '1px solid #353944',
  borderRadius: '50%',
  background: '#20232A',
  color: '#D6DAE3',
  cursor: 'pointer',
};

const cardStyle = {
  width: 'min(315px, calc(100vw - 70px))',
  padding: 16,
  border: '1px solid #30333C',
  borderRadius: 8,
  background: '#15161B',
  color: '#FFFFFF',
  boxShadow: '0 8px 22px rgba(0,0,0,.22)',
};

const primaryButtonStyle = {
  minHeight: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '9px 12px',
  border: 0,
  borderRadius: 7,
  background: '#2DAA73',
  color: '#FFFFFF',
  fontWeight: 900,
  cursor: 'pointer',
};

const secondaryButtonStyle = {
  minHeight: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '9px 12px',
  border: '1px solid #3A3E49',
  borderRadius: 7,
  background: '#20232A',
  color: '#FFFFFF',
  fontWeight: 900,
  cursor: 'pointer',
};

const menuButtonStyle = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  border: 0,
  background: 'transparent',
  color: '#F5C842',
  fontSize: 11,
  fontWeight: 900,
  cursor: 'pointer',
};
