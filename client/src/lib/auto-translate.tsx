import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'de' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translationCache: Record<string, string> = {};

async function translateText(text: string, targetLang: Language): Promise<string> {
  if (targetLang === 'de') return text;
  
  const cacheKey = `${text}_${targetLang}`;
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang })
    });

    const data = await response.json();
    const translated = data.translatedText;
    
    translationCache[cacheKey] = translated;
    return translated;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('aras-language');
    return (saved === 'de' || saved === 'en') ? saved : 'de';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('aras-language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

export function T({ children }: { children: string }) {
  const { language } = useLanguage();
  const [translatedText, setTranslatedText] = useState(children);

  useEffect(() => {
    if (language === 'de') {
      setTranslatedText(children);
      return;
    }

    translateText(children, language).then(setTranslatedText);
  }, [children, language]);

  return <>{translatedText}</>;
}
