// ================================================================
// PIJAR - Dynamic Learning Material & Video Script Generator (F4)
// Caches, validates, and dynamically generates concept lessons.
// ================================================================

import { generateStructuredJSON } from '@/lib/ai/provider';
import { CURATED_MATERIALS } from './curated-materials';
import type { DetailedLearningMaterial, VideoScriptPlan, CheckpointQuizQuestion, VisualSceneType, MathSpec, MathTemplate } from './types';
import { DEFAULT_MATH_SPECS, sanitizeScenesMath } from './math-spec';
import { createClient } from '@/lib/supabase/server';
import { materialCacheKeys, type LessonLanguage } from './cache-key';

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

  return true;
}

const MATH_WORDS = /kalkulus|calculus|vektor|vector|fungsi|function|turunan|derivative|integral|limit|rasio|ratio|perbandingan|eksponen|exponen|aljabar|algebra|matematika|math|gradien|slope/i;

/** True when the lesson is about functions, vectors, derivatives, integrals, limits, ratios or exponents. */
function isMathTopic(params: { topic: string; nodeId: string; nodeLabel?: string; nodeDescription?: string }): boolean {
  const { lang, visualType } = getTopicLanguage(params.topic, params.nodeId);
  void lang;
  return visualType === 'math-visualization' || MATH_WORDS.test(`${params.topic} ${params.nodeId} ${params.nodeLabel ?? ''} ${params.nodeDescription ?? ''}`);
}

function pickMathTemplate(text: string): MathTemplate {
  if (/vektor|vector/i.test(text)) return 'vector-add';
  if (/integral|luas|area/i.test(text)) return 'area';
  if (/rasio|ratio|perbandingan/i.test(text)) return 'ratio';
  if (/eksponen|exponen/i.test(text)) return 'exponential';
  return 'tangent';
}

const MATH_PROMPT_GUIDE = `
SPESIFIKASI VISUAL MATEMATIKA (wajib untuk topik matematika):
Setiap scene dengan "visualType": "math-visualization" HARUS punya "visualState.math" berupa JSON deklaratif (bukan kode).
Template yang tersedia: "function-plot", "vector-add", "tangent", "area", "ratio", "exponential".
Field (semua opsional kecuali template): viewBox {x:[min,max], y:[min,max]} (-100..100), functions [{expr,label}] maks 3,
vectors [{from:[x,y], to:[x,y], label}] maks 4, points [{at:[x,y], label}] maks 6, tangentAt (angka), shadeArea [a,b], ratio {a,b}.
Rumus "expr" hanya boleh memakai variabel x, angka, + - * / ^ ( ), fungsi sin cos tan asin acos atan sqrt exp ln log abs, dan konstanta pi e. Maks 80 karakter. Tanpa kata lain.
Contoh per template:
{"template":"function-plot","viewBox":{"x":[-5,5],"y":[-2,10]},"functions":[{"expr":"x^2","label":"f(x) = x^2"}]}
{"template":"vector-add","viewBox":{"x":[-1,7],"y":[-1,6]},"vectors":[{"to":[3,1],"label":"a"},{"to":[1,3],"label":"b"}]}
{"template":"tangent","viewBox":{"x":[-3,3],"y":[-1,9]},"functions":[{"expr":"x^2"}],"tangentAt":1}
{"template":"area","viewBox":{"x":[-1,5],"y":[-1,5]},"functions":[{"expr":"sqrt(x)"}],"shadeArea":[0,4]}
{"template":"ratio","ratio":{"a":2,"b":3}}
{"template":"exponential","viewBox":{"x":[-3,4],"y":[-1,10]},"functions":[{"expr":"2^x","label":"f(x) = 2^x"}]}
Pilih template yang sesuai dengan konsep, dan buat tiap scene math punya spec yang berbeda agar visual berkembang.`;

/**
 * Determines appropriate programming language or notation based on curriculum topic.
 */
