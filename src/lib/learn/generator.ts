// ================================================================
// PIJAR - Dynamic Learning Material & Video Script Generator (F4)
// Caches, validates, and dynamically generates concept lessons.
// ================================================================

import { generateStructuredJSON } from '../ai/provider.ts';
import { CURATED_MATERIALS } from './curated-materials.ts';
import type { DetailedLearningMaterial, VisualSceneType } from './types.ts';
import { sanitizeScenesMath } from './math-spec.ts';
import { sanitizeVideoScript } from './scene-normalize.ts';
import { buildFallbackVideo } from './scene-fallback.ts';
import { SCENE_PROMPT_GUIDE } from './scene-prompt.ts';
import { sanitizeMaterialBoard } from './board-spec.ts';
import { MATH_FORMAT_NOTE } from './math-text.ts';
import { materialCacheKeys, type LessonLanguage } from './cache-key.ts';

// In-memory cache for ultra-fast, zero-cost reads during runtime
const MEMORY_CACHE = new Map<string, DetailedLearningMaterial>();

// Seed memory cache with curated materials
for (const [key, material] of Object.entries(CURATED_MATERIALS)) {
  MEMORY_CACHE.set(key, material);
}

export interface MaterialGenerationParams {
  topic: string;
  nodeId: string;
  nodeLabel?: string;
  nodeCategory?: string;
  nodeDescription?: string;
  prerequisites?: string[];
  forceRegenerate?: boolean;
  /** Interface language of the lesson. Default 'id'. */
  language?: LessonLanguage;
}

/**
 * Validates the runtime structure of generated learning material.
 */
function validateMaterialContract(data: DetailedLearningMaterial): data is DetailedLearningMaterial {
  if (!data || typeof data !== 'object') return false;
  if (!data.nodeId || !data.title || !data.learningObjective || !data.conceptExplanation) return false;
  if (!Array.isArray(data.examples) || data.examples.length === 0) return false;
  if (!Array.isArray(data.checkpointQuestions) || data.checkpointQuestions.length === 0) return false;

  // Validate questions
  for (const q of data.checkpointQuestions) {
    if (!q.id || !q.question || !Array.isArray(q.options) || q.options.length < 2) return false;
    if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.options.length) return false;
  }

  // Validate video script
  if (!data.videoScript || !Array.isArray(data.videoScript.scenes) || data.videoScript.scenes.length === 0) {
    return false;
  }

  // Math specs are optional extras: bad ones are dropped, never fail the material.
  sanitizeScenesMath(data);
  sanitizeVideoScript(data); // stage/recipe scenes validated, old shapes left for the reader to convert
  sanitizeMaterialBoard(data); // interactiveBoard: cleaned or removed

  return true;
}

const NON_MATH_DOMAINS = /\b(sql|database|db|query|relational|postgres|mysql|sqlite|nosql|table|column|schema|backend|frontend|web|javascript|typescript|python|golang|react|dsa|rekursi|stack|queue|tree|graph)\b/i;

// Section plan and example rules for the lesson text. The code plan talks about syntax and execution, which is wrong for a math lesson.
const CODE_TEXT_RULES = `   - ### 1. Latar Belakang & Masalah (Kenapa konsep ini diciptakan)
   - ### 2. Prinsip Kerja & Mekanisme Internal (Under the hood)
   - ### 3. Aturan Sintaksis & Alur Eksekusi
   - ### 4. Skenario Eksekusi Langkah demi Langkah (Step-by-step trace)
   - ### 5. Best Practice & Optimasi Performa
2. "examples" HARUS berisi 2 sampai 3 contoh kode progresif:
   - Contoh 1: Sintaks fundamental / kanonikal dasar.
   - Contoh 2: Kasus penggunaan di lingkungan produksi nyata.
   - Contoh 3 (opsional): Edge case, penanganan error, atau optimasi performa.`;

const MATH_TEXT_RULES = `   - ### 1. Latar Belakang & Masalah (Kenapa konsep ini penting)
   - ### 2. Gagasan Inti & Intuisi
   - ### 3. Definisi & Aturan Utama
   - ### 4. Contoh Pengerjaan Langkah demi Langkah
   - ### 5. Kesalahan Umum & Tips Mengerjakan Soal
   Ini pelajaran matematika: jangan memakai istilah pemrograman (sintaks, eksekusi, compiler, performa).
2. "examples" HARUS berisi 2 sampai 3 contoh soal progresif beserta penyelesaiannya:
   - Contoh 1: Soal dasar yang langsung menerapkan definisi atau aturan.
   - Contoh 2: Soal penerapan di situasi nyata.
   - Contoh 3 (opsional): Soal dengan jebakan atau kasus khusus.
   Isi "code" dengan langkah pengerjaan dalam LaTeX (tanpa tanda $), dan isi "language" dengan "latex".`;

