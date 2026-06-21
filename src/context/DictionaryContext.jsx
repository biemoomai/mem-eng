import React, { createContext, useState, useContext } from 'react';

const DictionaryContext = createContext();

export const useDictionary = () => useContext(DictionaryContext);

export const DictionaryProvider = ({ children }) => {
  const [wordHistory, setWordHistory] = useState([]); // Stack of words
  const [isOpen, setIsOpen] = useState(false);

  const lookupWord = (word) => {
    // Clean punctuation from the word before pushing
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (!cleanWord) return;

    setWordHistory(prev => [...prev, cleanWord]);
    setIsOpen(true);
  };

  const goBack = () => {
    setWordHistory(prev => {
      if (prev.length > 1) {
        return prev.slice(0, -1);
      }
      return prev;
    });
  };

  const closeDictionary = () => {
    setIsOpen(false);
    // Slight delay to allow exit animation to finish before clearing
    setTimeout(() => {
      setWordHistory([]);
    }, 300);
  };

  const currentWord = wordHistory.length > 0 ? wordHistory[wordHistory.length - 1] : null;

  return (
    <DictionaryContext.Provider value={{
      isOpen,
      currentWord,
      historyLength: wordHistory.length,
      lookupWord,
      goBack,
      closeDictionary
    }}>
      {children}
    </DictionaryContext.Provider>
  );
};
