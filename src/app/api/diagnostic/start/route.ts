import { NextResponse } from 'next/server';
import { generateStructuredJSON } from '@/lib/ai/provider';
import { initAdaptive } from '@/lib/diagnostic/adaptive';
import { MATH_FORMAT_NOTE } from '@/lib/learn/math-text';
import { nextAdaptiveQuestion } from '@/lib/diagnostic/adaptive-server';
import type { DiagnosticQuestion, QuestionDifficulty } from '@/types';

/**
 * Procedural Dynamic Question Generator for any topic when AI network fails.
 * Guarantees zero hardcoded DSA mock for arbitrary domains!
 */
function generateProceduralFallbackQuestions(
  topic: string,
  goal: string,
  count: number = 5
): DiagnosticQuestion[] {
  const cleanTopic = topic.trim();
  const slug = cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

  const templates = [
    {
      concept: `Model Mental & Definisi Inti ${cleanTopic}`,
      difficulty: 'foundational' as QuestionDifficulty,
      scenario: `Seorang engineer sedang mendesain sistem yang mengandalkan prinsip ${cleanTopic}.`,
      question: `Manakah dari pernyataan berikut yang paling tepat mendefinisikan prinsip dasar dan tujuan arsitektural dari ${cleanTopic}?`,
      options: [
        `Menyediakan abstraksi terstruktur untuk memisahkan tanggung jawab dan mengoptimalkan keandalan sistem.`,
        `Menggandakan seluruh data secara berulang untuk menghindari proses konkurensi.`,
        `Menghapus kebutuhan akan validasi input dan pengujian sistem.`,
        `Hanya digunakan pada sistem monolitik sederhana tanpa skalabilitas.`,
      ],
      correctIndex: 0,
      explanation: `Prinsip fundamental ${cleanTopic} berfokus pada penyediaan abstraksi yang terstruktur, efisiensi alur kerja, dan keandalan operasional sistem.`,
    },
    {
      concept: `Mekanisme Eksekusi & Aliran Kerja`,
      difficulty: 'foundational' as QuestionDifficulty,
      scenario: `Dalam tahap implementasi awal alur kerja pada ${cleanTopic}.`,
      question: `Apa yang menjadi syarat prasyarat utama sebelum menjalankan operasi lanjutan pada alur kerja ${cleanTopic}?`,
      options: [
        `Menjalankan seluruh proses secara simultan tanpa sinkronisasi state.`,
        `Memastikan fondasi konfigurasi, integritas dependensi, dan model data awal telah tervalidasi.`,
        `Mengabaikan logging dan monitoring kesalahan.`,
        `Mematikan isolasi proses demi penghematan memori.`,
      ],
      correctIndex: 1,
      explanation: `Integritas prasyarat dan validasi model awal adalah fondasi mutlak agar eksekusi lanjutan tidak mengalami kegagalan beruntun (cascading failure).`,
    },
    {
      concept: `Penanganan Kasus Batas (Edge Cases)`,
      difficulty: 'intermediate' as QuestionDifficulty,
      scenario: `Sistem menerima beban puncak atau input tak terduga dalam domain ${cleanTopic}.`,
      question: `Bagaimana pendekatan terbaik ketika menghadapi anomali atau input yang tidak sesuai spesifikasi pada ${cleanTopic}?`,
      options: [
        `Membiarkan proses berhenti tanpa pesan kesalahan (silent crash).`,
        `Menerapkan pola fail-safe dengan validasi batas, penanganan eksepsi eksplisit, dan isolasi dampak.`,
        `Otomatis menerima input apapun tanpa verifikasi skema.`,
        `Melakukan restart menyeluruh pada seluruh server setiap terjadi anomali kecil.`,
      ],
      correctIndex: 1,
      explanation: `Prinsip fail-safe dan defensif memastikan sistem tetap resilien saat mendeteksi anomali pada lingkungan produksi.`,
    },
    {
      concept: `Trade-off Performa & Skalabilitas`,
      difficulty: 'intermediate' as QuestionDifficulty,
      scenario: `Perlu dilakukan optimasi terhadap latensi dan penggunaan sumber daya komputasi.`,
      question: `Trade-off arsitektural apa yang paling sering dihadapi ketika mengoptimalkan performa dalam ${cleanTopic}?`,
      options: [
        `Keseimbangan antara kecepatan akses memori (caching/efisiensi) vs konsumsi ruang dan kompleksitas konsistensi.`,
        `Tidak ada trade-off sama sekali; optimasi selalu instan dan gratis.`,
        `Menghilangkan seluruh mekanisme keamanan untuk mempercepat throughput.`,
        `Menambah delay buatan pada setiap antrean proses.`,
      ],
      correctIndex: 0,
      explanation: `Dalam arsitektur sistem nyata, peningkatan kecepatan sering kali memerlukan trade-off memori tambahan atau manajemen konsistensi yang lebih ketat.`,
    },
    {
      concept: `Sintesis Masalah Nyata & Best Practices`,
      difficulty: 'advanced' as QuestionDifficulty,
      scenario: `Menghadapi kebutuhan produksi tingkat lanjut sesuai target "${goal}".`,
      question: `Strategi mana yang paling tepat untuk memastikan keberlanjutan (maintainability) jangka panjang solusi ${cleanTopic}?`,
      options: [
        `Menulis seluruh logika dalam satu file besar tanpa modularitas.`,
        `Menerapkan modularitas, dokumentasi kontrak API yang jelas, dan pengujian otomatis bertingkat.`,
        `Menghindari refactoring selamanya meskipun terdapat technical debt.`,
        `Mengandalkan asumsi implisit tanpa skema data formal.`,
      ],
      correctIndex: 1,
      explanation: `Modularitas, kontrak antarmuka yang jelas, dan automated tests adalah pilar utama arsitektur software engineering modern untuk skala enterprise.`,
    },
    {
      concept: `Isolasi Komponen & Konkurensi`,
      difficulty: 'intermediate' as QuestionDifficulty,
      scenario: `Dua operasi mencoba mengakses sumber daya bersama secara bersamaan.`,
      question: `Bagaimana cara mencegah kondisi perlombaan (race condition) pada sistem ${cleanTopic}?`,
      options: [
        `Menerapkan sinkronisasi yang tepat, transaksi atomik, atau model immutability.`,
        `Membiarkan operasi menimpa satu sama lain tanpa aturan.`,
        `Meningkatkan kecepatan clock CPU tanpa mengubah kode.`,
        `Menghapus proses kedua secara sepihak.`,
      ],
      correctIndex: 0,
      explanation: `Atomisitas operasi dan model immutability mencegah korupsi data akibat akses simultan yang tidak terkontrol.`,
    },
    {
      concept: `Keamanan & Validasi Kontrak`,
      difficulty: 'intermediate' as QuestionDifficulty,
      scenario: `Integrasi dengan layanan pihak ketiga yang tidak tepercaya.`,
      question: `Langkah verifikasi apa yang wajib diterapkan pada batas antarmuka (boundary) ${cleanTopic}?`,
      options: [
        `Validasi skema ketat dan sanitasi data pada lapisan input boundary.`,
        `Percaya sepenuhnya pada semua data yang masuk tanpa parsing.`,
        `Menyimpan semua secret key di dalam kode klien secara publik.`,
        `Mematikan mekanisme enkripsi data in-transit.`,
      ],
      correctIndex: 0,
      explanation: `Prinsip zero-trust mewajibkan sanitasi dan validasi skema ketat di setiap batas pertukaran data antarsistem.`,
    },
    {
      concept: `Observabilitas & Telemetri`,
      difficulty: 'advanced' as QuestionDifficulty,
      scenario: `Memantau kesehatan operasional sistem ${cleanTopic} secara real-time.`,
      question: `Tiga pilar observabilitas utama apa yang perlu dipasang untuk mendeteksi bottleneck sistem?`,
      options: [
        `Metrics, Logs, dan Distributed Traces.`,
        `Restart, Backup, dan Format Ulang.`,
        `Komentar kode, Print console, dan Tangkapan layar.`,
        `Email pemberitahuan, Spreadsheet manual, dan Jam dinding.`,
      ],
      correctIndex: 0,
      explanation: `Metrik, log terstruktur, dan distributed tracing adalah standar industri observabilitas modern untuk analisis performa.`,
    },
    {
      concept: `Fault Tolerance & Recovery`,
      difficulty: 'advanced' as QuestionDifficulty,
      scenario: `Salah satu node dependensi mengalami crash tiba-tiba saat melayani request.`,
      question: `Pola ketahanan (resilience pattern) mana yang paling efektif memutus penyebaran kegagalan?`,
      options: [
        `Circuit Breaker dengan mekanisme graceful fallback dan exponential backoff retry.`,
        `Infinite loop tanpa batas waktu tunggu (no timeout).`,
        `Mematikan koneksi internet secara global.`,
        `Mengirim jutaan request ulang dalam 1 milidetik.`,
      ],
      correctIndex: 0,
      explanation: `Circuit breaker dan backoff retry mencegah server hancur karena beban lonjakan ketika subsistem dependensi sedang mengalami down.`,
    },
    {
      concept: `Evolusi Arsitektur & Migrasi`,
      difficulty: 'advanced' as QuestionDifficulty,
      scenario: `Perlu melakukan upgrade versi sistem tanpa menyebabkan downtime layanan.`,
      question: `Pola perubahan skema mana yang paling aman diterapkan untuk evolusi sistem berkelanjutan?`,
      options: [
        `Pola Expand and Contract (backward-compatible phase) sebelum mendeprekasi versi lama.`,
        `Drop tabel langsung pada jam sibuk tanpa notifikasi.`,
        `Mengubah semua tipe data secara mendadak tanpa konversi.`,
        `Membiarkan versi klien crash hingga semua user komplain.`,
      ],
      correctIndex: 0,
      explanation: `Pola Expand and Contract menjamin transisi nol downtime dengan mendukung kompatibilitas ke belakang sebelum mematikan skema lawas.`,
    },
  ];

  const selected = templates.slice(0, count);

  return selected.map((t, idx) => ({
    id: `q${idx + 1}`,
    question: t.question,
    scenario_context: t.scenario,
    difficulty_tier: t.difficulty,
    options: t.options,
    concept_tested: t.concept,
    correct_index: t.correctIndex,
    explanation: t.explanation,
    target_node_id: `${slug}-${idx + 1}`,
  }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const topic: string = (body.topic || 'Struktur Data & Algoritma').trim();
    const goal: string = (body.target_goal || 'Persiapan Komprehensif').trim();
    const rawCount = Number(body.question_count);
    const count: number = rawCount === 10 ? 10 : 5; // Default 5 (Quick), or 10 (Comprehensive)
    // Optional adaptive mode: client sends a prerequisite graph and the goal node
    if (Array.isArray(body.nodes) && Array.isArray(body.edges) && typeof body.goal_node_id === 'string') {
      try {
        const adaptive_state = initAdaptive(body.goal_node_id);
        const next = await nextAdaptiveQuestion(adaptive_state, body.nodes, topic, body.language);
        return NextResponse.json({ success: true, source: 'adaptive', topic, goal, mode: 'adaptive', questions: next ? [next.question] : [], adaptive_state, next });
      } catch (e) {
        console.warn('Adaptive pretest init failed, using standard flow:', e);
      }
    }

    const isPractitionerTrack = Boolean(body.is_practitioner_track) || goal.toLowerCase().includes('mahir') || goal.toLowerCase().includes('praktisi') || topic.toLowerCase().includes('praktisi');

    // Dynamic AI Prompt tailored for ANY TOPIC & PRACTIONER LEVEL
    try {
      const practitionerClause = isPractitionerTrack
        ? `\nPERHATIAN KHUSUS TINGKAT PRAKTISI MAHIR (ADVANCED PRACTITIONER):
Siswa menargetkan penguasaan tingkat praktisi industri. Buat soal-soal berbobot tinggi dengan studi kasus nyata, dilema arsitektur sistem produksi, analisis kegagalan (failure modes), dan penalaran teknis mendalam. Mayoritas soal harus bertingkat "intermediate" atau "advanced".`
        : '';

      const prompt = `Buatkan tepat ${count} soal diagnostik (pre-test) adaptif pilihan ganda berbobot untuk topik: "${topic}".
Target Tujuan Pelajar: "${goal}".${practitionerClause}
Jumlah Soal yang Diminta: Tepat ${count} butir.

Ketentuan Soal:
1. Soal harus menguji pemahaman mendalam (deep mental model, alur kerja, edge cases, atau studi kasus nyata), BUKAN sekadar trivia hafalan definisi kata.
2. Setiap soal memiliki:
   - "id": "q1", "q2", dst.
   - "question": Pertanyaan yang tajam, edukatif, dan menantang logika.
   - "scenario_context": Konteks skenario/kasus nyata 1-2 kalimat (contoh: "Ketika membangun backend e-commerce...", "Saat mengamankan boundary jaringan...", "Ketika menangani konkurensi...")
   - "difficulty_tier": "foundational" (untuk soal dasar), "intermediate" (mekanisme & trade-off), atau "advanced" (studi kasus arsitektur/sintesis)
   - "options": Array berisi tepat 4 opsi jawaban berkualitas dan masuk akal.
   - "concept_tested": Nama konsep spesifik yang diuji.
   - "correct_index": Angka integer kunci jawaban (0, 1, 2, atau 3). Pastikan kunci jawaban bervariasi!
   - "explanation": Penjelasan rasional mengapa opsi tersebut benar dan mengapa opsi lain salah/kurang tepat.
   - "target_node_id": Slug konsep kanonikal (huruf kecil, contoh: "relational-indexing", "backprop-mechanics").

Format JSON Wajib:
{
  "questions": [
    {
      "id": "q1",
      "question": "...",
      "scenario_context": "...",
      "difficulty_tier": "foundational",
      "options": ["A", "B", "C", "D"],
      "concept_tested": "Nama Konsep",
      "correct_index": 0,
      "explanation": "Penjelasan...",
      "target_node_id": "slug-konsep"
    }
  ]
}
Gunakan Bahasa Indonesia edukatif formal.`;

      const systemInstruction = `Kamu adalah Chief Psychometrician dan Educational Evaluator di Pijar. Buat soal diagnostik adaptif yang mampu membedakan tingkat pemahaman siswa secara presisi untuk topik apa pun di dunia ini. Selalu kembalikan HANYA JSON valid. ${MATH_FORMAT_NOTE}`;

      const aiResponse = await generateStructuredJSON<{ questions: DiagnosticQuestion[] }>(
        prompt,
        systemInstruction
      );

      if (aiResponse?.questions && Array.isArray(aiResponse.questions) && aiResponse.questions.length >= count) {
        return NextResponse.json({
          success: true,
          source: 'ai',
          topic,
          goal,
          mode: count === 10 ? 'comprehensive' : 'quick',
          questions: aiResponse.questions.slice(0, count),
        });
      }
    } catch (aiErr) {
      console.warn('AI dynamic diagnostic question generation failed, utilizing dynamic procedural synthesizer:', aiErr);
    }

    // Dynamic Procedural Fallback tailored to the EXACT topic (Zero mock DSA fallback!)
    const fallbackQuestions = generateProceduralFallbackQuestions(topic, goal, count);

    return NextResponse.json({
      success: true,
      source: 'dynamic_fallback',
      topic,
      goal,
      mode: count === 10 ? 'comprehensive' : 'quick',
      questions: fallbackQuestions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Gagal memuat soal diagnostik: ' + message },
      { status: 500 }
    );
  }
}
