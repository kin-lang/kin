/****************************************
 *            Message catalog           *
 *   Load and format error messages     *
 ****************************************/

import en from '../messages/en.json';
import rw from '../messages/rw.json';

export type MessageCode = keyof typeof en;

type MessageTable = Record<string, string>;

const catalogs: Record<string, MessageTable> = {
  en: en as MessageTable,
  rw: rw as MessageTable,
};

/** Active language: KIN_LANG=en switches to English; default is Kinyarwanda. */
export function getLang(): string {
  const raw = (process.env.KIN_LANG || 'rw').toLowerCase();
  if (raw === 'en' || raw.startsWith('en')) return 'en';
  return 'rw';
}

/**
 * Resolve a catalog entry. Missing Kinyarwanda keys fall back to English.
 * Entries that still start with "TODO(rw):" also fall back to English so
 * learners never see a marker in the error output.
 */
export function formatMessage(
  code: string,
  params: Record<string, string | number> = {},
  lang: string = getLang(),
): string {
  const primary = catalogs[lang]?.[code];
  const fallback = catalogs.en?.[code];
  let template = primary ?? fallback ?? code;

  if (lang === 'rw' && template.startsWith('TODO(rw):')) {
    template = fallback ?? template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}
