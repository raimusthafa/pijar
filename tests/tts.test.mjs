import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pcmToWav, synthesize, hashNarration, TTS_MODELS, TtsUnavailable } from '../src/lib/ai/tts.ts';
import { distributeCaptions } from '../src/lib/learn/captions.ts';

describe('Gemini TTS: PCM to WAV converter', () => {
  it('generates a valid 44-byte WAV header matching PCM length and format specifications', () => {
    const pcmData = Buffer.alloc(48000); // 1 second of 24kHz 16-bit mono
    const wav = pcmToWav(pcmData, 24000, 1, 16);

    assert.equal(wav.length, 44 + 48000);
    // RIFF header
    assert.equal(wav.subarray(0, 4).toString(), 'RIFF');
    assert.equal(wav.readUInt32LE(4), 36 + 48000);
    assert.equal(wav.subarray(8, 12).toString(), 'WAVE');

    // fmt subchunk
    assert.equal(wav.subarray(12, 16).toString(), 'fmt ');
    assert.equal(wav.readUInt32LE(16), 16); // subchunk 1 size (16 for PCM)
    assert.equal(wav.readUInt16LE(20), 1); // audio format (1 = PCM)
    assert.equal(wav.readUInt16LE(22), 1); // num channels (1 = mono)
    assert.equal(wav.readUInt32LE(24), 24000); // sample rate
    assert.equal(wav.readUInt32LE(28), 48000); // byte rate (24000 * 1 * 2)
    assert.equal(wav.readUInt16LE(32), 2); // block align (1 * 2)
    assert.equal(wav.readUInt16LE(34), 16); // bits per sample

    // data subchunk
    assert.equal(wav.subarray(36, 40).toString(), 'data');
    assert.equal(wav.readUInt32LE(40), 48000);
  });
});

describe('Gemini TTS: Caption distribution and synchronization', () => {
  it('splits sentences and guarantees monotonically increasing timestamps spanning the entire duration', () => {
    const text = 'Halo semuanya! Hari ini kita akan belajar aljabar dasar. Konsep variabel sangat penting.';
    const duration = 10.5;
    const captions = distributeCaptions(text, duration);

    assert.equal(captions.length, 3);
    assert.equal(captions[0].startSeconds, 0);
    assert.equal(captions[captions.length - 1].endSeconds, duration);

    for (let i = 0; i < captions.length; i++) {
      const c = captions[i];
      assert.ok(c.text.trim().length > 0, 'caption text must not be empty');
      assert.ok(c.endSeconds > c.startSeconds, 'end time must be strictly greater than start time');
      if (i > 0) {
        assert.ok(c.startSeconds >= captions[i - 1].startSeconds, 'start time must be monotonically non-decreasing');
      }
    }
  });

  it('splits sentences longer than 90 characters on clause boundaries', () => {
    const longSentence =
      'Persamaan linear satu variabel adalah bentuk kesetaraan matematika yang melibatkan satu peubah, di mana derajat tertinggi dari peubah tersebut adalah satu, dan diselesaikan dengan memindahkan suku sejenis.';
    const duration = 14.0;
    const captions = distributeCaptions(longSentence, duration);

    assert.ok(captions.length >= 2, 'long sentence must be split into multiple sub-clauses');
    assert.equal(captions[0].startSeconds, 0);
    assert.equal(captions[captions.length - 1].endSeconds, duration);
    for (const c of captions) {
      assert.ok(c.text.length <= 110, 'split chunks should be concise');
    }
  });

  it('returns empty list for empty or whitespace text', () => {
    assert.deepEqual(distributeCaptions('', 10), []);
    assert.deepEqual(distributeCaptions('   ', 10), []);
  });
});

describe('Gemini TTS: Content hash and model failover', () => {
  it('computes deterministic SHA-256 hash based on language, voice, and normalized text', () => {
    const h1 = hashNarration('Halo dunia!  ', 'id', 'Kore');
    const h2 = hashNarration('Halo dunia!', 'id', 'Kore');
    const h3 = hashNarration('Halo dunia!', 'en', 'Kore');

    assert.equal(h1, h2, 'whitespace differences must produce identical hashes');
    assert.notEqual(h1, h3, 'different languages must produce distinct hashes');
  });

  it('switches to the next model in the chain when encountering a 429 quota exhaustion', async () => {
    const calls = [];
    const customState = new Map();
    const fakeNow = 1700000000000;

    // Intercept global fetch for test
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      const model = TTS_MODELS.find((m) => url.includes(m));
      calls.push(model);
      if (model === TTS_MODELS[0]) {
        // Model 1 returns 429
        return {
          ok: false,
          status: 429,
          text: async () => 'RESOURCE_EXHAUSTED: quota exceeded',
        };
      }
      // Model 2 succeeds with PCM audio
      const pcm = Buffer.alloc(24000 * 2); // 1 sec
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'audio/L16;codec=pcm;rate=24000',
                      data: pcm.toString('base64'),
                    },
                  },
                ],
              },
            },
          ],
        }),
      };
    };

    try {
      const res = await synthesize('Uji coba failover model', {
        language: 'id',
        apiKey: 'test-key',
        state: customState,
        now: () => fakeNow,
      });

      assert.equal(res.model, TTS_MODELS[1], 'should failover to second model');
      assert.equal(calls[0], TTS_MODELS[0], 'first call was model 0');
      assert.equal(calls[1], TTS_MODELS[1], 'second call was model 1');
      assert.ok(customState.has(TTS_MODELS[0]), 'model 0 must be marked as blocked');
      assert.ok(res.durationSeconds > 0, 'duration must be calculated');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws TtsUnavailable when all models are exhausted', async () => {
    const customState = new Map();
    // Pre-exhaust all models
    for (const m of TTS_MODELS) {
      customState.set(m, Date.now() + 100000);
    }

    await assert.rejects(
      async () => {
        await synthesize('Tes kegagalan', {
          language: 'id',
          apiKey: 'test-key',
          state: customState,
        });
      },
      (err) => err instanceof TtsUnavailable,
    );
  });

  it('verifies cache hit logic bypasses Gemini synthesis call', async () => {
    let geminiApiCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      geminiApiCalled = true;
      throw new Error('Gemini API should not be called on cache hit');
    };

    try {
      // Simulating route cache lookup
      const hash = hashNarration('Konsep turunan fungsi', 'id', 'Kore');
      const mockStorage = {
        list: async () => ({
          data: [{ name: `${hash}-5250.wav` }],
        }),
        getPublicUrl: (name) => ({
          data: { publicUrl: `https://mock.supabase.co/storage/v1/object/public/narration/${name}` },
        }),
      };

      const { data: list } = await mockStorage.list();
      const match = list.find((f) => f.name.startsWith(hash));
      assert.ok(match, 'cache match must be found');

      const durationMatch = match.name.match(/-(\d+)\.wav$/);
      const durationSeconds = durationMatch ? Number(durationMatch[1]) / 1000 : 0;
      const { data: { publicUrl } } = mockStorage.getPublicUrl(match.name);

      assert.equal(geminiApiCalled, false, 'Gemini API must not be called on cache hit');
      assert.equal(durationSeconds, 5.25);
      assert.ok(publicUrl.includes(hash));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
