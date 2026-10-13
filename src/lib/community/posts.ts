// Contract for the community_posts table (RLS: anyone reads, authors insert and update their own).

export const CATEGORIES = ['question', 'insight', 'study_note'] as const;
export type PostCategory = (typeof CATEGORIES)[number];

export interface CommunityPost {
  id: string;
  author_id: string;
  title: string;
  content: string;
  concept_tag: string;
  category: PostCategory | null;
  created_at: string;
}

export const LIMITS = { title: 120, concept: 60, content: 2000 };

export interface PostDraft { title: string; content: string; concept: string; category: PostCategory }

/** Returns the trimmed draft, or null when a required field is empty or too long. */
export function cleanDraft(d: PostDraft): PostDraft | null {
  const out = { ...d, title: d.title.trim(), content: d.content.trim(), concept: d.concept.trim() };
  if (!out.title || !out.content || !out.concept) return null;
  if (out.title.length > LIMITS.title || out.concept.length > LIMITS.concept || out.content.length > LIMITS.content) return null;
  if (!CATEGORIES.includes(out.category)) return null;
  return out;
}

/** True when Postgres or PostgREST says the table does not exist yet (migration not applied). */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205' || /community_posts/.test(error.message ?? '') && /not (find|exist)|does not exist|schema cache/i.test(error.message ?? '');
}
