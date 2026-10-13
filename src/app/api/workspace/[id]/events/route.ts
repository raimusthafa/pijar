import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspace, listEvents, appendEvent, MigrationMissing } from '@/lib/workspace/store';
import { phasePrompt } from '@/lib/workspace/five-e';
import { parseImageDataUrl, buildHistory, MAX_TEXT } from '@/lib/workspace/evidence';
import { streamChatResponse } from '@/lib/ai/provider';

const KINDS = ['chat', 'quiz', 'image', 'canvas'] as const;
const bad = (code: string, status = 400) => NextResponse.json({ code }, { status });

const GUARD = {
  id: 'Pandu dengan pertanyaan, jangan beri jawaban akhir lebih dulu. Jika ada tulisan tangan atau foto, baca dan sebutkan kesalahannya bila ada. Balasan singkat.',
  en: 'Guide with questions, never hand over the final answer first. If there is handwriting or a photo, read it and name the mistake if there is one. Keep replies short.',
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return bad('unauthorized', 401);

  const b = await request.json().catch(() => null);
  if (!b || !KINDS.includes(b.kind)) return bad('bad_request');
  const kind = b.kind as (typeof KINDS)[number];
  const language = b.language === 'en' ? 'en' : 'id';
  const label = typeof b.concept?.label === 'string' ? b.concept.label.slice(0, 200) : '';
  if (!label) return bad('bad_request');
  const text = typeof b.text === 'string' ? b.text.slice(0, MAX_TEXT) : '';

  const isImg = kind === 'image' || kind === 'canvas';
  const img = isImg ? parseImageDataUrl(b.imageDataUrl) : null;
  if (isImg && !img) return bad('invalid_image');

  let content = text;
  let meta: Record<string, unknown> = {};
  if (kind === 'quiz') {
    const q = b.quizAnswer;
    if (!q || typeof q.questionId !== 'string' || typeof q.correct !== 'boolean' || !(typeof q.selected === 'number' || typeof q.selected === 'string')) return bad('bad_request');
    meta = { questionId: q.questionId.slice(0, 200), selected: q.selected, correct: q.correct };
    content = text || (language === 'en'
      ? `I answered a quiz question and it was ${q.correct ? 'correct' : 'wrong'}.`
      : `Saya menjawab soal kuis dan jawabannya ${q.correct ? 'benar' : 'salah'}.`);
  } else if (!content && !img) return bad('bad_request');
  if (img && !content) content = language === 'en' ? 'Please check my work in this picture.' : 'Tolong periksa pekerjaan saya di gambar ini.';

  try {
    const ws = await getWorkspace(s, user.id, id);
    if (!ws) return bad('not_found', 404);

    let image_path: string | null = null;
    if (img) {
      image_path = `${user.id}/${id}/${Date.now()}.${img.ext}`;
      const up = await s.storage.from('evidence').upload(image_path, Buffer.from(img.base64, 'base64'), { contentType: img.mimeType });
      if (up.error) return bad('upload_failed', 500);
    }

    const userEvent = await appendEvent(s, user.id, id, { kind, role: 'user', content, image_path, meta });
    const history = buildHistory(await listEvents(s, user.id, id), 12);
    const system = `${phasePrompt(ws.phase, { concept: label, language })}\n${GUARD[language]}`;

    const stream = await streamChatResponse(history, system, img ? [{ mimeType: img.mimeType, base64: img.base64 }] : undefined);
    const enc = new TextEncoder();
    const reader = stream.getReader();
    let reply = '';
    const out = new ReadableStream<Uint8Array>({
      async pull(ctrl) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            if (reply) await appendEvent(s, user.id, id, { kind: 'chat', role: 'assistant', content: reply }).catch(() => {});
            ctrl.close();
            return;
          }
          reply += value;
          ctrl.enqueue(enc.encode(value));
        } catch (e) { ctrl.error(e); }
      },
      cancel() { reader.cancel().catch(() => {}); },
    });
    return new Response(out, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'x-event-id': userEvent.id, 'x-phase': ws.phase },
    });
  } catch (e) {
    if (e instanceof MigrationMissing) return bad('migration_missing', 503);
    console.error('workspace event failed:', e instanceof Error ? e.message.slice(0, 200) : 'unknown');
    return bad('error', 500);
  }
}