const MATH_WORDS = /\b(?:kalkulus|calculus|vektor|vector|turunan|derivative|integral|limit|rasio|ratio|perbandingan|eksponen|exponen|aljabar|algebra|matematika|\bmath\b|gradien|slope|trigonometri|trigonometry|sinus|cosinus|persamaan\s+kuadrat|parabola)\b/i;

/** True when the lesson is about mathematical concepts (calculus, linear algebra, vectors, derivatives, trigonometry). */
function isMathTopic(params: { topic: string; nodeId: string; nodeLabel?: string; nodeDescription?: string }): boolean {
  const combined = `${params.topic} ${params.nodeId} ${params.nodeLabel ?? ''} ${params.nodeDescription ?? ''}`;
  // Strictly prevent database/programming domains from false-positive math categorization
  if (NON_MATH_DOMAINS.test(params.topic) && !/\b(kalkulus|calculus|aljabar|algebra|trigonometri|vektor|vector|matematika)\b/i.test(params.topic)) {
    return false;
  }
  const { visualType } = getTopicLanguage(params.topic, params.nodeId);
  return visualType === 'math-visualization' || MATH_WORDS.test(combined);
}

function pickMathRecipe(text: string): string {
  if (/vektor|vector/i.test(text)) return 'vector-add';
  if (/integral|luas|area/i.test(text)) return 'area-riemann';
  if (/rasio|ratio|perbandingan/i.test(text)) return 'ratio';
  if (/limit/i.test(text)) return 'limit-approach';
  if (/matriks|matrix/i.test(text)) return 'matrix-transform';
  if (/sin|cos|trigon|lingkaran|circle/i.test(text)) return 'unit-circle';
  if (/turunan|derivative|gradien|slope|singgung|tangent/i.test(text)) return 'derivative-tangent';
  return 'function-plot';
}

// --- interactive board prompt (board-spec.ts is the contract) ---
const BOARD_PROMPT_GUIDE = `
PAPAN INTERAKTIF (WAJIB untuk topik matematika ini): tambahkan field "interactiveBoard" di level atas materi (sejajar dengan "videoScript"), berupa JSON deklaratif (bukan kode). Fungsi pada papan harus fungsi yang dibahas pelajaran ini (misalnya sin(x) untuk turunan sinus), bukan contoh lain.
Cara singkat, pakai resep: {"recipe":"derivative-tangent","params":{"expr":"x^2","x0":1},"instruction":"...","learningGoal":"..."}
Resep: derivative-tangent, secant-tangent, riemann-sum, vector-addition, unit-circle, function-transform, quadratic-explorer.
Atau kustom: {"learningGoal":"...","instruction":"...","viewBox":{"x":[-6,6],"y":[-4,8]},"sliders":[{"name":"a","min":-3,"max":3,"step":0.1,"initial":1}],"curves":[{"expr":"a*x^2"}],"gliders":[{"on":"f","x":1}],"tangents":[{"at":"P"}],"readouts":[{"label":"Kemiringan","kind":"slope","ref":"P"}]}
Batas: sliders maks 4 (nama salah satu a b c d h k m n t), curves maks 3, gliders maks 2. Rumus memakai x dan nama slider, perkalian selalu ditulis dengan *.
"instruction" satu kalimat perintah untuk siswa (contoh: "Geser titik P sepanjang kurva dan amati kemiringan garis singgung."), "learningGoal" satu kalimat tujuan. Teks polos tanpa LaTeX.`;


/**
 * Determines appropriate programming language or notation based on curriculum topic.
 */
