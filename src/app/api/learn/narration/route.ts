import { NextResponse } from 'next/server';
import { DEFAULT_VOICE, hashNarration, synthesize, TtsUnavailable } from '@/lib/ai/tts';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, language = 'id' } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Parameter text wajib diisi' }, { status: 400 });
    }

    if (text.length > 800) {
      return NextResponse.json(
        { error: 'Teks terlalu panjang (maksimal 800 karakter)' },
        { status: 400 },
      );
    }

    const lang: 'id' | 'en' = language === 'en' ? 'en' : 'id';
    const hash = hashNarration(text, lang, DEFAULT_VOICE);

    // 1. Check cache in Supabase Storage narration bucket
    try {
      const { data: existingFiles } = await supabase.storage.from('narration').list('', {
        search: hash,
        limit: 5,
      });

      if (existingFiles && existingFiles.length > 0) {
        const match = existingFiles.find((f) => f.name.startsWith(hash));
        if (match) {
          const durationMatch = match.name.match(/-(\d+)\.wav$/);
          const durationSeconds = durationMatch ? Number(durationMatch[1]) / 1000 : 5;
          const {
            data: { publicUrl },
          } = supabase.storage.from('narration').getPublicUrl(match.name);

          return NextResponse.json({
            url: publicUrl,
            durationSeconds,
            cached: true,
          });
        }
      }
    } catch (storageCheckErr) {
      console.warn('Storage cache check warning:', storageCheckErr);
    }

    // 2. Synthesize audio via Gemini TTS
    const result = await synthesize(text, { language: lang, voice: DEFAULT_VOICE });
    const durationMs = Math.round(result.durationSeconds * 1000);
    const fileName = `${hash}-${durationMs}.wav`;

    // 3. Upload to Supabase Storage
    try {
      const { error: uploadError } = await supabase.storage
        .from('narration')
        .upload(fileName, result.wav, {
          contentType: 'audio/wav',
          upsert: true,
        });

      if (uploadError) {
        console.warn('Storage narration upload warning:', uploadError.message);
      }
    } catch (uploadErr) {
      console.warn('Storage upload exception:', uploadErr);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('narration').getPublicUrl(fileName);

    return NextResponse.json({
      url: publicUrl,
      durationSeconds: result.durationSeconds,
      model: result.model,
    });
  } catch (err) {
    if (err instanceof TtsUnavailable) {
      return NextResponse.json(
        { code: 'tts_unavailable', error: err.message },
        { status: 503 },
      );
    }

    console.error('Narration generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
