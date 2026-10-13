'use client';

import { createContext, useContext, useMemo } from 'react';
import { DEFAULT_LOCALE, type Locale } from './define';
import { createT, type TFunction } from './translate';

const I18nContext = createContext<Locale>(DEFAULT_LOCALE);

/** Mounted once in the root layout with the locale read on the server. */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>;
}

/** const { t, locale } = useT(); */
export function useT(): { t: TFunction; locale: Locale } {
  const locale = useContext(I18nContext);
  return useMemo(() => ({ t: createT(locale), locale }), [locale]);
}
