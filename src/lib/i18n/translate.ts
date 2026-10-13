import { messages, type MessageKey } from './messages';
import type { Locale } from './define';

export type TFunction = (key: MessageKey, params?: Record<string, string | number>) => string;

/** A key missing in the active language falls back to Indonesian, then to the key itself (obvious in dev). */
export function createT(locale: Locale): TFunction {
  return (key, params) => {
    const text = messages[locale][key] ?? messages.id[key] ?? key;
    return params ? text.replace(/\{(\w+)\}/g, (m, p) => (p in params ? String(params[p]) : m)) : text;
  };
}