function getTopicLanguage(topic: string, nodeId: string): { lang: string; visualType: VisualSceneType } {
  const t = topic.toLowerCase();
  const n = nodeId.toLowerCase();

  if (t.includes('machine') || t.includes('ml') || t.includes('ai')) {
    return { lang: 'python', visualType: n.includes('grad') || n.includes('loss') ? 'loss-landscape' : 'concept-illustration' };
  }
  if (t.includes('data') && t.includes('base') || t.includes('db') || t.includes('sql')) {
    return { lang: 'sql', visualType: n.includes('tree') || n.includes('index') ? 'tree-structure' : 'data-flow' };
  }
  if (t.includes('math') || t.includes('diskrit') || t.includes('matematika')) {
    return { lang: 'latex', visualType: 'math-visualization' };
  }
  if (t.includes('web') || t.includes('react') || t.includes('frontend')) {
    return { lang: 'typescript', visualType: 'code-execution' };
  }
  if (t.includes('stat') || t.includes('probabilitas')) {
    return { lang: 'python', visualType: 'math-visualization' };
  }
  return { lang: 'typescript', visualType: n.includes('stack') || n.includes('rekursi') ? 'call-stack' : 'code-execution' };
}

/**
 * Creates an intelligent topic-aware fallback if AI provider is offline.
 */
