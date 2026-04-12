import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/i18n';

type Language = 'en' | 'ar';

interface LanguageState {
  language: Language;
  isRTL: boolean;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'en',
      isRTL: false,

      setLanguage: (language) => {
        const isRTL = language === 'ar';
        set({ language, isRTL });
        i18n.changeLanguage(language);
        applyDirection(isRTL);
      },

      toggleLanguage: () => {
        const currentLang = get().language;
        const newLang = currentLang === 'en' ? 'ar' : 'en';
        get().setLanguage(newLang);
      }
    }),
    {
      name: 'cmind-language-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          i18n.changeLanguage(state.language);
          applyDirection(state.isRTL);
        }
      }
    }
  )
);

function applyDirection(isRTL: boolean) {
  const root = window.document.documentElement;
  root.dir = isRTL ? 'rtl' : 'ltr';
  root.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
}
