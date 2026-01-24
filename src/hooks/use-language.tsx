import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Language, translations, TranslationKey, getTranslation } from '@/lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('es');

  useEffect(() => {
    // Load language from localStorage on mount
    const savedSettings = localStorage.getItem('astroTrackerSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.language && (settings.language === 'es' || settings.language === 'en')) {
          setLanguageState(settings.language);
        }
      } catch (e) {
        console.error('Error loading language setting:', e);
      }
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    // Save to localStorage
    try {
      const savedSettings = localStorage.getItem('astroTrackerSettings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      settings.language = lang;
      localStorage.setItem('astroTrackerSettings', JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving language setting:', e);
    }
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return getTranslation(language, key);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
