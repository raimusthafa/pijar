export type Locale = 'id' | 'en';
export const LOCALES: readonly Locale[] = ['id', 'en'];
export const DEFAULT_LOCALE: Locale = 'id';
export const LOCALE_COOKIE = 'pj-locale';

/** Both languages must have exactly the same keys: the type check fails if `en` misses one. */
export function defineMessages<T extends Record<string, string>>(m: {
  id: T;
  en: Record<keyof T, string>;
}) {
  return m;
}