function getTopicLanguage(topic: string, nodeId: string): { lang: string; visualType: VisualSceneType } {
  const t = topic.toLowerCase();
  const n = nodeId.toLowerCase();

  if (t.includes('machine') || t.includes('ml') || t.includes('ai')) {
    return { lang: 'python', visualType: n.includes('grad') || n.includes('loss') ? 'loss-landscape' : 'concept-illustration' };
  }
  if ((t.includes('data') && t.includes('base')) || t.includes('db') || t.includes('sql') || t.includes('query')) {
    return { lang: 'sql', visualType: n.includes('tree') || n.includes('index') || n.includes('btree') ? 'tree-structure' : 'data-flow' };
  }
  if (t.includes('math') || t.includes('diskrit') || t.includes('matematika') || t.includes('kalkulus') || t.includes('aljabar')) {
    return { lang: 'latex', visualType: 'math-visualization' };
  }
  if (t.includes('web') || t.includes('react') || t.includes('frontend')) {
    return { lang: 'typescript', visualType: 'code-execution' };
  }
  if (t.includes('stat') || t.includes('probabilitas')) {
    return { lang: 'python', visualType: 'math-visualization' };
  }
  // A maths concept whose topic text has no 'math' word (e.g. "Aljabar dasar") must not default to TypeScript examples.
  if (MATH_WORDS.test(`${topic} ${nodeId}`) && !NON_MATH_DOMAINS.test(topic)) {
    return { lang: 'latex', visualType: 'math-visualization' };
  }
  return { lang: 'typescript', visualType: n.includes('stack') || n.includes('rekursi') ? 'call-stack' : 'code-execution' };
}

/**
 * Creates an intelligent topic-aware fallback if AI provider is offline.
 */
