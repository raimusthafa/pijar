// ================================================================
// PIJAR - Video Narration Caption Distributor
// Divides narration text into synchronized subtitles matching spoken pacing.
// ================================================================

export interface DistributedCaption {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

/**
 * Distributes narration text into synchronized subtitles based on sentence boundaries,
 * punctuation pauses (+8 weight per punctuation), and character lengths.
 */
export function distributeCaptions(
  narrationText: string,
  totalDurationSeconds: number,
): DistributedCaption[] {
  const clean = narrationText.trim();
  if (!clean || totalDurationSeconds <= 0) return [];

  // Split on sentence terminators: . ? ! :
  const rawSentences = clean.split(/(?<=[.?!:])\s+/).map((s) => s.trim()).filter(Boolean);
  const chunks: string[] = [];

  for (const s of rawSentences) {
    if (s.length <= 90) {
      chunks.push(s);
    } else {
      // Split long clauses on commas or semicolons
      const parts = s.split(/(?<=[,;])\s+/).map((p) => p.trim()).filter(Boolean);
      let buf = '';
      for (const p of parts) {
        if (buf && (buf + ' ' + p).length > 90) {
          chunks.push(buf);
          buf = p;
        } else {
          buf = buf ? `${buf} ${p}` : p;
        }
      }
      if (buf) chunks.push(buf);
    }
  }

  if (chunks.length === 0) {
    return [{ startSeconds: 0, endSeconds: Math.round(totalDurationSeconds * 100) / 100, text: clean }];
  }

  // Weight: char count + 8 per punctuation mark
  const weights = chunks.map((c) => {
    const punct = (c.match(/[.,!?:;]/g) || []).length;
    return Math.max(1, c.length + punct * 8);
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let current = 0;
  return chunks.map((text, i) => {
    const startSeconds = Number(current.toFixed(2));
    const isLast = i === chunks.length - 1;
    const dur = (weights[i] / totalWeight) * totalDurationSeconds;
    const endSeconds = isLast ? Number(totalDurationSeconds.toFixed(2)) : Number((current + dur).toFixed(2));
    current += dur;
    return { startSeconds, endSeconds, text };
  });
}
