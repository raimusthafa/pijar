export type LessonLanguage = 'id' | 'en';

export const toLessonLanguage = (v: unknown): LessonLanguage => (v === 'en' ? 'en' : 'id');

/**
 * Cache keys for a generated lesson. Indonesian keeps the original keys so existing rows stay valid;
 * English gets its own memory key and its own stored topic (topic + ' [en]'), so the two never mix.
 */
export function materialCacheKeys(topic: string, nodeId: string, language: LessonLanguage) {
  const en = language === 'en';
  return {
    memoryKey: en ? `${topic}_${nodeId}_en` : `${topic}_${nodeId}`,
    dbTopic: en ? `${topic} [en]` : topic,
    /** Curated materials are Indonesian only. */
    useCurated: !en,
  };
}
