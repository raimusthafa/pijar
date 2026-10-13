'use client';

import { useEffect } from 'react';

/** Keeps <html lang> in step with the locale cookie (the static shell always renders "id"). */
export function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
