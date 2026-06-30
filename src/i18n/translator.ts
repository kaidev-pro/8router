// 8Router — i18n Translator
// Loads translation files and provides t(key, locale) function

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Locale } from './locale.js';
import { DEFAULT_LOCALE } from './locale.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type TranslationMap = Record<string, string>;

// Cache loaded translations
const translations: Partial<Record<Locale, TranslationMap>> = {};

/**
 * Load translations for a locale
 */
function loadTranslations(locale: Locale): TranslationMap {
  if (translations[locale]) return translations[locale]!;

  try {
    const filePath = path.join(__dirname, `${locale}.json`);
    const data = readFileSync(filePath, 'utf-8');
    translations[locale] = JSON.parse(data);
    return translations[locale]!;
  } catch {
    // If file missing, return empty (will fallback to en)
    translations[locale] = {};
    return {};
  }
}

/**
 * Translate a key to the given locale with optional parameter substitution
 * Falls back to English if key missing, returns key itself if missing in English too
 */
export function t(key: string, locale: Locale = DEFAULT_LOCALE, params?: Record<string, string | number>): string {
  // Try requested locale first
  const localeMap = loadTranslations(locale);
  let value = localeMap[key];

  // Fallback to English if missing
  if (value === undefined && locale !== DEFAULT_LOCALE) {
    const enMap = loadTranslations(DEFAULT_LOCALE);
    value = enMap[key];
  }

  // Last resort: return the key itself
  if (value === undefined) {
    return key;
  }

  // Parameter substitution: t('hello', 'en', { name: 'Kai' }) → "Hello, Kai!"
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    }
  }

  return value;
}

/**
 * Get all keys for a locale (for validation)
 */
export function getKeys(locale: Locale): string[] {
  return Object.keys(loadTranslations(locale));
}

/**
 * Get missing keys compared to English
 */
export function getMissingKeys(locale: Locale): string[] {
  const enKeys = new Set(getKeys(DEFAULT_LOCALE));
  const localeKeys = new Set(getKeys(locale));
  return [...enKeys].filter(k => !localeKeys.has(k));
}

/**
 * Get total key count for English (canonical)
 */
export function getKeyCount(): number {
  return getKeys(DEFAULT_LOCALE).length;
}
