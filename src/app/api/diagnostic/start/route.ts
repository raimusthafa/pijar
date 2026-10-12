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
      correct_index: 0,
      explanation: 'Supervised learning dilatih menggunakan pasangan fitur dan target label, sedangkan unsupervised learning bertugas mencari pola intrinsik (clustering/dimensi) tanpa label acuan.',
      target_node_id: 'python-numpy',
    },
    {
      id: 'ml2',
      question: 'Kondisi di mana model memiliki performa sangat tinggi pada training set tetapi buruk pada test set disebut?',
      options: ['Underfitting', 'Overfitting', 'High Bias', 'Vanishing Gradient'],
      concept_tested: 'Overfitting & Generalisasi Model',
      correct_index: 1,
      explanation: 'Overfitting terjadi saat model terlalu menghafal noise pada data latih sehingga kehilangan kemampuan generalisasi pada data baru.',
      target_node_id: 'lin-reg',
    },
    {
      id: 'ml3',
      question: 'Dalam klasifikasi biner, metrik apa yang paling krusial ketika dataset sangat tidak seimbang (imbalanced)?',
      options: ['Akurasi (Accuracy)', 'F1-Score / PR-AUC', 'Mean Squared Error (MSE)', 'R-squared'],
      concept_tested: 'Evaluasi Metrik Model',
      correct_index: 1,
      explanation: 'Pada data imbalanced, akurasi tinggi bisa menipu (accuracy paradox). F1-Score atau PR-AUC mengukur keseimbangan precision dan recall kelas minoritas.',
      target_node_id: 'prob-stats',
    },
    {
      id: 'ml4',
      question: 'Fungsi aktivasi apa yang umumnya digunakan pada layer output untuk klasifikasi multi-kelas eksklusif?',
      options: ['Sigmoid', 'ReLU', 'Softmax', 'Tanh'],
      concept_tested: 'Neural Network Activation Functions',
      correct_index: 2,
      explanation: 'Softmax mengubah logit vektor menjadi distribusi probabilitas yang jumlah totalnya 1.0, ideal untuk multi-class mutually exclusive.',
      target_node_id: 'neural-network',
    },
    {
      id: 'ml5',
      question: 'Algoritma optimasi mana yang paling umum digunakan untuk memperbarui bobot pada neural networks?',
      options: ['Gradient Descent / Adam', 'K-Means', 'Dijkstra', 'PCA'],
      concept_tested: 'Gradient Descent & Backpropagation',
      correct_index: 0,
      explanation: 'Gradient Descent (dan variannya seperti Adam) memperbarui bobot parameter jaringan saraf ke arah berlawanan gradien fungsi loss.',
      target_node_id: 'gradient-descent',
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
      correct_index: 0,
      explanation: 'Atomicity menjamin prinsip all-or-nothing: jika terjadi kegagalan di tengah transaksi, semua perubahan dibatalkan (rollback).',
      target_node_id: 'acid-tx',
    },
    {
      id: 'db2',
      question: 'Jenis JOIN mana yang mengembalikan semua baris dari tabel kiri dan baris yang cocok dari tabel kanan?',
      options: ['INNER JOIN', 'LEFT OUTER JOIN', 'FULL JOIN', 'CROSS JOIN'],
      concept_tested: 'SQL Joins',
      correct_index: 1,
      explanation: 'LEFT OUTER JOIN mempertahankan semua baris dari tabel kiri; baris kanan yang tidak memiliki kecocokan akan bernilai NULL.',
      target_node_id: 'relational-model',
    },
    {
      id: 'db3',
      question: 'Struktur data apa yang paling umum digunakan untuk indeks pada sistem RDBMS relasional (B-Tree/B+ Tree)?',
      options: ['Array 1D', 'B+ Tree', 'Linked List tunggal', 'Stack'],
      concept_tested: 'Database Indexing & B-Trees',
      correct_index: 1,
      explanation: 'B+ Tree memungkinkan pencarian, penyisipan, dan range query dalam waktu O(log n) dengan meminimalkan operasi I/O blok disk.',
      target_node_id: 'indexing-btree',
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
      correct_index: 0,
      explanation: '3NF menghilangkan ketergantungan transitif, memastikan setiap kolom non-kunci hanya bergantung langsung pada primary key untuk mencegah data anomali.',
      target_node_id: 'normalization',
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
      correct_index: 0,
      explanation: 'Consistency dalam CAP menjamin setiap read melihat write paling mutakhir di seluruh node (linearizability).',
      target_node_id: 'distributed-cap',
    },
  ],
  math: [
    {
      id: 'math1',
      question: 'Jika A = {1, 2, 3} dan B = {2, 3, 4}, berapa kardinalitas dari irisan A ∩ B?',
      options: ['2', '3', '4', '1'],
      concept_tested: 'Teori Himpunan & Notasi',
      correct_index: 0,
      explanation: 'Irisan A ∩ B = {2, 3}, sehingga kardinalitasnya adalah 2 unsur.',
      target_node_id: 'set-theory',
    },
    {
      id: 'math2',
      question: 'Kapan implikasi logika p → q bernilai SALAH (False)?',
      options: [
        'Ketika p benar dan q benar',
        'Ketika p benar dan q salah',
        'Ketika p salah dan q benar',
        'Ketika p salah dan q salah',
      ],
      concept_tested: 'Logika Proposisi & Implikasi',
      correct_index: 1,
      explanation: 'Implikasi p → q hanya salah jika premis p bernilai benar (True) namun kesimpulan q bernilai salah (False).',
      target_node_id: 'prop-logic',
    },
    {
      id: 'math3',
      question: 'Dalam induksi matematika, langkah pembuktian dasar P(1) benar disebut langkah apa?',
      options: [
        'Basis induksi (Base step)',
        'Langkah induktif (Inductive step)',
        'Hipotesis kontradiksi',
        'Aksioma deduksi',
      ],
      concept_tested: 'Metode Pembuktian & Induksi',
      correct_index: 0,
      explanation: 'Basis induksi adalah pembuktian bahwa pernyataan bernilai benar untuk elemen terkecil pertama (n=1).',
      target_node_id: 'proof-tech',
    },
    {
      id: 'math4',
      question: 'Berapa banyak sisi (edges) pada pohon rentang (spanning tree) dari graf terhubung dengan n simpul?',
      options: ['n sisi', 'n + 1 sisi', 'n - 1 sisi', '2n sisi'],
      concept_tested: 'Teori Graf & Pohon Rentang',
      correct_index: 2,
      explanation: 'Sebuah pohon dengan n simpul selalu memiliki tepat n - 1 sisi tanpa mengandung siklus tertutup.',
      target_node_id: 'graph-theory',
    },
    {
      id: 'math5',
      question: 'Berapa banyak cara memilih 2 perwakilan dari 5 kandidat tanpa memperhatikan urutan (kombinasi C(5, 2))?',
      options: ['20', '10', '25', '5'],
      concept_tested: 'Kombinatorika & Peluang Diskrit',
      correct_index: 1,
      explanation: 'C(5, 2) = 5! / (2! * 3!) = (5 * 4) / 2 = 10 cara.',
      target_node_id: 'combinatorics',
    },
  ],
  web: [
    {
      id: 'web1',
      question: 'Elemen HTML5 mana yang paling semantik untuk membungkus blok navigasi utama website?',
      options: ['<nav>', '<div class="menu">', '<section id="links">', '<header-links>'],
      concept_tested: 'Semantic HTML & Layout',
      correct_index: 0,
      explanation: 'Elemen <nav> ditujukan khusus untuk mendefinisikan blok tautan navigasi utama.',
      target_node_id: 'html-css',
    },
    {
      id: 'web2',
      question: 'Metode modern JavaScript apa yang digunakan untuk menambahkan event listener pada elemen DOM?',
      options: [
        'element.onclick = fn',
        'element.addEventListener("click", fn)',
        'element.attach()',
        'element.listen("click")',
      ],
      concept_tested: 'JavaScript Modern & Manipulasi DOM',
      correct_index: 1,
      explanation: 'addEventListener memungkinkan pendaftaran multiple listener independen pada target event.',
      target_node_id: 'js-dom',
    },
    {
      id: 'web3',
      question: 'Apa urutan output dari kode: console.log(1); Promise.resolve().then(() => console.log(2)); console.log(3); ?',
      options: ['1, 3, 2', '1, 2, 3', '2, 1, 3', '3, 1, 2'],
      concept_tested: 'Asynchronous JavaScript & Event Loop',
      correct_index: 0,
      explanation: 'Kode sinkron (1, 3) dieksekusi di Call Stack sebelum Microtask Queue Promise (2) diproses Event Loop.',
      target_node_id: 'async-js',
    },
    {
      id: 'web4',
      question: 'Mengapa mutasi langsung pada state React (misal state.count = 5) tidak disarankan?',
      options: [
        'Menyebabkan memory leak di browser',
        'Memperlambat koneksi HTTP',
        'React tidak mendeteksi perubahan referensi sehingga re-render tidak terpicu',
        'State otomatis dikunci oleh browser',
      ],
      concept_tested: 'React Component State & Immutability',
      correct_index: 2,
      explanation: 'React melakukan shallow comparison referensi objek; mutasi langsung tidak memicu siklus re-render.',
      target_node_id: 'react-components',
    },
    {
      id: 'web5',
      question: 'Apa keuntungan utama dari React Server Components (RSC) di Next.js App Router?',
      options: [
        'Ukuran bundle JavaScript klien berkurang drastis karena komponen dirender di server',
        'Dapat menggunakan useState di semua komponen tanpa directive',
        'Otomatis membuat database SQL lokal di browser',
        'Menghilangkan kebutuhan styling CSS',
      ],
      concept_tested: 'Next.js App Router & Server Components',
      correct_index: 0,
      explanation: 'RSC dieksekusi di server sehingga kode JavaScript komponen tersebut tidak perlu dikirimkan ke browser.',
      target_node_id: 'next-app',
    },
  ],
  stats: [
    {
      id: 'stat1',
      question: 'Ukuran pemusatan data mana yang paling tahan (robust) terhadap pengaruh nilai pencilan (outliers) ekstrem?',
      options: ['Mean (Rata-rata)', 'Median (Nilai Tengah)', 'Standar Deviasi', 'Varians'],
      concept_tested: 'Statistik Deskriptif & Robustness',
      correct_index: 1,
      explanation: 'Median tidak terpengaruh oleh besaran nilai ekstrem di ekor distribusi karena hanya bergantung pada posisi urutan data.',
      target_node_id: 'descriptive-stats',
    },
    {
      id: 'stat2',
      question: 'Jika dua kejadian A dan B saling bebas (independent) dengan P(A)=0.5 dan P(B)=0.4, berapa nilai probabilitas bersama P(A ∩ B)?',
      options: ['0.90', '0.20', '0.10', '0.50'],
      concept_tested: 'Kaidah Probabilitas & Independensi',
      correct_index: 1,
      explanation: 'Untuk kejadian independen, P(A ∩ B) = P(A) * P(B) = 0.5 * 0.4 = 0.20.',
      target_node_id: 'prob-rules',
    },
    {
      id: 'stat3',
      question: 'Berapakah total luas area di bawah kurva fungsi kepekatan probabilitas (PDF) kontinu pada rentang (-∞, +∞)?',
      options: ['1.0', '100', '0.5', 'Tergantung varians kurva'],
      concept_tested: 'Variabel Acak & Fungsi Kepekatan (PDF)',
      correct_index: 0,
      explanation: 'Aksioma probabilitas menyatakan bahwa total peluang seluruh ruang sampel (integral PDF) selalu tepat bernilai 1.0.',
      target_node_id: 'random-variables',
    },
    {
      id: 'stat4',
      question: 'Dalam rumus Teorema Bayes P(A|B) = [P(B|A) * P(A)] / P(B), komponen P(A) merepresentasikan apa?',
      options: ['Posterior probability', 'Prior probability', 'Likelihood', 'Evidence marginal'],
      concept_tested: 'Teorema Bayes & Inferensi Bayesian',
      correct_index: 1,
      explanation: 'P(A) adalah probabilitas prior, yaitu keyakinan awal sebelum mengamati bukti baru B.',
      target_node_id: 'bayes-theorem',
    },
    {
      id: 'stat5',
      question: 'Jika p-value dari hasil uji hipotesis lebih kecil dari tingkat signifikansi alpha (misal p = 0.01 < 0.05), apa kesimpulan statistiknya?',
      options: [
        'Tolak Hipotesis Nol (Reject H0), ada bukti signifikan',
        'Gagal menolak H0, bukti tidak cukup',
        'Hipotesis Alternatif pasti salah',
        'Ukuran sampel harus digandakan',
      ],
      concept_tested: 'Uji Hipotesis & Signifikansi p-Value',
      correct_index: 0,
      explanation: 'Jika p-value < alpha, data yang diamati sangat tidak mungkin terjadi jika H0 benar, sehingga kita menolak H0.',
      target_node_id: 'hypothesis-test',
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
Sertakan kunci jawaban objektif (correct_index 0-3), penjelasan rasional, dan nama ID konsep kanonikal (target_node_id).

Format JSON yang diwajibkan:
{
  "questions": [
    {
      "id": "q1",
      "question": "Pertanyaan yang jelas dan menantang pemahaman konseptual...",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "concept_tested": "Nama konsep spesifik yang diuji",
      "correct_index": 0,
      "explanation": "Penjelasan mengapa opsi tersebut benar secara ilmiah...",
      "target_node_id": "nama-slug-konsep"
    }
  ]
}
Pastikan tepat 5 soal, memiliki 4 opsi jawaban tiap soal, correct_index berupa angka integer (0, 1, 2, atau 3), dan teks menggunakan Bahasa Indonesia formal edukatif.`;

      const systemInstruction = `Kamu adalah pakar kurikulum dan pedagogi ilmu komputer di Pijar. Buat pertanyaan diagnostik yang tajam untuk mendeteksi kesenjangan pengetahuan (knowledge gap) siswa secara objektif lengkap dengan kunci jawaban akurat. Kembalikan HANYA JSON sesuai format.`;

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
    } else if (topicLower.includes('stat') || topicLower.includes('prob') || topicLower.includes('peluang')) {
      questions = TOPIC_FALLBACKS.stats;
    } else if (topicLower.includes('math') || topicLower.includes('matematika') || topicLower.includes('diskrit')) {
      questions = TOPIC_FALLBACKS.math;
    } else if (topicLower.includes('web') || topicLower.includes('react') || topicLower.includes('frontend')) {
      questions = TOPIC_FALLBACKS.web;
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
