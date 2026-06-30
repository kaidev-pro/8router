// 8Router — i18n Locale Detection
// Priority: query param > cookie > Accept-Language > default

import type { Request, Response } from 'express';

export type Locale = 'en' | 'id' | 'ja';
export const SUPPORTED_LOCALES: Locale[] = ['en', 'id', 'ja'];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = '8router_locale';
export const LOCALE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Detect locale from request with priority chain
 */
export function getLocale(req: Request, defaultLocale: Locale = DEFAULT_LOCALE): Locale {
  // 1. Query param ?lang=id
  const queryLang = req.query.lang as string;
  if (queryLang && isValidLocale(queryLang)) {
    return queryLang;
  }

  // 2. Cookie: 8router_locale
  const cookies = parseCookies(req.headers.cookie || '');
  const cookieLang = cookies[LOCALE_COOKIE];
  if (cookieLang && isValidLocale(cookieLang)) {
    return cookieLang;
  }

  // 3. Accept-Language header
  const acceptLang = req.headers['accept-language'];
  if (acceptLang) {
    const detected = parseAcceptLanguage(acceptLang);
    if (detected) return detected;
  }

  // 4. Default
  return defaultLocale;
}

/**
 * Set locale cookie on response
 */
export function setLocaleCookie(res: Response, locale: Locale): void {
  res.setHeader('Set-Cookie',
    `${LOCALE_COOKIE}=${locale}; Path=/; SameSite=Lax; Max-Age=${LOCALE_MAX_AGE}`
  );
}

/**
 * Validate locale string
 */
export function isValidLocale(lang: string): lang is Locale {
  return SUPPORTED_LOCALES.includes(lang as Locale);
}

/**
 * Parse Accept-Language header and find best match
 */
function parseAcceptLanguage(header: string): Locale | null {
  const languages = header
    .split(',')
    .map(part => {
      const [lang, q] = part.trim().split(';q=');
      return { lang: lang.trim().toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of languages) {
    // Exact match: "id", "ja", "en"
    if (isValidLocale(lang)) return lang;

    // Prefix match: "id-ID" → "id", "ja-JP" → "ja"
    const prefix = lang.split('-')[0];
    if (prefix && isValidLocale(prefix)) return prefix;
  }

  return null;
}

/**
 * Parse cookies from header string
 */
function parseCookies(header: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const pair of header.split(';')) {
    const [name, ...rest] = pair.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  }
  return cookies;
}