export function buildTopicAwareFallback(params: MaterialGenerationParams): DetailedLearningMaterial {
  const { topic, nodeId, nodeLabel, nodeCategory, nodeDescription, prerequisites } = params;
  const label = nodeLabel || nodeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const category = nodeCategory || 'Konsep Kurikulum';
  const desc = nodeDescription || `Konsep fundamental dalam kurikulum ${topic}.`;
  const { lang, visualType: baseVisual } = getTopicLanguage(topic, nodeId);
  const mathy = isMathTopic(params);

  const isSql = lang === 'sql' || /sql|database|query/i.test(`${topic} ${nodeId}`);

  return {
    nodeId,
    topic,
    title: label,
    learningObjective: `Menguasai konsep esensial, arsitektur logika, eksekusi nyata, dan pertimbangan performa dari ${label}.`,
    targetLevel: 'intermediate',
    prerequisiteConcepts: prerequisites || [],
    summary: `${label} adalah bagian penting dalam domain ${category}. ${desc}`,
    conceptExplanation: `Konsep **${label}** memegang peranan krusial dalam domain **${topic}**.
Ketika merancang arsitektur perangkat lunak atau memproses data berskala besar, ${label} menyediakan kerangka kerja terstruktur untuk memastikan efisiensi, integritas, dan keandalan sistem.

### 1. Latar Belakang & Masalah yang Diselesaikan
Sebelum adanya ${label}, pengembang dan arsitek data menghadapi tantangan signifikan dalam mengelola kompleksitas komputasi dan memori. Penerapan konsep ini mencegah inefisiensi, mengurangi potensi kesalahan logika runtime, dan memastikan operasi sistem berjalan secara deterministik.

### 2. Prinsip Kerja & Arsitektur Logika
${label} beroperasi dengan aturan terdefinisi:
- **Validasi Input:** Memastikan setiap argumen atau parameter memenuhi kontrak tipe dan kondisi batas.
- **Eksekusi Terisolasi:** Proses komputasi berlangsung tanpa efek samping tak terkontrol (side-effects) terhadap state eksternal.
- **Deterministik:** Untuk masukan yang identik, sistem menjamin keluaran yang konsisten dan dapat diprediksi.

### 3. Skenario Eksekusi Langkah demi Langkah
1. Sistem menginisialisasi parameter atau membaca query/statement awal.
2. Mesin mengevaluasi kondisi batas dan alokasi sumber daya.
3. Operasi inti dieksekusi secara efisien sesuai indeks dan struktur data yang relevan.
4. Hasil akhir dikembalikan dalam format yang siap dikonsumsi oleh lapisan presentasi atau layer pemanggil.

### 4. Best Practice & Rekomendasi Performa
- **Optimasi Kompleksitas:** Perhatikan efisiensi waktu eksekusi (Time Complexity) dan penggunaan memori (Space Complexity).
- **Penanganan Edge Case:** Selalu uji skenario ekstrim (nilai kosong, data batas, konkurensi).
- **Clean Architecture:** Pisahkan logika bisnis inti dari manipulasi infrastruktur langsung.`,
    analogy: `Ibaratkan ${label} seperti pondasi tiang utama pada sebuah jembatan: memastikan seluruh komponen di atasnya bekerja secara kokoh tanpa kegagalan struktural.`,
    keyDefinitions: [
      { term: label, definition: desc },
      { term: category, definition: `Kelompok bidang kajian dalam domain ${topic}.` },
      { term: 'Eksekusi Deterministik', definition: 'Karakteristik komputasi yang selalu menghasilkan output identik untuk input yang sama.' },
    ],
    examples: [
      {
        title: `Implementasi Fundamental ${label}`,
        language: lang,
        code: isSql
          ? `-- 1. Query dasar untuk ${label}\nSELECT id, nama_item, status_aktif\nFROM entitas_${nodeId.replace(/-/g, '_')}\nWHERE status_aktif = TRUE\nORDER BY created_at DESC\nLIMIT 10;`
          : lang === 'python'
          ? `# 1. Implementasi dasar untuk ${label}\ndef execute_${nodeId.replace(/-/g, '_')}(data: list[int]) -> dict[str, int]:\n    \"\"\"Menjalankan pemrosesan dasar ${label}\"\"\"\n    total = sum(data)\n    return {"count": len(data), "total": total}\n\nres = execute_${nodeId.replace(/-/g, '_')}([10, 20, 30])\nprint(res)`
          : `// 1. Implementasi dasar untuk ${label}\nexport function execute${nodeId.replace(/-/g, '')}(items: string[]): { count: number; valid: boolean } {\n  console.log("Memproses ${label}...");\n  return { count: items.length, valid: items.length > 0 };\n}`,
        explanation: `Contoh di atas mendemonstrasikan pola penulisan paling fundamental untuk ${label} dengan penanganan parameter yang bersih.`,
      },
      {
        title: `Penerapan Tingkat Lanjut & Produksi`,
        language: lang,
        code: isSql
          ? `-- 2. Query analitik produksi dengan agregasi dan filter optimal\nSELECT\n  kategori,\n  COUNT(*) AS total_transaksi,\n  AVG(nilai_nominal) AS rata_rata_nominal\nFROM transaksi_${nodeId.replace(/-/g, '_')}\nWHERE created_at >= NOW() - INTERVAL '30 days'\nGROUP BY kategori\nHAVING COUNT(*) >= 5\nORDER BY total_transaksi DESC;`
          : lang === 'python'
          ? `# 2. Pemrosesan produksi dengan penanganan error dan efisiensi memori\nfrom typing import Generator\n\ndef stream_${nodeId.replace(/-/g, '_')}(batch_size: int = 100) -> Generator[list[int], None, None]:\n    \"\"\"Generator untuk memproses data berukuran besar tanpa memory spike\"\"\"\n    for start in range(0, 1000, batch_size):\n        yield list(range(start, start + batch_size))\n\nfor chunk in stream_${nodeId.replace(/-/g, '_')}():\n    pass # Eksekusi pipeline produksi`
          : `// 2. Pola produksi asinkron dengan validasi ketat\nexport async function process${nodeId.replace(/-/g, '')}Production<T>(\n  records: T[],\n  validator: (record: T) => boolean\n): Promise<{ successful: number; failed: number }> {\n  const validRecords = records.filter(validator);\n  return { successful: validRecords.length, failed: records.length - validRecords.length };\n}`,
        explanation: `Contoh lanjutan ini mengilustrasikan standar produksi dengan pertimbangan skalabilitas, filter data, dan pencegahan lonjakan konsumsi memori.`,
      },
    ],
    realWorldApplication: `Digunakan secara luas di industri teknologi modern untuk skalabilitas, integritas data, dan stabilitas performa sistem ${topic}.`,
    commonMisconceptions: [
      {
        misconception: `Menganggap ${label} hanya konsep teoritis tanpa dampak langsung di lingkungan produksi.`,
        correction: `Di lingkungan riil, pemahaman yang keliru terhadap ${label} menyebabkan bug arsitektural, inefisiensi query/komputasi, dan kebocoran sumber daya sistem.`,
      },
      {
        misconception: `Mengabaikan kondisi batas (edge cases) karena menganggap input data selalu valid.`,
        correction: `Produksi selalu menghadapi data anomali atau nilai null; validasi defensif mutlak diperlukan.`,
      },
    ],
    keyTakeaways: [
      `Kuasai alur berpikir konseptual dan arsitektur logika sebelum menulis baris kode.`,
      `Perhatikan batasan kompleksitas algoritma dan integritas data di setiap langkah eksekusi.`,
      `Validasi pemahamanmu melalui checkpoint quiz berbobot berikut.`,
    ],
    checkpointQuestions: [
      {
        id: `${nodeId}-q1`,
        question: `Apa fungsi dan peran terpenting dari konsep "${label}" dalam domain ${topic}?`,
        options: [
          `Menjadi fondasi logis yang menjamin efisiensi dan kebenaran alur komputasi`,
          `Hanya sebagai penamaan variabel formal tanpa dampak fungsional`,
          `Menggantikan seluruh perangkat keras komputer secara fisik`,
          `Menghapus kebutuhan pengujian perangkat lunak`,
        ],
        correctIndex: 0,
        explanation: `${label} adalah pilar logis utama dalam kurikulum ${topic} yang mendasari struktur dan efisiensi algoritma.`,
        conceptTested: `${label} Core Objective`,
      },
      {
        id: `${nodeId}-q2`,
        question: `Mengapa penting menguasai materi prasyarat sebelum mendalami "${label}"?`,
        options: [
          `Karena bahasa pemrograman tidak bisa diinstal tanpa materi prasyarat`,
          `Karena logika ${label} bertumpu langsung pada abstraksi konsep sebelumnya`,
          `Hanya aturan opsional yang tidak berpengaruh pada pemahaman`,
          `Agar file kode memiliki ukuran lebih kecil`,
        ],
        correctIndex: 1,
        explanation: `Knowledge Graph Pijar dirancang secara berjenjang; memahami prasyarat mencegah kesenjangan pemikiran (knowledge gap).`,
        conceptTested: `Prerequisite Dependency`,
      },
      {
        id: `${nodeId}-q3`,
        question: `Dalam praktik nyata, apa risiko mengabaikan kaidah "${label}"?`,
        options: [
          `Komputer akan otomatis mati seketika`,
          `Sistem rentan mengalami inefisiensi, kesalahan logika, atau kegagalan komputasi`,
          `Tidak ada risiko apapun`,
          `Kecepatan internet otomatis menurun drastis`,
        ],
        correctIndex: 1,
        explanation: `Kegagalan memahami kaidah ${label} di lingkungan riil sering menyebabkan bug tersembunyi dan inefisiensi sistem.`,
        conceptTested: `Real-world Impact`,
      },
    ],
    videoScript: buildFallbackVideo({ nodeId, label, topic, category, desc, mathy, visual: baseVisual, mathRecipe: pickMathRecipe(`${label} ${nodeId} ${desc}`), language: params.language ?? 'id' }),
  };
}