function buildTopicAwareFallback(params: MaterialGenerationParams): DetailedLearningMaterial {
  const { topic, nodeId, nodeLabel, nodeCategory, nodeDescription, prerequisites } = params;
  const label = nodeLabel || nodeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const category = nodeCategory || 'Konsep Kurikulum';
  const desc = nodeDescription || `Konsep fundamental dalam kurikulum ${topic}.`;
  const { lang, visualType: baseVisual } = getTopicLanguage(topic, nodeId);
  const mathy = isMathTopic(params);
  const visualType: VisualSceneType = mathy ? 'math-visualization' : baseVisual;
  const mathSpecs: [MathSpec, MathSpec] | null = mathy
    ? [DEFAULT_MATH_SPECS['function-plot'], DEFAULT_MATH_SPECS[pickMathTemplate(`${label} ${nodeId} ${desc}`)]]
    : null;

  return {
    nodeId,
    topic,
    title: label,
    learningObjective: `Memahami prinsip dasar, arsitektur logika, dan implementasi dari ${label}.`,
    targetLevel: 'intermediate',
    prerequisiteConcepts: prerequisites || [],
    summary: `${label} adalah bagian penting dari domain ${category}. ${desc}`,
    conceptExplanation: `Konsep **${label}** memegang peranan krusial dalam domain ${topic}.
Ketika merancang arsitektur sistem atau menyelesaikan persoalan komputasi, ${label} menyediakan kerangka kerja terstruktur untuk memastikan efisiensi, reliabilitas, dan konsistensi.

### Prinsip Utama:
1. **Definisi Formal:** ${desc}
2. **Keterkaitan Logis:** Konsep ini dibangun di atas fondasi materi sebelumnya dan menjadi prasyarat untuk materi lanjutan.
3. **Penerapan Praktis:** Diterapkan langsung dalam optimasi proses dan penulisan algoritma nyata.`,
    analogy: `Ibaratkan ${label} seperti pondasi tiang utama pada sebuah jembatan: memastikan seluruh komponen di atasnya bekerja secara kokoh tanpa kegagalan struktural.`,
    keyDefinitions: [
      { term: label, definition: desc },
      { term: category, definition: `Kelompok bidang kajian dalam domain ${topic}.` },
    ],
    examples: [
      {
        title: `Implementasi Konseptual ${label}`,
        language: lang,
        code: lang === 'python'
          ? `# Implementasi terstruktur untuk ${label}\ndef demonstrate_${nodeId.replace(/-/g, '_')}():\n    \"\"\"Menjalankan alur logika untuk ${label}\"\"\"\n    print("Menginisialisasi parameter...")\n    is_valid = True\n    return is_valid\n\nresult = demonstrate_${nodeId.replace(/-/g, '_')}()\nprint(f"Hasil eksekusi: {result}")`
          : lang === 'sql'
          ? `-- Query optimasi untuk ${label}\nSELECT id, nama_record, status_validasi\nFROM entitas_${nodeId.replace(/-/g, '_')}\nWHERE status_validasi = 'AKTIF'\nORDER BY created_at DESC\nLIMIT 10;`
          : `// Implementasi tipe data dan alur kerja untuk ${label}\nexport function execute${nodeId.replace(/-/g, '')}(params: Record<string, unknown>): boolean {\n  console.log("Memproses logika ${label}...");\n  return Boolean(params);\n}`,
        explanation: `Contoh kode di atas mendemonstrasikan pola implementasi idiomatik ${label} dalam bahasa ${lang.toUpperCase()}.`,
      },
    ],
    realWorldApplication: `Digunakan secara luas di industri teknologi modern untuk skalabilitas dan kestabilan sistem ${topic}.`,
    commonMisconceptions: [
      {
        misconception: `Menganggap ${label} hanya teori tanpa relevansi langsung dalam implementasi nyata.`,
        correction: `Di lingkungan produksi, penguasaan ${label} mencegah bug arsitektural dan kebocoran sumber daya komputasi.`,
      },
    ],
    keyTakeaways: [
      `Kuasai alur berpikir konseptual sebelum menulis sintaks kode.`,
      `Perhatikan batasan kompleksitas dan prasyarat dasar materi.`,
      `Validasi pemahamanmu melalui checkpoint quiz berikut.`,
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
    videoScript: {
      conceptId: nodeId,
      title: `Eksplanasi Visual: ${label}`,
      totalDurationSeconds: 40,
      scenes: [
        {
          id: `${nodeId}-sc1`,
          sceneNumber: 1,
          title: `Pengantar Konsep ${label}`,
          durationSeconds: 12,
          narration: `Halo! Mari memahami konsep ${label}. Konsep ini memegang peran kunci dalam pembelajaran kurikulum ${topic}.`,
          visualType: visualType,
          visualState: {
            notes: `Fokus pembelajaran: ${desc}`,
            activeNodes: [label, category],
            ...(mathSpecs ? { math: mathSpecs[0] } : {}),
          },
          captions: [
            { startSeconds: 0, endSeconds: 6, text: `Memahami konsep ${label} secara komprehensif.` },
            { startSeconds: 6, endSeconds: 12, text: `Konsep ini merupakan pilar utama dalam ${topic}.` },
          ],
        },
        {
          id: `${nodeId}-sc2`,
          sceneNumber: 2,
          title: `Alur Kerja dan Struktur Logika`,
          durationSeconds: 14,
          narration: `Perhatikan diagram di samping. Setiap komponen saling terhubung untuk menghasilkan alur eksekusi yang optimal dan terstruktur.`,
          visualType: visualType,
          visualState: {
            currentStep: 2,
            totalSteps: 3,
            notes: `Alur eksekusi logis konsep ${label}.`,
            ...(mathSpecs ? { math: mathSpecs[1] } : {}),
          },
          captions: [
            { startSeconds: 12, endSeconds: 19, text: `Perhatikan struktur dan hubungan antar komponen logis.` },
            { startSeconds: 19, endSeconds: 26, text: `Alur data diproses secara terstruktur dan efisien.` },
          ],
        },
        {
          id: `${nodeId}-sc3`,
          sceneNumber: 3,
          title: `Rangkuman & Validasi Pemahaman`,
          durationSeconds: 14,
          narration: `Dengan menguasai ${label}, kamu siap melangkah ke materi tingkat lanjut. Sekarang, uji pemahamanmu pada checkpoint kuis di bawah!`,
          visualType: 'concept-illustration',
          visualState: {
            notes: `Siap melanjutkan ke materi tingkat lanjut.`,
            activeNodes: ['Konsep Selesai', 'Uji Checkpoint'],
          },
          captions: [
            { startSeconds: 26, endSeconds: 33, text: `Fondasi konsep ${label} berhasil kamu pahami.` },
            { startSeconds: 33, endSeconds: 40, text: `Uji pemahamanmu pada checkpoint kuis berikutnya!` },
          ],
        },
      ],
    },
  };
}

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
    } catch (dbErr) {
      // Table might not exist yet; safe fallback
    }
  }

  // 3. AI Generation with Gemini / OpenAI
  const { lang, visualType } = getTopicLanguage(topic, nodeId);
  const nodeLabel = params.nodeLabel || nodeId.replace(/-/g, ' ');
  const nodeDesc = params.nodeDescription || 'Konsep kurikulum';
  const mathGuide = isMathTopic(params) ? MATH_PROMPT_GUIDE : '';

  const systemInstruction = `Kamu adalah Principal Curriculum Architect dan Senior Learning Experience Designer di Pijar.
Tugasmu adalah menghasilkan materi edukasi berbobot ilmiah tinggi, intuitif, ramah pembelajar, dan skrip video visual interaktif untuk konsep teknologi.
${language === 'en'
    ? 'Write ALL learner-facing text (titles, explanations, analogy, definitions, code comments, quiz, narration, captions) in clear, natural English. Keep the JSON keys exactly as in the schema.'
    : 'Semua teks harus dalam Bahasa Indonesia edukatif yang profesional, jelas, dan kaya contoh nyata.'}
KEMBALIKAN HANYA JSON VALID SESUAI FORMAT SCHEMA.`;

  const prompt = `Buatkan materi pembelajaran komprehensif dan skrip video interaktif untuk konsep berikut:
- Topik Kurikulum: "${topic}"
- ID Konsep (nodeId): "${nodeId}"
- Nama Konsep: "${nodeLabel}"
- Deskripsi: "${nodeDesc}"
- Bahasa Kode Relevan: "${lang}"
- Tipe Visual Video: "${visualType}"

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
    { "term": "Istilah 2", "definition": "Definisi jelas..." }
  ],
  "examples": [
    {
      "title": "Judul Contoh Implementasi",
      "language": "${lang}",
      "code": "Kode program yang valid, rapi, dan memiliki komentar penjelas...",
      "explanation": "Penjelasan alur eksekusi baris demi baris..."
    }
  ],
  "realWorldApplication": "Penerapan di industri nyata...",
  "commonMisconceptions": [
    {
      "misconception": "Miskonsepsi umum siswa...",
      "correction": "Pelurusan logika yang benar..."
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
      "question": "Pertanyaan kedua...",
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
    "title": "Visualisasi: ${nodeLabel}",
    "totalDurationSeconds": 45,
    "scenes": [
      {
        "id": "sc1",
        "sceneNumber": 1,
        "title": "Pengantar & Motivasi Masalah",
        "durationSeconds": 14,
        "narration": "Narasi pengantar dalam bahasa Indonesia ramah dan jelas...",
        "visualType": "${visualType}",
        "visualState": {
          "notes": "Penjelasan visual scene 1",
          "activeNodes": ["${nodeLabel}"]
        },
        "captions": [
          { "startSeconds": 0, "endSeconds": 7, "text": "Kalimat subtitle 1..." },
          { "startSeconds": 7, "endSeconds": 14, "text": "Kalimat subtitle 2..." }
        ]
      },
      {
        "id": "sc2",
        "sceneNumber": 2,
        "title": "Mekanisme dan Alur Komputasi",
        "durationSeconds": 16,
        "narration": "Narasi adegan kedua menjelaskan detail teknis...",
        "visualType": "${visualType}",
        "visualState": {
          "currentStep": 2,
          "totalSteps": 3,
          "notes": "Langkah pemrosesan detail..."
        },
        "captions": [
          { "startSeconds": 14, "endSeconds": 22, "text": "Kalimat subtitle 3..." },
          { "startSeconds": 22, "endSeconds": 30, "text": "Kalimat subtitle 4..." }
        ]
      },
      {
        "id": "sc3",
        "sceneNumber": 3,
        "title": "Kesimpulan & Evaluasi",
        "durationSeconds": 15,
        "narration": "Narasi penutup memotivasi kuis checkpoint...",
        "visualType": "concept-illustration",
        "visualState": {
          "notes": "Rangkuman keberhasilan pemahaman konsep."
        },
        "captions": [
          { "startSeconds": 30, "endSeconds": 37, "text": "Kalimat subtitle 5..." },
          { "startSeconds": 37, "endSeconds": 45, "text": "Kalimat subtitle 6..." }
        ]
      }
    ]
  }
}
Pastikan correctIndex bervariasi (tidak selalu 0), kode bahasa ${lang} valid, dan scene captions bersambung.${mathGuide}`;

  try {
    const aiOutput = await generateStructuredJSON<DetailedLearningMaterial>(prompt, systemInstruction);

    if (validateMaterialContract(aiOutput)) {
      // Save in memory cache
      MEMORY_CACHE.set(cacheKey, aiOutput);

      // Async persist to Supabase if table exists
      try {
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
      } catch (saveErr) {
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
