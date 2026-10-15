export const READER_SIZES = [100, 112.5, 125, 137.5, 150] as const;
export const READER_THEMES = ['light', 'sepia', 'dark'] as const;
export type ReaderTheme = (typeof READER_THEMES)[number];
export type ReaderPrefs = { size: number; theme: ReaderTheme };

export const READER_STORAGE_KEY = 'pijar.reader';
export const DEFAULT_READER_PREFS: ReaderPrefs = { size: 100, theme: 'light' };

/** Stored prefs are untrusted: anything off-list falls back to the default for that field. */
export function parseReaderPrefs(raw: string | null): ReaderPrefs {
  try {
    const v = raw ? JSON.parse(raw) : null;
    return {
      size: READER_SIZES.includes(v?.size) ? v.size : DEFAULT_READER_PREFS.size,
      theme: READER_THEMES.includes(v?.theme) ? v.theme : DEFAULT_READER_PREFS.theme,
    };
  } catch {
    return DEFAULT_READER_PREFS;
  }
}
