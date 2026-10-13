import type { Supa, WsEvent } from './store';

/** Adds imageUrl (signed, 1 hour) to events that carry an image_path. */
export async function withSignedUrls(s: Supa, events: WsEvent[]) {
  return Promise.all(events.map(async e => {
    if (!e.image_path) return { ...e, imageUrl: null as string | null };
    const { data } = await s.storage.from('evidence').createSignedUrl(e.image_path, 3600);
    return { ...e, imageUrl: data?.signedUrl ?? null };
  }));
}
