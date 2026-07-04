import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { fetchVocabImage } from '../utils/imageHelper';

export const SafeImage = ({ keyword, alt, style, mode = 'photo' }) => {
  const [imgSrc, setImgSrc] = useState('');
  const [isLoading, setIsLoading] = useState(true);  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!keyword) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setHasError(false);

    fetchVocabImage(keyword, mode).then(res => {
      if (active) {
        if (res.url) {
          setImgSrc(res.url);        } else {
          setHasError(true);
        }
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [keyword, mode]);

  if (hasError || !imgSrc) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'rgba(255, 255, 255, 0.02)', 
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '10px',
        color: 'rgba(255, 255, 255, 0.25)',
        fontSize: '0.6rem',
        gap: '0.2rem',
        ...style
      }}>
        <Sparkles size={14} color="rgba(255, 255, 255, 0.35)" className="pulse" />
        <span style={{ fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '0.5rem' }}>Visual Context</span>
      </div>
    );
  }


  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: '10px' }}>
      {isLoading && (
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: 'rgba(255, 255, 255, 0.02)',
          zIndex: 1
        }}>
          <Loader2 size={14} className="spin" color="rgba(255, 255, 255, 0.3)" />
        </div>
      )}
      <img 
        src={imgSrc} 
        alt={alt} 
        draggable="false"
        style={{ 
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          userSelect: 'none',
          pointerEvents: 'none',
          ...style,
          display: isLoading ? 'none' : 'block' 
        }} 
        onLoad={() => setIsLoading(false)}
        onError={() => setHasError(true)} 
      />
      
    </div>
  );
};
