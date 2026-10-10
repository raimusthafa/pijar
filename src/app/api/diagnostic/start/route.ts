import { NextResponse } from 'next/server';
import { generateStructuredJSON } from '@/lib/ai/provider';
import { MOCK_DIAGNOSTIC_QUESTIONS } from '@/lib/ai/mock-data';
import type { DiagnosticQuestion } from '@/types';

// Fallback questions by topic category if AI is unavailable
const TOPIC_FALLBACKS: Record<string, DiagnosticQuestion[]> = {
  ml: [
    {
      id: 'ml1',
      question: 'Apa perbedaan mendasar antara Supervised Learning dan Unsupervised Learning?',
      options: [
        'Supervised learning menggunakan data berlabel, unsupervised tidak memiliki label',
        'Unsupervised learning selalu lebih akurat daripada supervised learning',
        'Supervised learning tidak memerlukan data pelatihan (training data)',
        'Unsupervised learning hanya digunakan untuk masalah regresi linier',
      ],
      concept_tested: 'Supervised vs Unsupervised Learning',
    },
    {
      id: 'ml2',
      question: 'Kondisi di mana model memiliki performa sangat tinggi pada training set tetapi buruk pada test set disebut?',
      options: ['Underfitting', 'Overfitting', 'High Bias', 'Vanishing Gradient'],
      concept_tested: 'Overfitting & Generalisasi Model',
    },
    {
      id: 'ml3',
      question: 'Dalam klasifikasi biner, metrik apa yang paling krusial ketika dataset sangat tidak seimbang (imbalanced)?',
      options: ['Akurasi (Accuracy)', 'F1-Score / PR-AUC', 'Mean Squared Error (MSE)', 'R-squared'],
      concept_tested: 'Evaluasi Metrik Model',
    },
    {
      id: 'ml4',
      question: 'Fungsi aktivasi apa yang umumnya digunakan pada layer output untuk klasifikasi multi-kelas eksklusif?',
      options: ['Sigmoid', 'ReLU', 'Softmax', 'Tanh'],
      concept_tested: 'Neural Network Activation Functions',
    },
    {
      id: 'ml5',
      question: 'Algoritma optimasi mana yang paling umum digunakan untuk memperbarui bobot pada neural networks?',
      options: ['Gradient Descent / Adam', 'K-Means', 'Dijkstra', 'PCA'],
      concept_tested: 'Gradient Descent & Backpropagation',
    },
  ],
  db: [
    {
      id: 'db1',
      question: 'Apa arti sifat Atomicity dalam prinsip ACID database transaksional?',
      options: [
        'Semua operasi dalam transaksi berhasil sepenuhnya, atau tidak ada yang dieksekusi sama sekali',
        'Data yang disimpan dapat diakses secara simultan tanpa kunci (lock)',
        'Database otomatis mereplikasi data ke node atomik',
        'Ukuran setiap record dibatasi dalam ukuran partikel atomik',
      ],
      concept_tested: 'ACID Properties & Transaksi',
    },
    {
      id: 'db2',
      question: 'Jenis JOIN mana yang mengembalikan semua baris dari tabel kiri dan baris yang cocok dari tabel kanan?',
      options: ['INNER JOIN', 'LEFT OUTER JOIN', 'FULL JOIN', 'CROSS JOIN'],
      concept_tested: 'SQL Joins',
    },
    {
      id: 'db3',
      question: 'Struktur data apa yang paling umum digunakan untuk indeks pada sistem RDBMS relasional (B-Tree/B+ Tree)?',
      options: ['Array 1D', 'B+ Tree', 'Linked List tunggal', 'Stack'],
      concept_tested: 'Database Indexing & B-Trees',
    },
    {
      id: 'db4',
      question: 'Apa tujuan utama dari proses Normalisasi Database hingga Bentuk Normal Ketiga (3NF)?',
      options: [
        'Mengurangi redundansi data dan mencegah anomali pembaruan (update anomalies)',
        'Mempercepat eksekusi query SELECT dengan menggandakan data',
        'Menghapus kebutuhan akan primary key',
        'Mengubah database relasional menjadi dokumen JSON NoSQL',
      ],
      concept_tested: 'Normalisasi Database (1NF-3NF)',
    },
    {
      id: 'db5',
      question: 'Dalam teorema CAP untuk sistem database terdistribusi, apa yang dimaksud dengan Consistency (C)?',
      options: [
        'Setiap pembacaan data menerima penulisan data terbaru atau terjadi error',
        'Sistem selalu merespons tanpa timeout',
        'Sistem tetap berfungsi meski kabel jaringan terputus',
        'Data tersimpan dalam format terenkripsi permanen',
      ],
      concept_tested: 'Teorema CAP & Distributed Databases',
    },
  ],
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const topic = body.topic || 'Struktur Data & Algoritma';
    const goal = body.target_goal || 'Persiapan Interview / Pemahaman Konseptual';

    // Try generating with AI
    try {
      const prompt = `Buatkan 5 soal diagnostik (pre-test) pilihan ganda berbobot untuk topik "${topic}" dengan sasaran "${goal}".
Setiap soal harus menguji konsep fundamental dan prasyarat dasar yang penting.

Format JSON yang diwajibkan:
{
  "questions": [
    {
      "id": "q1",
      "question": "Pertanyaan yang jelas dan menantang pemahaman konseptual...",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "concept_tested": "Nama konsep spesifik yang diuji"
    }
  ]
}
Pastikan tepat 5 soal, memiliki 4 opsi jawaban tiap soal, dan teks menggunakan Bahasa Indonesia formal edukatif.`;

      const systemInstruction = `Kamu adalah pakar kurikulum dan pedagogi ilmu komputer di Pijar. Buat pertanyaan diagnostik yang tajam untuk mendeteksi kesenjangan pengetahuan (knowledge gap) siswa secara objektif. Kembalikan HANYA JSON sesuai format.`;

      const aiResponse = await generateStructuredJSON<{ questions: DiagnosticQuestion[] }>(
        prompt,
        systemInstruction
      );

      if (aiResponse?.questions && Array.isArray(aiResponse.questions) && aiResponse.questions.length > 0) {
        return NextResponse.json({
          success: true,
          source: 'ai',
          topic,
          questions: aiResponse.questions,
        });
      }
    } catch (aiErr) {
      console.warn('AI diagnostic generation failed, using intelligent fallback:', aiErr);
    }

    // Fallback based on topic key or DSA default
    const topicLower = topic.toLowerCase();
    let questions = MOCK_DIAGNOSTIC_QUESTIONS;

    if (topicLower.includes('machine') || topicLower.includes('ml') || topicLower.includes('ai')) {
      questions = TOPIC_FALLBACKS.ml;
    } else if (topicLower.includes('data') && topicLower.includes('base') || topicLower.includes('sql') || topicLower.includes('db')) {
      questions = TOPIC_FALLBACKS.db;
    }

    return NextResponse.json({
      success: true,
      source: 'fallback',
      topic,
      questions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Gagal memuat soal diagnostik: ' + message },
      { status: 500 }
    );
  }
}