/** The lesson is the heaviest call (long JSON plus scene DSL), so it gets a longer walk of the model chain than the global 45 s. */
const LESSON_BUDGET_MS = Number(process.env.AI_LESSON_BUDGET_MS ?? 90_000);

/**
 * Retrieves or generates rich structured learning material and video script.
 * Tiered Cache Architecture: Memory Cache -> Supabase Cloud DB -> AI Generation -> Topic Fallback.
 */
export async function getOrGenerateMaterial(params: MaterialGenerationParams): Promise<DetailedLearningMaterial> {
  const { topic, nodeId, forceRegenerate = false, language = 'id' } = params;
  const { memoryKey: cacheKey, dbTopic, useCurated } = materialCacheKeys(topic, nodeId, language);

  // 1. Memory Cache Hit
  if (!forceRegenerate && MEMORY_CACHE.has(cacheKey)) {
    return MEMORY_CACHE.get(cacheKey)!;
  }
  if (!forceRegenerate && useCurated && MEMORY_CACHE.has(nodeId)) {
    return MEMORY_CACHE.get(nodeId)!;
  }

  // 2. Supabase DB Cache Lookup (non-blocking if table not yet migrated)
  if (!forceRegenerate) {
    try {
      const { createClient } = await import('../supabase/server.ts');
      const supabase = await createClient();
      const { data: cachedRow } = await supabase
        .from('concept_materials')
        .select('material_json')
        .eq('topic', dbTopic)
        .eq('node_id', nodeId)
        .maybeSingle();

      if (cachedRow?.material_json && validateMaterialContract(cachedRow.material_json)) {
        MEMORY_CACHE.set(cacheKey, cachedRow.material_json);
        return cachedRow.material_json;
      }
    } catch {
      // Table might not exist yet; safe fallback
    }
  }

  // 3. AI Generation with Gemini / OpenAI
  const { lang, visualType } = getTopicLanguage(topic, nodeId);
  const nodeLabel = params.nodeLabel || nodeId.replace(/-/g, ' ');
  const nodeDesc = params.nodeDescription || 'Konsep kurikulum';
  const mathTopic = isMathTopic(params);
  const mathGuide = SCENE_PROMPT_GUIDE + (mathTopic ? BOARD_PROMPT_GUIDE : '');

  const systemInstruction = `Kamu adalah Principal Curriculum Architect dan Senior Learning Experience Designer di Pijar.
Tugasmu adalah menghasilkan materi edukasi berbobot ilmiah tinggi, intuitif, ramah pembelajar, komprehensif (mendalam, bukan ringkasan pendek), dan skrip video visual interaktif untuk konsep teknologi.
${language === 'en'
    ? 'Write ALL learner-facing text (titles, explanations, analogy, definitions, code comments, quiz, narration, captions) in clear, natural English. Keep the JSON keys exactly as in the schema.'
    : 'Semua teks harus dalam Bahasa Indonesia edukatif yang profesional, jelas, bernas, dan kaya contoh nyata.'}
KEMBALIKAN HANYA JSON VALID SESUAI FORMAT SCHEMA.`;

  const prompt = `Buatkan materi pembelajaran komprehensif, mendalam, dan skrip video interaktif untuk konsep berikut:
- Topik Kurikulum: "${topic}"
- ID Konsep (nodeId): "${nodeId}"
- Nama Konsep: "${nodeLabel}"
- Deskripsi: "${nodeDesc}"
- Bahasa Kode Relevan: "${lang}"
- Petunjuk jenis visual: "${visualType}"

ATURAN MATERI TEKS:
1. "conceptExplanation" HARUS mendalam dan terstruktur rapi menggunakan Markdown (minimal 400 - 800 kata). Wajib mencakup:
${mathTopic ? MATH_TEXT_RULES : CODE_TEXT_RULES}
3. "keyDefinitions" minimal 3 istilah kunci yang jelas.
4. "commonMisconceptions" minimal 2 miskonsepsi umum beserta pelurusan logikanya.

ATURAN SKRIP VIDEO:
1. Total durasi video sekitar 80 sampai 120 detik, terdiri dari 4 sampai 5 scene pedagogis:
   - Scene 1: Pengantar & Motivasi Masalah (18-24 detik).
   - Scene 2: Anatomi Logika & Struktur Inti (20-28 detik).
   - Scene 3: Simulasi Alur / Pipeline / Eksekusi (20-28 detik).
   - Scene 4: Studi Kasus Riil / Code-walk / Best Practice (20-28 detik).
   - Scene 5 (opsional): Rangkuman Kunci & Persiapan Kuis (16-22 detik).
2. Teks "narration" per scene sekitar 45 sampai 75 kata. Narasi harus mengalir tenang, edukatif, dan to-the-point.
3. PENTING: JANGAN PERNAH menyertakan instruksi pembacaan atau kata pengantar meta (seperti "baca dengan nada...", "tempo sedang:", "narasi:", dsb) di dalam teks narration maupun caption. Teks narration adalah kalimat yang langsung diucapkan oleh narator.

FORMAT JSON YANG WAJIB DIHASILKAN:
{
  "nodeId": "${nodeId}",
  "topic": "${topic}",
  "title": "${nodeLabel}",
  "learningObjective": "Tujuan pembelajaran konseptual yang spesifik dan terukur...",
  "targetLevel": "intermediate",
  "prerequisiteConcepts": ["nama-prasyarat-1"],
  "summary": "Ringkasan 2 kalimat tentang esensi konsep...",
  "conceptExplanation": "Penjelasan mendalam menggunakan Markdown, struktur jelas, poin-poin kunci...",
  "analogy": "Analogi dunia nyata yang sangat mudah dipahami...",
  "keyDefinitions": [
    { "term": "Istilah 1", "definition": "Definisi jelas..." },
    { "term": "Istilah 2", "definition": "Definisi jelas..." },
    { "term": "Istilah 3", "definition": "Definisi jelas..." }
  ],
  "examples": [
    {
      "title": "Judul Contoh 1 (Fundamental)",
      "language": "${lang}",
      "code": "Kode program yang valid, rapi, dan memiliki komentar penjelas...",
      "explanation": "Penjelasan alur eksekusi baris demi baris..."
    },
    {
      "title": "Judul Contoh 2 (Kasus Produksi Nyata)",
      "language": "${lang}",
      "code": "Kode produksi nyata...",
      "explanation": "Penjelasan skenario riil..."
    }
  ],
  "realWorldApplication": "Penerapan di industri teknologi modern...",
  "commonMisconceptions": [
    {
      "misconception": "Miskonsepsi umum siswa...",
      "correction": "Pelurusan logika yang benar..."
    },
    {
      "misconception": "Miskonsepsi kedua...",
      "correction": "Pelurusan logika..."
    }
  ],
  "keyTakeaways": ["Poin 1", "Poin 2", "Poin 3"],
  "checkpointQuestions": [
    {
      "id": "${nodeId}-q1",
      "question": "Pertanyaan konseptual berbobot menguji pemahaman inti...",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "correctIndex": 0,
      "explanation": "Mengapa jawaban tersebut benar...",
      "conceptTested": "Aspek yang diuji"
    },
    {
      "id": "${nodeId}-q2",
      "question": "Pertanyaan kedua skenario implementasi...",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "correctIndex": 2,
      "explanation": "Penjelasan...",
      "conceptTested": "Aspek yang diuji"
    },
    {
      "id": "${nodeId}-q3",
      "question": "Pertanyaan ketiga skenario pemecahan masalah...",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "correctIndex": 1,
      "explanation": "Penjelasan...",
      "conceptTested": "Aspek yang diuji"
    }
  ],
  "videoScript": {
    "conceptId": "${nodeId}",
    "title": "${language === 'en' ? 'Visualization' : 'Visualisasi'}: ${nodeLabel}",
    "totalDurationSeconds": 90,
    "scenes": [
      {
        "id": "sc1",
        "sceneNumber": 1,
        "title": "Pengantar & Motivasi Masalah",
        "durationSeconds": 22,
        "narration": "Narasi pengantar dalam bahasa pengguna, ramah, jelas, tanpa instruksi pembacaan...",
        "recipe": { "name": "<salah satu resep>", "params": {} },
        "captions": [
          { "startSeconds": 0, "endSeconds": 11, "text": "Kalimat subtitle 1..." },
          { "startSeconds": 11, "endSeconds": 22, "text": "Kalimat subtitle 2..." }
        ]
      }
    ]
  }
}
Pastikan correctIndex bervariasi (tidak selalu 0), kode bahasa ${lang} valid, dan caption tiap scene berurutan dalam waktu relatif scene. ${MATH_FORMAT_NOTE}${mathGuide}
${language === 'en' ? 'LANGUAGE: the instructions above are in Indonesian, but EVERY learner-facing string in the JSON (title, summary, explanation, analogy, definitions, examples, misconceptions, quiz, scene titles, narration, captions, board instruction and labels) MUST be written in English. Do not leave any Indonesian text.' : ''}`;

  try {
    const aiOutput = await generateStructuredJSON<DetailedLearningMaterial>(prompt, systemInstruction, undefined, { budgetMs: LESSON_BUDGET_MS });

    if (validateMaterialContract(aiOutput)) {
      // Save in memory cache
      MEMORY_CACHE.set(cacheKey, aiOutput);

      // Async persist to Supabase if table exists
      try {
        const { createClient } = await import('../supabase/server.ts');
        const supabase = await createClient();
        await supabase
          .from('concept_materials')
          .upsert({
            topic: dbTopic,
            node_id: nodeId,
            material_json: aiOutput,
            video_scene_json: aiOutput.videoScript,
            created_at: new Date().toISOString(),
          }, { onConflict: 'topic,node_id' });
      } catch {
        // non-blocking
      }

      return aiOutput;
    }
  } catch (aiErr) {
    console.warn(`[Pijar AI Generator] Fallback invoked for ${topic}/${nodeId}:`, aiErr);
  }

  // 4. Guaranteed High-Quality Fallback
  const fallback = buildTopicAwareFallback(params);
  MEMORY_CACHE.set(cacheKey, fallback);
  return fallback;
}
