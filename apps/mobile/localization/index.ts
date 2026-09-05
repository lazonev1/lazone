// App-wide i18n. Import this module once (in app/_layout.tsx) before any screen renders.
// Language resolution: stored user choice > device locale > French.
import 'intl-pluralrules'; // Hermes lacks Intl.PluralRules, which i18next needs for plurals
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import enCommon from './locales/en/common.json';
import enAccount from './locales/en/account.json';
import enAuth from './locales/en/auth.json';
import enBooking from './locales/en/booking.json';
import enExplore from './locales/en/explore.json';
import enMessages from './locales/en/messages.json';
import enProvider from './locales/en/provider.json';
import frCommon from './locales/fr/common.json';
import frAccount from './locales/fr/account.json';
import frAuth from './locales/fr/auth.json';
import frBooking from './locales/fr/booking.json';
import frExplore from './locales/fr/explore.json';
import frMessages from './locales/fr/messages.json';
import frProvider from './locales/fr/provider.json';

export const defaultNS = 'common';

export const resources = {
  en: {
    common: enCommon,
    account: enAccount,
    auth: enAuth,
    booking: enBooking,
    explore: enExplore,
    messages: enMessages,
    provider: enProvider,
  },
  fr: {
    common: frCommon,
    account: frAccount,
    auth: frAuth,
    booking: frBooking,
    explore: frExplore,
    messages: frMessages,
    provider: frProvider,
  },
} as const;

// Native labels on purpose: a language's own name is never translated.
export const SUPPORTED_LANGUAGES = [
  { code: 'fr', nativeLabel: 'Français' },
  { code: 'en', nativeLabel: 'English' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

// Same key the preferences screen was already writing to.
const STORAGE_KEY = 'userLanguage';

export function isSupportedLanguage(code: string | null | undefined): code is LanguageCode {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

function deviceLanguage(): LanguageCode {
  const code = Localization.getLocales()[0]?.languageCode;
  return isSupportedLanguage(code) ? code : 'fr';
}

i18n.use(initReactI18next).init({
  resources,
  defaultNS,
  lng: deviceLanguage(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false }, // React already escapes
});

// Apply the stored user choice once it loads; device locale renders until then.
AsyncStorage.getItem(STORAGE_KEY)
  .then((stored) => {
    if (isSupportedLanguage(stored) && stored !== i18n.language) {
      return i18n.changeLanguage(stored);
    }
  })
  .catch(() => {});

// The one entry point for switching language: updates every mounted useTranslation()
// consumer immediately and persists the choice for the next launch.
export async function setAppLanguage(code: LanguageCode): Promise<void> {
  await i18n.changeLanguage(code);
  AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
}

export default i18n;
