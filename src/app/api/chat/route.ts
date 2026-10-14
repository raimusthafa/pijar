import { NextResponse } from 'next/server';
import { streamChatResponse } from '@/lib/ai/provider';
import { MATH_FORMAT_NOTE } from '@/lib/learn/math-text';
import { createClient } from '@/lib/supabase/server';

// ================================================================
// PIJAR - AI Tutor Streaming Chat Route (F6)
// ================================================================

export async function POST(request: Request) {
  try {
    // 1. Enforce Server-Side Authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Sesi autentikasi diperlukan untuk mengakses AI Tutor.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      messages = [],
      nodeId = 'konsep-dasar',
      conceptTitle = 'Konsep Prasyarat',
      topic = 'Struktur Data & Algoritma',
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Daftar pesan tidak boleh kosong' },
        { status: 400 }
      );
    }

    const systemPrompt = `Kamu adalah Pijar AI Tutor, asisten belajar adaptif berbasis Prerequisite-First Learning.
Konteks materi yang sedang dipelajari siswa:
- Topik Kurikulum: ${topic}
- Konsep Saat Ini: ${conceptTitle} (ID: ${nodeId})

Pedoman Pengajaran:
1. Bersikaplah ramah, empatik, menyemangati, dan menggunakan metode Socratic (membimbing pemikiran siswa).
2. Jika siswa bertanya tentang kesulitan konsep, gunakan analogi dunia nyata dan jelaskan prasyarat logis yang menopang konsep ini.
3. Jika siswa bertanya tentang kuis atau kode, berikan arahan konseptual langkah-demi-langkah, jangan langsung memberi jawaban mentah tanpa penjelasan.
4. Gunakan Bahasa Indonesia yang ringkas, hangat, dan mudah dipahami oleh mahasiswa atau pembelajar teknologi.
5. ${MATH_FORMAT_NOTE}`;

    try {
      const stream = await streamChatResponse(messages, systemPrompt);
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (aiErr) {
      console.warn('AI streaming unavailable, falling back to intelligent tutor simulator:', aiErr);

      // Intelligent simulated streaming fallback
      const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
      let reply = `Halo! Aku di sini mendampingimu mempelajari **${conceptTitle}**.\n\n`;

      if (lastUserMsg.includes('bingung') || lastUserMsg.includes('kenapa') || lastUserMsg.includes('prasyarat')) {
        reply += `Konsep **${conceptTitle}** memang sering menjadi titik kesenjangan (knowledge gap) karena membutuhkan pemahaman mendalam tentang logika alur eksekusi.\n\n` +
          `Kunci utamanya adalah mengingat bahwa setiap konsep rumit selalu tersusun dari prasyarat sederhana. Cobalah membaca ringkasan poin kunci di atas, lalu uji pemahamanmu pada mini checkpoint! Ada bagian spesifik yang ingin kamu tanyakan?`;
      } else if (lastUserMsg.includes('contoh') || lastUserMsg.includes('kode')) {
        reply += `Perhatikan contoh implementasi kode di panel materi. Baris kode tersebut mengilustrasikan kasus dasar (*base case*) dan kondisi transisi. Ketika kamu mengubah inputnya, amati bagaimana alur program bereaksi.`;
      } else {
        reply += `Pertanyaan bagus! Untuk menguasai **${conceptTitle}**, ingat bahwa tujuannya adalah membangun fondasi kuat sebelum melangkah ke konsep berikutnya di Knowledge Graph.\n\n` +
          `Apakah kamu sudah siap mencoba kuis mini checkpoint di bawah, atau ada bagian penjelasan yang ingin kita bahas lebih dalam?`;
      }

      // Stream simulated chunks
      const encoder = new TextEncoder();
      const chunks = reply.split(' ');
      const simulatedStream = new ReadableStream({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk + ' '));
            await new Promise(r => setTimeout(r, 25));
          }
          controller.close();
        },
      });

      return new Response(simulatedStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Gagal memproses pesan: ' + msg }, { status: 500 });
  }
}
