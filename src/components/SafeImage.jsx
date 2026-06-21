import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { fetchVocabImage } from '../utils/imageHelper';

export const SafeImage = ({ keyword, alt, style, mode = 'photo' }) => {
  const [imgSrc, setImgSrc] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sourceLabel, setSourceLabel] = useState('');
  const [hasError, setHasError] = useState(false);

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
          setImgSrc(res.url);
          setSourceLabel(res.source);
        } else {
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

  const getBadgeColor = (label) => {
    switch (label?.toUpperCase()) {
      case 'PEXELS': return '#10b981'; // Emerald/Green
      case 'PIXABAY': return '#3b82f6'; // Blue
      case 'WIKIMEDIA': return '#8b5cf6'; // Violet
      case 'HUGGINGFACE AI':
      case 'TOGETHER AI':
      case 'AI': return '#ec4899'; // Pink
      case 'GIPHY': return '#f43f5e'; // Rose
      default: return '#f59e0b'; // Amber (Flickr/Openverse)
    }
  };

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
      
      {/* Dev image source badge overlay */}
      {sourceLabel && !isLoading && (
        <div style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          background: 'rgba(10, 8, 20, 0.65)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '5px',
          padding: '0.1rem 0.35rem',
          color: getBadgeColor(sourceLabel),
          fontSize: '0.55rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          pointerEvents: 'none',
          boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
          zIndex: 10
        }}>
          {sourceLabel}
        </div>
      )}
    </div>
  );
};
