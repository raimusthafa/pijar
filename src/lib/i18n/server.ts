import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, type Locale } from './define';
import { createT } from './translate';

/** Server components, route handlers and metadata. Reading the cookie makes the route dynamic. */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return LOCALES.find((l) => l === value) ?? DEFAULT_LOCALE;
}

/** const { t, locale } = await getT(); */
export async function getT() {
  const locale = await getLocale();
  return { t: createT(locale), locale };
}
