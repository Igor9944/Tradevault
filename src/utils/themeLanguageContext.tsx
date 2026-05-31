import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

export type Lang = 'fr' | 'en';

interface ThemeLanguageContextType {
  lang: Lang;
  toggleLang: () => void;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const ThemeLanguageContext = createContext<ThemeLanguageContextType | undefined>(undefined);

export const ThemeLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('tv_lang') as Lang) || 'fr';
  });

  // Language Side Effect
  useEffect(() => {
    localStorage.setItem('tv_lang', lang);
  }, [lang]);

  const toggleLang = () => {
    setLangState(prev => (prev === 'fr' ? 'en' : 'fr'));
  };

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
  };

  const t = (key: string): string => {
    const dict = translations[lang] || translations['fr'];
    return dict[key] || translations['fr'][key] || key;
  };

  return (
    <ThemeLanguageContext.Provider value={{
      lang,
      toggleLang,
      setLang,
      t
    }}>
      {children}
    </ThemeLanguageContext.Provider>
  );
};

export const useThemeLang = () => {
  const context = useContext(ThemeLanguageContext);
  if (!context) {
    throw new Error('useThemeLang must be used within a ThemeLanguageProvider');
  }
  return context;
};
