// ================================================================
// PIJAR - Curated Pedagogical Baseline Materials & Video Scripts
// Menyediakan konten terstruktur & scene video instan, 0-cost,
// dan akurat untuk konsep-konsep kunci di 6 topik kurikulum.
// ================================================================

import type { DetailedLearningMaterial } from './types';

export const CURATED_MATERIALS: Record<string, DetailedLearningMaterial> = {
  // ── DSA: Rekursi ─────────────────────────────────────────────
  'rekursi': {
    nodeId: 'rekursi',
    topic: 'dsa',
    title: 'Rekursi & Call Stack',
    learningObjective: 'Memahami bagaimana fungsi memanggil dirinya sendiri, pentingnya base case, dan alur call stack di memori.',
    targetLevel: 'beginner',
    prerequisiteConcepts: ['algo-intro', 'function-basics'],
    summary: 'Rekursi adalah teknik di mana fungsi menyelesaikan masalah dengan membagi persoalan menjadi sub-masalah serupa hingga mencapai titik henti (base case).',
    conceptExplanation: `Rekursi bekerja berdasarkan prinsip delegasi logis. Setiap kali fungsi rekursif dipanggil, komputer tidak mengulang eksekusi secara linier melainkan menyisipkan frame baru ke dalam Call Stack memori.

Dua komponen mutlak fungsi rekursif:
1. **Base Case (Kondisi Berhenti):** Kondisi batas di mana fungsi langsung mengembalikan nilai tanpa memanggil dirinya lagi. Tanpa ini, memori stack akan meluap (Stack Overflow).
2. **Recursive Case (Pemanggilan Mandiri):** Bagian di mana fungsi memanggil dirinya sendiri dengan argumen yang semakin mendekati base case.`,
    analogy: 'Bayangkan kamu membuka boneka Matryoshka Rusia. Kamu terus membuka boneka yang berukuran lebih kecil (recursive step) sampai menemukan boneka terkecil yang tidak bisa dibuka lagi (base case), lalu menutupnya kembali dari dalam ke luar.',
    keyDefinitions: [
      { term: 'Base Case', definition: 'Kondisi terminasi yang menghentikan rantai pemanggilan rekursif.' },
      { term: 'Call Stack', definition: 'Struktur data LIFO (Last-In-First-Out) di memori yang mencatat alamat pengembalian dan variabel lokal setiap panggilan fungsi.' },
      { term: 'Stack Overflow', definition: 'Kondisi error akibat kehabisan memori stack karena rekursi tanpa henti.' },
    ],
    examples: [
      {
        title: 'Perhitungan Faktorial Rekursif',
        language: 'typescript',
        code: `function factorial(n: number): number {
  // 1. Base Case: Hentikan saat n <= 1
  if (n <= 1) {
    return 1;
  }

  // 2. Recursive Case: n * factorial(n - 1)
  return n * factorial(n - 1);
}

console.log(factorial(4)); // Output: 24`,
        explanation: 'Untuk n = 4, fungsi memanggil factorial(3) -> factorial(2) -> factorial(1). Nilai 1 dikembalikan ke pemanggil sebelumnya secara beruntun hingga menghasilkan 24.',
        output: '24',
      },
    ],
    realWorldApplication: 'Algoritma perayap web (web crawler) menelusuri link halaman, traversal folder sistem operasi, dan algoritma parsing dokumen DOM/JSON.',
    commonMisconceptions: [
      {
        misconception: 'Fungsi rekursif selalu lebih cepat daripada perulangan (loop).',
        correction: 'Secara umum, rekursi memiliki overhead alokasi frame di Call Stack sehingga membutuhkan memori O(N) dibandingkan loop iteratif O(1), kecuali didukung Tail Call Optimization.',
      },
      {
        misconception: 'Base case hanya sekadar formalitas opsional.',
        correction: 'Tanpa base case, program dijamin mengalami runtime crash karena Stack Overflow.',
      },
    ],
    keyTakeaways: [
      'Selalu tentukan base case sebelum menulis logika recursive case.',
      'Pastikan setiap pemanggilan membawa parameter menuju ke arah base case.',
      'Pahami kedalaman stack (recursion depth) agar tidak melebihi kapasitas memori.',
    ],
    checkpointQuestions: [
      {
        id: 'rek-q1',
        question: 'Apa konsekuensi langsung jika fungsi rekursif tidak memiliki base case?',
        options: [
          'Fungsi akan mengembalikan nilai null tanpa error',
          'Terjadi Stack Overflow error karena memori call stack habis terisi',
          'Compiler otomatis mengubahnya menjadi while loop',
          'Fungsi hanya akan dieksekusi tepat satu kali',
        ],
        correctIndex: 1,
        explanation: 'Setiap pemanggilan fungsi mengalokasikan stack frame baru di RAM. Tanpa base case, alokasi bertambah tanpa batas hingga memori habis dan program crash.',
        conceptTested: 'Base Case & Memory Limits',
        distractorExplanations: [
          'Komputer tidak bisa menebak nilai kembalian jika fungsi terus memanggil dirinya.',
          'Pilihan ini benar: call stack kehabisan kuota memori.',
          'Bahasa pemrograman modern tidak otomatis mengonversi rekursi tanpa base case.',
          'Fungsi justru akan dipanggil terus-menerus tanpa henti.',
        ],
      },
      {
        id: 'rek-q2',
        question: 'Pada perhitungan factorial(3), berapakah jumlah stack frame maksimal yang aktif bersamaan di memori?',
        options: [
          '1 frame (dieksekusi bergantian)',
          '2 frame',
          '3 frame (factorial(3), factorial(2), factorial(1))',
          'Tak terhingga',
        ],
        correctIndex: 2,
        explanation: 'Pada titik terdalam (saat factorial(1) dieksekusi), frame untuk factorial(3) dan factorial(2) masih menunggu di memori call stack.',
        conceptTested: 'Call Stack Lifetime',
      },
      {
        id: 'rek-q3',
        question: 'Manakah dari skenario berikut yang paling tepat diselesaikan menggunakan rekursi?',
        options: [
          'Menjumlahkan array angka berurutan 1 sampai 1000000',
          'Menavigasi struktur folder bersarang (nested directories) pada komputer',
          'Mencetak string "Halo" sebanyak 5 kali',
          'Membaca file teks baris demi baris secara sekuensial',
        ],
        correctIndex: 1,
        explanation: 'Struktur folder komputer memiliki hierarki pohon (tree) dengan kedalaman arbitrer, yang secara alami cocok ditelusuri dengan algoritma rekursif.',
        conceptTested: 'Recursive Problem Suitability',
      },
    ],
    videoScript: {
      conceptId: 'rekursi',
      title: 'Visualisasi Rekursi & Call Stack',
      totalDurationSeconds: 48,
      scenes: [
        {
          id: 'sc-1',
          sceneNumber: 1,
          title: 'Pengantar: Konsep Pemanggilan Mandiri',
          durationSeconds: 12,
          narration: 'Selamat datang di visualisasi Rekursi. Rekursi terjadi ketika sebuah fungsi memanggil dirinya sendiri untuk menyelesaikan sub-masalah yang lebih kecil.',
          visualType: 'concept-illustration',
          visualState: {
            notes: 'Fungsi memanggil dirinya sendiri dengan parameter input yang mengecil.',
            activeNodes: ['Fungsi Utama', 'Sub-Masalah', 'Base Case'],
          },
          captions: [
            { startSeconds: 0, endSeconds: 6, text: 'Rekursi adalah teknik di mana fungsi memanggil dirinya sendiri.' },
            { startSeconds: 6, endSeconds: 12, text: 'Tujuannya memecah persoalan besar menjadi bagian-bagian kecil.' },
          ],
        },
        {
          id: 'sc-2',
          sceneNumber: 2,
          title: 'Anatomi Call Stack: Menumpuk Frame',
          durationSeconds: 16,
          narration: 'Perhatikan Call Stack di samping. Saat faktorial empat dipanggil, memori menumpuk frame faktorial empat, lalu tiga, dua, hingga faktorial satu.',
          visualType: 'call-stack',
          visualState: {
            currentStep: 3,
            totalSteps: 4,
            stackItems: [
              { label: 'factorial(1)', value: 'Base Case: return 1', isBaseCase: true },
              { label: 'factorial(2)', value: 'Menunggu 2 * fact(1)' },
              { label: 'factorial(3)', value: 'Menunggu 3 * fact(2)' },
              { label: 'factorial(4)', value: 'Menunggu 4 * fact(3)' },
            ],
            notes: 'Setiap panggilan fungsi menambah satu frame ke Call Stack (LIFO).',
          },
          captions: [
            { startSeconds: 12, endSeconds: 20, text: 'Setiap pemanggilan menumpuk frame baru ke Call Stack di memori.' },
            { startSeconds: 20, endSeconds: 28, text: 'Frame paling atas adalah kondisi base case yang siap mengembalikan nilai.' },
          ],
        },
        {
          id: 'sc-3',
          sceneNumber: 3,
          title: 'Unwinding: Pengembalian Nilai ke Bawah',
          durationSeconds: 20,
          narration: 'Saat base case tercapai, nilai satu dikembalikan. Frame dicopot satu per satu, mengalikan nilai hingga hasil akhir dua puluh empat selesai dihitung.',
          visualType: 'code-execution',
          visualState: {
            highlightedLine: 7,
            variables: { 'n': 4, 'result': 24, 'stack_status': 'Cleared' },
            notes: 'Hasil dikembalikan mundur (unwinding): 1 -> 2 -> 6 -> 24.',
          },
          captions: [
            { startSeconds: 28, endSeconds: 38, text: 'Setelah base case tercapai, nilai dikembalikan mundur ke pemanggil sebelumnya.' },
            { startSeconds: 38, endSeconds: 48, text: 'Stack frame dihapus satu per satu hingga perhitungan tuntas.' },
          ],
        },
      ],
    },
  },

  // ── ML: Gradient Descent & Adam ──────────────────────────────
  'gradient-descent': {
    nodeId: 'gradient-descent',
    topic: 'ml',
    title: 'Gradient Descent & Optimasi Bobot',
    learningObjective: 'Memahami bagaimana gradien memandu pembaruan bobot model untuk meminimalkan fungsi loss.',
    targetLevel: 'intermediate',
    prerequisiteConcepts: ['calculus-grad', 'lin-reg'],
    summary: 'Gradient Descent adalah algoritma optimasi iteratif untuk menemukan nilai parameter yang meminimalkan nilai kesalahan (loss function) model.',
    conceptExplanation: `Tujuan pelatihan model Machine Learning adalah menemukan bobot W dan bias b yang membuat prediksi mendekati target asli. Untuk itu, kita mendefinisikan Fungsi Loss (Loss Function).

Gradien dari fungsi loss terhadap bobot merepresentasikan arah peningkatan loss paling curam. Oleh karena itu, kita memperbarui bobot ke **arah berlawanan dari gradien**:
$$W_{baru} = W_{lama} - \\alpha \\cdot \\nabla L(W)$$

Di mana $\\alpha$ adalah Learning Rate.
- Jika $\\alpha$ terlalu besar: Model melompat melewati titik minimum dan bisa divergen.
- Jika $\\alpha$ terlalu kecil: Konvergensi sangat lambat dan berisiko terjebak pada plateau.`,
    analogy: 'Bayangkan kamu berada di puncak gunung berkabut tebal dan ingin turun ke lembah terendah. Kamu meraba kemiringan tanah di bawah kakimu (gradien) dan mengambil langkah menuruni arah paling curam (descent step).',
    keyDefinitions: [
      { term: 'Loss Function', definition: 'Fungsi matematika yang mengukur besarnya kesalahan prediksi model terhadap data aktual.' },
      { term: 'Gradient', definition: 'Vektor turunan parsial yang menunjukkan arah kenaikan tercepat dari suatu fungsi multivariat.' },
      { term: 'Learning Rate (Alpha)', definition: 'Hyperparameter yang menentukan ukuran langkah pada setiap iterasi pembaruan bobot.' },
    ],
    examples: [
      {
        title: 'Pembaruan Parameter Gradient Descent (Python)',
        language: 'python',
        code: `import numpy as np

def gradient_descent_step(w, learning_rate, gradient):
    # Rumus pembaruan parameter: W = W - lr * dL/dW
    w_updated = w - learning_rate * gradient
    return w_updated

# Contoh bobot awal dan gradien
w = 5.0
lr = 0.1
grad = 2.0 * w # Misal loss L = w^2, maka turunan dL/dw = 2*w

w = gradient_descent_step(w, lr, grad)
print(f"Bobot baru setelah 1 langkah: {w}") # Output: 4.0`,
        explanation: 'Dengan learning rate 0.1 dan gradien 10.0, langkah pengurangan adalah 1.0 sehingga bobot bergerak dari 5.0 mendekati titik minimum 0.0.',
        output: 'Bobot baru setelah 1 langkah: 4.0',
      },
    ],
    realWorldApplication: 'Pelatihan model regresi, neural network, penglihatan komputer (computer vision), hingga Large Language Models.',
    commonMisconceptions: [
      {
        misconception: 'Learning rate yang semakin besar akan selalu mempercepat model mencapai hasil terbaik.',
        correction: 'Learning rate yang terlalu besar menyebabkan "overshooting", di mana nilai loss justru meledak (divergen) dan tidak pernah konvergen.',
      },
      {
        misconception: 'Gradient descent selalu menemukan titik global minimum mutlak.',
        correction: 'Pada fungsi non-konveks (seperti deep neural networks), gradient descent biasa rentan terjebak di local minima atau saddle points.',
      },
    ],
    keyTakeaways: [
      'Gradien memberi tahu arah kenaikan; kita bergerak ke arah negatifnya untuk menurunkan loss.',
      'Learning rate adalah hyperparameter paling krusial untuk kestabilan konvergensi.',
      'Varian modern seperti Adam memadukan momentum dan adaptive learning rate untuk akselerasi.',
    ],
    checkpointQuestions: [
      {
        id: 'gd-q1',
        question: 'Mengapa tanda minus (-) digunakan pada rumus pembaruan bobot: W = W - alpha * Gradient?',
        options: [
          'Agar nilai bobot selalu menjadi bilangan negatif',
          'Karena gradien menunjuk arah kenaikan loss, sehingga kita harus bergerak ke arah berlawanan untuk meminimalkannya',
          'Hanya kebiasaan konvensi notasi matematika tanpa alasan fungsional',
          'Untuk membatalkan efek perkalian learning rate',
        ],
        correctIndex: 1,
        explanation: 'Gradien secara matematis adalah vektor peningkatan tercepat. Untuk meminimalkan kesalahan (loss), kita wajib melangkah ke arah sebaliknya (turun).',
        conceptTested: 'Direction of Gradient Descent',
      },
      {
        id: 'gd-q2',
        question: 'Apa dampak jika nilai learning rate (alpha) dipilih terlalu besar?',
        options: [
          'Model berhenti belajar pada iterasi pertama',
          'Waktu pelatihan menjadi 100x lebih lama tetapi pasti stabil',
          'Langkah pembaruan melompati titik minimum dan nilai loss bisa divergen (meledak)',
          'Gradien otomatis bernilai nol',
        ],
        correctIndex: 2,
        explanation: 'Langkah yang terlalu panjang membuat parameter terlempar keluar dari lembah konvergensi (overshooting), menyebabkan loss naik drastis.',
        conceptTested: 'Learning Rate Hyperparameter Dynamics',
      },
      {
        id: 'gd-q3',
        question: 'Kapan algoritma Gradient Descent idealnya berhenti melakukan iterasi?',
        options: [
          'Saat nilai gradien mendekati nol (kemiringan datar di titik minimum)',
          'Saat jumlah dataset mencapai batas maksimal',
          'Saat nilai bobot menjadi tepat 1.0',
          'Saat compiler komputer kehabisan memori',
        ],
        correctIndex: 0,
        explanation: 'Di titik minimum kurva loss, garis singgungnya horizontal sehingga gradien mendekati 0, artinya bobot sudah optimal.',
        conceptTested: 'Convergence Criteria',
      },
    ],
    videoScript: {
      conceptId: 'gradient-descent',
      title: 'Visualisasi Optimasi Gradient Descent',
      totalDurationSeconds: 48,
      scenes: [
        {
          id: 'sc-gd1',
          sceneNumber: 1,
          title: 'Permukaan Loss (Loss Landscape)',
          durationSeconds: 14,
          narration: 'Dalam Machine Learning, kurva loss mengukur seberapa besar kesalahan prediksi. Titik paling bawah kurva adalah kombinasi bobot terbaik yang ingin kita capai.',
          visualType: 'loss-landscape',
          visualState: {
            currentStep: 1,
            totalSteps: 4,
            lossPoint: { x: 80, y: 30, loss: 8.5, step: 0 },
            notes: 'Titik awal parameter berada di posisi loss tinggi (kesalahan besar).',
          },
          captions: [
            { startSeconds: 0, endSeconds: 7, text: 'Kurva loss menunjukkan tingkat kesalahan prediksi model.' },
            { startSeconds: 7, endSeconds: 14, text: 'Tujuan kita adalah menuntun parameter menuju dasar lembah (minimum loss).' },
          ],
        },
        {
          id: 'sc-gd2',
          sceneNumber: 2,
          title: 'Menghitung Kemiringan & Melangkah Turun',
          durationSeconds: 16,
          narration: 'Komputer menghitung turunan parsial atau gradien. Mengikuti arah negatif gradien, parameter digeser langkah demi langkah menuju lembah.',
          visualType: 'loss-landscape',
          visualState: {
            currentStep: 2,
            totalSteps: 4,
            lossPoint: { x: 50, y: 15, loss: 3.2, step: 5 },
            notes: 'Langkah pembaruan: W = W - alpha * gradien.',
          },
          captions: [
            { startSeconds: 14, endSeconds: 22, text: 'Gradien mengukur arah kemiringan permukaan loss saat ini.' },
            { startSeconds: 22, endSeconds: 30, text: 'Parameter dipindahkan menuruni lereng secara iteratif.' },
          ],
        },
        {
          id: 'sc-gd3',
          sceneNumber: 3,
          title: 'Konvergensi di Titik Optimal',
          durationSeconds: 18,
          narration: 'Saat mendekati dasar lembah, gradien mengecil hingga mendekati nol. Model telah mencapai titik konvergensi dengan akurasi prediksi maksimal.',
          visualType: 'loss-landscape',
          visualState: {
            currentStep: 3,
            totalSteps: 4,
            lossPoint: { x: 25, y: 5, loss: 0.12, step: 20 },
            notes: 'Konvergen! Gradien mendekati 0 di dasar lembah.',
          },
          captions: [
            { startSeconds: 30, endSeconds: 39, text: 'Semakin dekat ke dasar, ukuran langkah mengecil secara alami.' },
            { startSeconds: 39, endSeconds: 48, text: 'Model berhasil konvergen pada titik bobot optimal.' },
          ],
        },
      ],
    },
  },

  // ── Database: Indexing & B-Trees ─────────────────────────────
  'indexing-btree': {
    nodeId: 'indexing-btree',
    topic: 'db',
    title: 'Database Indexing & B-Trees',
    learningObjective: 'Memahami bagaimana indeks B-Tree mempercepat pencarian data dari pemindaian penuh O(N) menjadi O(log N).',
    targetLevel: 'intermediate',
    prerequisiteConcepts: ['relational-model'],
    summary: 'Indeks B-Tree adalah struktur data pohon seimbang yang memungkinkan sistem basis data mencari, menyisip, dan membaca rentang data dengan efisiensi blok I/O tinggi.',
    conceptExplanation: `Tanpa indeks, pencarian record pada tabel berukuran 10 juta baris mengharuskan database membaca seluruh baris dari hard disk (Full Table Scan / O(N)).

Indeks database bekerja seperti indeks alfabetis di buku tebal. Struktur default RDBMS adalah **B-Tree (Balanced Tree)** atau B+ Tree:
- Setiap node dapat menampung banyak key dan pointer (high fan-out).
- Seluruh daun (leaf nodes) berada pada kedalaman yang sama (seimbang secara deterministik).
- Mengurangi jumlah pembacaan blok disk (disk I/O) menjadi hanya setinggi pohon, biasanya 3 sampai 4 pembacaan saja untuk jutaan data.`,
    analogy: 'Mencari kata di kamus tebal 2000 halaman: alih-alih membaca kata per kata dari halaman 1 (Full Table Scan), kamu langsung membuka huruf awal kata tersebut di tepi kamus (B-Tree Index Scan).',
    keyDefinitions: [
      { term: 'Full Table Scan', definition: 'Pembacaan sekuensial seluruh blok tabel dari disk karena ketiadaan indeks yang relevan.' },
      { term: 'B-Tree', definition: 'Self-balancing search tree di mana node memiliki banyak anak, dirancang khusus untuk efisiensi media penyimpanan blok.' },
      { term: 'Composite Index', definition: 'Indeks yang mencakup kombinasi beberapa kolom sekaligus sesuai urutan selektivitas query.' },
    ],
    examples: [
      {
        title: 'Pembuatan dan Pengujian Indeks SQL',
        language: 'sql',
        code: `-- Tanpa indeks: Menghasilkan Sequential Scan O(N)
EXPLAIN ANALYZE 
SELECT * FROM users WHERE email = 'andi@example.com';

-- Menambahkan B-Tree Index pada kolom email
CREATE INDEX idx_users_email ON users(email);

-- Setelah indeks: Berubah menjadi Index Scan O(log N)
EXPLAIN ANALYZE 
SELECT * FROM users WHERE email = 'andi@example.com';`,
        explanation: 'Query planner beralih dari sequential disk scan menjadi pencarian traversal B-Tree dalam pecahan milidetik.',
      },
    ],
    realWorldApplication: 'Optimasi query login pengguna, pencarian produk e-commerce, dan filtering transaksi perbankan.',
    commonMisconceptions: [
      {
        misconception: 'Semakin banyak indeks yang kita buat pada sebuah tabel, semakin bagus performa database.',
        correction: 'Setiap operasi INSERT, UPDATE, dan DELETE mewajibkan database memperbarui seluruh indeks terkait, sehingga indeks berlebih memperlambat operasi penulisan (write penalty).',
      },
      {
        misconception: 'Indeks SQL otomatis digunakan meskipun kita membungkus kolom dalam fungsi seperti WHERE LOWER(email).',
        correction: 'Membungkus kolom dengan fungsi membatalkan penggunaan indeks standar kecuali dibuatkan Expression Index atau Functional Index khusus.',
      },
    ],
    keyTakeaways: [
      'Gunakan indeks pada kolom yang sering menjadi kriteria WHERE, JOIN, dan ORDER BY.',
      'Perhatikan trade-off antara kecepatan pembacaan (SELECT) dan biaya penulisan (INSERT/UPDATE).',
      'Gunakan EXPLAIN ANALYZE untuk memverifikasi apakah query benar-benar memanfaatkan Index Scan.',
    ],
    checkpointQuestions: [
      {
        id: 'idx-q1',
        question: 'Apa kompleksitas waktu pencarian record menggunakan B-Tree Index pada tabel dengan N baris data?',
        options: [
          'O(N) linier',
          'O(1) konstan mutlak',
          'O(log N) logaritmik',
          'O(N^2) kuadratik',
        ],
        correctIndex: 2,
        explanation: 'B-Tree membagi ruang pencarian secara proporsional pada setiap tingkatan pohon, menghasilkan kompleksitas logaritmik O(log N).',
        conceptTested: 'B-Tree Time Complexity',
      },
      {
        id: 'idx-q2',
        question: 'Mengapa kita sebaiknya TIDAK membuat indeks pada semua kolom di tabel database?',
        options: [
          'Database akan menolak menyalakan server jika kolom terlalu banyak indeks',
          'Setiap indeks menambah overhead waktu pada operasi penulisan (INSERT/UPDATE/DELETE) dan memakan ruang disk',
          'Indeks memperlambat query SELECT',
          'Data di tabel akan otomatis teracak secara acak',
        ],
        correctIndex: 1,
        explanation: 'Ketika baris baru dimasukkan, database harus memperbarui struktur pohon seluruh indeks yang ada di tabel tersebut.',
        conceptTested: 'Write Overhead & Indexing Trade-offs',
      },
      {
        id: 'idx-q3',
        question: 'Pada perintah SQL: SELECT * FROM pesanan WHERE LOWER(kode) = "abc", mengapa indeks pada kolom "kode" berpotensi tidak terpakai?',
        options: [
          'Karena B-Tree tidak mendukung data teks string',
          'Karena pemanggilan fungsi LOWER() mengubah evaluasi kolom sehingga indeks standar tidak dapat dicocokkan secara langsung',
          'Karena klausa WHERE dilarang menggunakan tanda sama dengan',
          'Karena query tidak menyertakan LIMIT',
        ],
        correctIndex: 1,
        explanation: 'Fungsi pada kolom menghilangkan kemampuan optimizer menggunakan nilai B-Tree yang telah diurutkan, kecuali dibuat functional index.',
        conceptTested: 'Index SARGability & Function Wrap',
      },
    ],
    videoScript: {
      conceptId: 'indexing-btree',
      title: 'Visualisasi Pencarian Data B-Tree',
      totalDurationSeconds: 48,
      scenes: [
        {
          id: 'sc-idx1',
          sceneNumber: 1,
          title: 'Masalah: Full Table Scan',
          durationSeconds: 14,
          narration: 'Mencari satu data di antara jutaan baris tanpa indeks memaksa database membaca seluruh data disk dari awal hingga akhir, membuang waktu dan resource.',
          visualType: 'data-flow',
          visualState: {
            currentStep: 1,
            totalSteps: 3,
            flowStages: [
              { id: 'f1', label: 'Disk Block 1', status: 'done' },
              { id: 'f2', label: 'Disk Block 2', status: 'done' },
              { id: 'f3', label: 'Disk Block 10.000...', status: 'active' },
            ],
            notes: 'Full Table Scan: Setiap baris diperiksa berurutan (O(N)).',
          },
          captions: [
            { startSeconds: 0, endSeconds: 7, text: 'Tanpa indeks, database membaca semua blok data dari disk.' },
            { startSeconds: 7, endSeconds: 14, text: 'Proses ini lambat dan membebani kapasitas I/O server.' },
          ],
        },
        {
          id: 'sc-idx2',
          sceneNumber: 2,
          title: 'Struktur Pohon B-Tree yang Seimbang',
          durationSeconds: 18,
          narration: 'Indeks B-Tree menata kunci data secara berurutan dalam pohon seimbang. Dari simpul root, database cukup menentukan anak cabang yang sesuai.',
          visualType: 'tree-structure',
          visualState: {
            treeNodes: [
              { id: 'r', label: 'Root [50]', isHighlighted: true },
              { id: 'l1', label: 'Cabang Kiri [20]', isHighlighted: false },
              { id: 'l2', label: 'Cabang Kanan [80]', isHighlighted: true },
              { id: 'leaf', label: 'Target Leaf [75, 80]', isHighlighted: true },
            ],
            notes: 'Pencarian angka 80 hanya membutuhkan 3 lompatan simpul.',
          },
          captions: [
            { startSeconds: 14, endSeconds: 23, text: 'B-Tree membagi data ke cabang-cabang yang seimbang secara hierarkis.' },
            { startSeconds: 23, endSeconds: 32, text: 'Pencarian langsung melompat ke cabang yang tepat dalam waktu O(log N).' },
          ],
        },
        {
          id: 'sc-idx3',
          sceneNumber: 3,
          title: 'Hasil: Index Scan Kilat',
          durationSeconds: 16,
          narration: 'Dengan hanya membaca tiga hingga empat simpul, record yang dicari langsung ditemukan dalam hitungan fraksi milidetik.',
          visualType: 'code-execution',
          visualState: {
            highlightedLine: 4,
            variables: { 'search_mode': 'Index Scan', 'cost_time_ms': 0.12, 'rows_scanned': 1 },
            notes: 'Index Scan berhasil menemukan data tanpa memindai sisa tabel.',
          },
          captions: [
            { startSeconds: 32, endSeconds: 40, text: 'Database langsung mengambil baris spesifik dari media penyimpanan.' },
            { startSeconds: 40, endSeconds: 48, text: 'Hasil query selesai dalam waktu kurang dari satu milidetik.' },
          ],
        },
      ],
    },
  },

  // ── Web: Asynchronous JavaScript & Event Loop ────────────────
  'async-js': {
    nodeId: 'async-js',
    topic: 'web',
    title: 'Async JavaScript & Event Loop',
    learningObjective: 'Memahami bagaimana JavaScript mengeksekusi operasi non-blocking menggunakan Call Stack, Web APIs, Microtask Queue, dan Task Queue.',
    targetLevel: 'intermediate',
    prerequisiteConcepts: ['js-dom'],
    summary: 'JavaScript bersifat single-threaded, namun dapat menangani operasi asinkron secara non-blocking berkat arsitektur Event Loop browser.',
    conceptExplanation: `Meskipun JavaScript hanya memiliki satu Call Stack utama, browser menyediakan API eksternal (Fetch, Timer, DOM events).

Alur eksekusi Event Loop:
1. **Call Stack:** Mengeksekusi instruksi sinkron hingga kosong.
2. **Web APIs:** Menangani pekerjaan latar belakang (HTTP request, setTimeout).
3. **Microtask Queue (Prioritas Tinggi):** Menampung callback Promise (.then, await, queueMicrotask).
4. **Task / Macrotask Queue:** Menampung callback setTimeout, setInterval.
5. **Event Loop:** Jika Call Stack kosong, ia akan menguras seluruh Microtask Queue terlebih dahulu sebelum mengambil satu tugas dari Macrotask Queue.`,
    analogy: 'Restoran dengan satu kasir (Call Stack). Saat pesanan butuh waktu masak (operasi async), kasir memberi nomor antrean dan melayani pelanggan berikutnya alih-alih berdiam diri menunggu makanan matang.',
    keyDefinitions: [
      { term: 'Single-Threaded', definition: 'Hanya memiliki satu alur eksekusi aktif (satu Call Stack pada satu waktu).' },
      { term: 'Event Loop', definition: 'Mekanisme loop yang bertugas memindahkan callback dari antrean ke Call Stack saat stack kosong.' },
      { term: 'Microtask Queue', definition: 'Antrean callback Promise yang diprioritaskan sebelum antrean macrotask dieksekusi.' },
    ],
    examples: [
      {
        title: 'Tebak Urutan Output Event Loop',
        language: 'javascript',
        code: `console.log('1: Sinkron');

setTimeout(() => {
  console.log('2: Macrotask (Timeout)');
}, 0);

Promise.resolve().then(() => {
  console.log('3: Microtask (Promise)');
});

console.log('4: Sinkron');

// Output:
// 1: Sinkron
// 4: Sinkron
// 3: Microtask (Promise)
// 2: Macrotask (Timeout)`,
        explanation: 'Instruksi sinkron (1, 4) jalan duluan. Lalu Call Stack kosong -> Microtask (3) dikuras -> barulah Macrotask (2) dipanggil.',
        output: '1 -> 4 -> 3 -> 2',
      },
    ],
    realWorldApplication: 'Mengambil data dari server API tanpa membekukan (freezing) antarmuka tombol di layar pengguna.',
    commonMisconceptions: [
      {
        misconception: 'setTimeout(fn, 0) akan dieksekusi secara instan saat itu juga sebelum baris berikutnya.',
        correction: 'setTimeout selalu masuk ke Task Queue dan menunggu Call Stack bersih serta antrean Microtask selesai.',
      },
    ],
    keyTakeaways: [
      'Jangan memblokir Call Stack dengan komputasi berat sinkron.',
      'Promise dan async/await memiliki prioritas lebih tinggi daripada setTimeout via Microtask Queue.',
    ],
    checkpointQuestions: [
      {
        id: 'as-q1',
        question: 'Pada kode: console.log("A"); Promise.resolve().then(() => console.log("B")); console.log("C"); apa urutan outputnya?',
        options: ['A, B, C', 'B, A, C', 'A, C, B', 'C, B, A'],
        correctIndex: 2,
        explanation: 'Kode sinkron A dan C dieksekusi di Call Stack. Setelah Call Stack kosong, callback B di Microtask Queue dieksekusi.',
        conceptTested: 'Event Loop Execution Priority',
      },
      {
        id: 'as-q2',
        question: 'Antrean mana yang memiliki prioritas lebih tinggi untuk dieksekusi oleh Event Loop setelah Call Stack kosong?',
        options: [
          'Macrotask Queue (setTimeout)',
          'Microtask Queue (Promise / await)',
          'Prioritasnya selalu diundi secara acak',
          'Tergantung pada kecepatan koneksi internet',
        ],
        correctIndex: 1,
        explanation: 'Event Loop selalu mengosongkan seluruh antrean Microtask sebelum mengambil satu tugas dari Macrotask Queue.',
        conceptTested: 'Microtask vs Macrotask Queue',
      },
      {
        id: 'as-q3',
        question: 'Mengapa operasi pengambilan data HTTP sebaiknya menggunakan asinkron (fetch) bukan sinkron?',
        options: [
          'Agar seluruh halaman web dan UI browser tidak membeku (freeze) selama menunggu respons server',
          'Karena operasi sinkron dilarang oleh protokol HTTP',
          'Operasi asinkron otomatis menyimpan data ke hard disk secara permanen',
          'Operasi asinkron menggandakan kecepatan download 10x lipat',
        ],
        correctIndex: 0,
        explanation: 'Sifat single-threaded JavaScript berarti pemanggilan sinkron yang lambat akan memblokir rendering dan interaksi pengguna di browser.',
        conceptTested: 'Non-blocking I/O Motivation',
      },
    ],
    videoScript: {
      conceptId: 'async-js',
      title: 'Visualisasi Alur Event Loop JavaScript',
      totalDurationSeconds: 45,
      scenes: [
        {
          id: 'sc-as1',
          sceneNumber: 1,
          title: 'Call Stack Tunggal',
          durationSeconds: 12,
          narration: 'JavaScript hanya memiliki satu Call Stack. Operasi sinkron dieksekusi langsung satu per satu di dalamnya.',
          visualType: 'code-execution',
          visualState: {
            highlightedLine: 1,
            variables: { 'call_stack': 'Active', 'ui_responsive': true },
            notes: 'Kode sinkron dieksekusi langsung di Call Stack.',
          },
          captions: [
            { startSeconds: 0, endSeconds: 6, text: 'JavaScript mengeksekusi instruksi di satu Call Stack utama.' },
            { startSeconds: 6, endSeconds: 12, text: 'Instruksi sinkron diproses berurutan hingga tuntas.' },
          ],
        },
        {
          id: 'sc-as2',
          sceneNumber: 2,
          title: 'Delegasi Web API & Antrean Antrian',
          durationSeconds: 16,
          narration: 'Saat menemukan Promise atau timer, tugas didelegasikan ke Web API. Setelah selesai, callback masuk ke Microtask Queue dan Task Queue.',
          visualType: 'data-flow',
          visualState: {
            flowStages: [
              { id: 'p1', label: 'Call Stack', status: 'done' },
              { id: 'p2', label: 'Microtask Queue (Promise)', status: 'active' },
              { id: 'p3', label: 'Task Queue (Timer)', status: 'pending' },
            ],
            notes: 'Microtask Queue selalu diprioritaskan sebelum Macrotask.',
          },
          captions: [
            { startSeconds: 12, endSeconds: 20, text: 'Operasi asinkron didelegasikan ke latar belakang browser.' },
            { startSeconds: 20, endSeconds: 28, text: 'Callback Promise masuk ke antrean Microtask berprioritas tinggi.' },
          ],
        },
        {
          id: 'sc-as3',
          sceneNumber: 3,
          title: 'Event Loop Menguras Antrean',
          durationSeconds: 17,
          narration: 'Event Loop memeriksa Call Stack. Begitu stack kosong, ia menguras Microtask Queue, lalu melanjutkan ke callback timer.',
          visualType: 'code-execution',
          visualState: {
            highlightedLine: 8,
            variables: { 'microtask_done': true, 'output_order': '1 -> 4 -> 3 -> 2' },
            notes: 'Output teratur tanpa memblokir thread utama.',
          },
          captions: [
            { startSeconds: 28, endSeconds: 37, text: 'Event Loop memindahkan callback Microtask begitu Call Stack bersih.' },
            { startSeconds: 37, endSeconds: 45, text: 'Antarmuka tetap responsif selama proses berlangsung.' },
          ],
        },
      ],
    },
  },
};
