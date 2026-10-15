import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CURATED_MATERIALS } from '../src/lib/learn/curated-materials.ts';
import { normalizeVideoScript } from '../src/lib/learn/scene-normalize.ts';
import { findGraphNode, isStoredGraphId } from '../src/lib/learn/node-check.ts';
import { buildAdjacencyMaps } from '../src/lib/graph/engine.ts';

describe('PIJAR F4 Learning Journey & Interactive Video Suite', () => {
  // ── Skenario 1: Validasi materi terstruktur multi-topik ───
  it('Skenario 1: Materi kurikulum untuk berbagai topik memiliki struktur pedagogis lengkap', () => {
    const topicsTested = ['rekursi', 'gradient-descent', 'indexing-btree', 'async-js'];

    for (const key of topicsTested) {
      const mat = CURATED_MATERIALS[key];
      assert.ok(mat, `Materi untuk "${key}" harus terdaftar`);
      assert.ok(mat.title && mat.title.length > 3, `Title untuk "${key}" harus valid`);
      assert.ok(mat.learningObjective && mat.learningObjective.length > 10, `Learning objective untuk "${key}" harus jelas`);
      assert.ok(mat.conceptExplanation && mat.conceptExplanation.length > 50, `Penjelasan konsep untuk "${key}" harus berbobot`);
      assert.ok(mat.analogy && mat.analogy.length > 10, `Analogi untuk "${key}" harus tersedia`);
      assert.ok(Array.isArray(mat.examples) && mat.examples.length > 0, `Contoh implementasi untuk "${key}" harus ada`);
      assert.ok(Array.isArray(mat.checkpointQuestions) && mat.checkpointQuestions.length >= 3, `Checkpoint questions untuk "${key}" minimal 3 soal`);
    }
  });

  // ── Skenario 2: Validasi scene script JSON video interaktif ───
  it('Skenario 2: Skrip video interaktif memiliki durasi terkalibrasi dan captions runtut', () => {
    for (const [key, mat] of Object.entries(CURATED_MATERIALS)) {
      const script = mat.videoScript;
      assert.ok(script, `Video script untuk "${key}" harus ada`);
      assert.ok(script.totalDurationSeconds > 0, `Durasi total video "${key}" harus > 0`);
      assert.ok(Array.isArray(script.scenes) && script.scenes.length >= 2, `Minimal 2 scenes untuk "${key}"`);

      let calculatedDuration = 0;
      for (const scene of script.scenes) {
        assert.ok(scene.id && scene.title && scene.narration, `Scene pada "${key}" harus memiliki id, title, dan narration`);
        assert.ok(scene.durationSeconds > 0, `Durasi scene harus > 0`);
        assert.ok(Array.isArray(scene.captions) && scene.captions.length > 0, `Scene harus memiliki captions`);

        calculatedDuration += scene.durationSeconds;

        // Check caption timing consistency
        for (const cap of scene.captions) {
          assert.ok(cap.startSeconds >= 0, 'startSeconds caption harus >= 0');
          assert.ok(cap.endSeconds > cap.startSeconds, 'endSeconds caption harus > startSeconds');
          assert.ok(cap.text && cap.text.length > 0, 'Teks caption tidak boleh kosong');
        }
      }

      // Allow 5s delta between sum of scenes and total duration
      assert.ok(
        Math.abs(calculatedDuration - script.totalDurationSeconds) <= 5,
        `Total durasi scene (${calculatedDuration}) harus selaras dengan script totalDurationSeconds (${script.totalDurationSeconds}) pada "${key}"`
      );
    }
  });

  // ── Skenario 3: Visual Scene Types Compatibility ──────────
  it('Skenario 3: Visual scene types terpetakan ke tipe yang didukung renderer', () => {
    // Setiap scene punya panggung animasi nyata: resep atau stage kustom yang lolos validasi.
    for (const [key, mat] of Object.entries(CURATED_MATERIALS)) {
      const play = normalizeVideoScript(mat.videoScript, 'id');
      assert.equal(play.scenes.length, mat.videoScript.scenes.length);
      for (const sc of play.scenes) {
        assert.ok(sc.stage.objects.length >= 4, `Scene "${sc.id}" pada "${key}" harus punya panggung dengan objek`);
        assert.ok(sc.stage.timeline.length >= 4, `Scene "${sc.id}" pada "${key}" harus punya animasi`);
      }
    }
  });

  // ── Skenario 4: Evaluasi Kuis Deterministik (Semua Benar) ──
  it('Skenario 4: Siswa menjawab seluruh soal dengan benar -> skor 100% dan lulus', () => {
    const mat = CURATED_MATERIALS['rekursi'];
    const answers = {};
    for (const q of mat.checkpointQuestions) {
      answers[q.id] = q.correctIndex;
    }

    let correctCount = 0;
    for (const q of mat.checkpointQuestions) {
      if (answers[q.id] === q.correctIndex) {
        correctCount++;
      }
    }

    const score = Math.round((correctCount / mat.checkpointQuestions.length) * 100);
    const isPassed = score >= 65;

    assert.equal(score, 100);
    assert.equal(isPassed, true);
  });

  // ── Skenario 5: Evaluasi Jawaban Salah & Misconception ──────
  it('Skenario 5: Siswa menjawab salah -> skor mencerminkan hasil aktual dan miskonsepsi teridentifikasi', () => {
    const mat = CURATED_MATERIALS['gradient-descent'];
    const answers = {
      [mat.checkpointQuestions[0].id]: (mat.checkpointQuestions[0].correctIndex + 1) % 4, // Wrong
      [mat.checkpointQuestions[1].id]: (mat.checkpointQuestions[1].correctIndex + 1) % 4, // Wrong
      [mat.checkpointQuestions[2].id]: mat.checkpointQuestions[2].correctIndex,           // Correct
    };

    let correctCount = 0;
    const evaluatedResults = [];

    for (const q of mat.checkpointQuestions) {
      const isCorrect = answers[q.id] === q.correctIndex;
      if (isCorrect) correctCount++;
      evaluatedResults.push({
        id: q.id,
        isCorrect,
        hasFeedback: !isCorrect,
      });
    }

    const score = Math.round((correctCount / mat.checkpointQuestions.length) * 100);
    const isPassed = score >= 65;

    assert.equal(score, 33);
    assert.equal(isPassed, false, 'Skor 33% tidak boleh dinyatakan lulus');
    assert.equal(evaluatedResults.filter(r => !r.isCorrect).length, 2);
  });

  // ── Skenario 6: Kunci Jawaban Bervariasi (No Fixed Pattern) ─
  it('Skenario 6: Kunci jawaban bervariasi (tidak selalu opsi 0 / A)', () => {
    const allCorrectIndices = [];
    for (const mat of Object.values(CURATED_MATERIALS)) {
      for (const q of mat.checkpointQuestions) {
        allCorrectIndices.push(q.correctIndex);
      }
    }

    const uniqueIndices = new Set(allCorrectIndices);
    assert.ok(uniqueIndices.size >= 3, 'Kunci jawaban harus bervariasi melintasi opsi index 0, 1, dan 2');
    assert.ok(uniqueIndices.has(0), 'Harus ada opsi 0');
    assert.ok(uniqueIndices.has(1), 'Harus ada opsi 1');
    assert.ok(uniqueIndices.has(2), 'Harus ada opsi 2');
  });

  // ── Skenario 7: Prerequisite-aware Downstream Unlocking ────
  it('Skenario 7: Pembukaan konsep downstream mempertimbangkan seluruh prasyarat wajib', () => {
    // Model graf dengan diamond dependency:
    // A -> B, A -> C, B -> D, C -> D (D butuh B dan C!)
    const nodes = [
      { id: 'A', status: 'completed' },
      { id: 'B', status: 'completed' },
      { id: 'C', status: 'in_progress' },
      { id: 'D', status: 'locked' },
    ];
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'A', target: 'C' },
      { source: 'B', target: 'D' },
      { source: 'C', target: 'D' },
    ];

    const { dependentsMap, prerequisitesMap } = buildAdjacencyMaps(nodes, edges);

    // Kasus 1: C belum selesai -> D tetap terkunci
    const completedSet1 = new Set(['A', 'B']);
    const dPrereqs = prerequisitesMap.get('D') || [];
    const isDUnlocked1 = dPrereqs.every(p => completedSet1.has(p));
    assert.equal(isDUnlocked1, false, 'Node D harus tetap terkunci selama C belum selesai');

    // Kasus 2: C selesai -> D terbuka
    completedSet1.add('C');
    const isDUnlocked2 = dPrereqs.every(p => completedSet1.has(p));
    assert.equal(isDUnlocked2, true, 'Node D harus terbuka setelah B dan C selesai');
  });

  // ── Skenario 8: Kode Tidak Menggunakan Dummy Placeholder ───
  it('Skenario 8: Kode contoh pada kurikulum tidak menggunakan fungsi dummy "solve(input > 0)"', () => {
    for (const [key, mat] of Object.entries(CURATED_MATERIALS)) {
      for (const ex of mat.examples) {
        assert.ok(
          !ex.code.includes('function solve(input: number): boolean {\n  return input > 0;\n}'),
          `Materi "${key}" tidak boleh menggunakan template dummy solve(input > 0)`
        );
        assert.ok(ex.code.length > 20, `Contoh kode pada "${key}" harus substansial`);
      }
    }
  });

  // ── Skenario 9: Format Bahasa Spesifik Per Topik ───────────
  it('Skenario 9: Contoh kode menggunakan bahasa yang relevan dengan topik (SQL untuk DB, Python untuk ML)', () => {
    assert.equal(CURATED_MATERIALS['gradient-descent'].examples[0].language, 'python');
    assert.equal(CURATED_MATERIALS['indexing-btree'].examples[0].language, 'sql');
    assert.equal(CURATED_MATERIALS['async-js'].examples[0].language, 'javascript');
    assert.equal(CURATED_MATERIALS['rekursi'].examples[0].language, 'typescript');
  });
});

describe('Lesson cache keys per language', () => {
  it('id keeps the original keys, en is isolated and skips curated', async () => {
    const { materialCacheKeys, toLessonLanguage } = await import('../src/lib/learn/cache-key.ts');
    const id = materialCacheKeys('dsa', 'rekursi', 'id');
    const en = materialCacheKeys('dsa', 'rekursi', 'en');
    assert.deepEqual(id, { memoryKey: 'dsa_rekursi', dbTopic: 'dsa', useCurated: true });
    assert.equal(en.dbTopic, 'dsa [en]');
    assert.equal(en.useCurated, false);
    assert.notEqual(en.memoryKey, id.memoryKey);
    assert.equal(toLessonLanguage('fr'), 'id');
    assert.equal(toLessonLanguage('en'), 'en');
  });
});

describe('Lesson markdown subset', () => {
  it('parses headings, lists, bold, code and never emits html', async () => {
    const { parseBlocks } = await import('../src/lib/learn/markdown.ts');
    const b = parseBlocks('### Prinsip:\n1. **Satu** dan `x`\n2. Dua\n\nParagraf <script>alert(1)</script>\nlanjut\n```ts\nconst a = 1;\n```');
    assert.deepEqual(b.map(x => x.type), ['h', 'ol', 'p', 'code']);
    assert.equal(b[0].inline[0].v, 'Prinsip');
    assert.equal(b[1].items.length, 2);
    assert.deepEqual(b[1].items[0].map(i => i.t), ['b', 'text', 'code']);
    assert.equal(b[2].inline[0].v, 'Paragraf <script>alert(1)</script> lanjut'); // plain text, rendered as text by React
    assert.equal(b[3].code, 'const a = 1;');
  });
});

it('node-check: unknown node and non-stored graph ids', () => {
  const nodes = [{ id: 'a', label: 'A' }, { id: 'b' }];
  assert.equal(findGraphNode(nodes, 'a')?.label, 'A');
  assert.equal(findGraphNode(nodes, 'zzz'), null);
  assert.equal(findGraphNode(null, 'a'), null);
  assert.equal(isStoredGraphId('b9c093b3-561d-4b6d-8929-38b02623bd3f'), true);
  assert.equal(isStoredGraphId('demo-graph'), false);
  assert.equal(isStoredGraphId(undefined), false);
});

describe('Pedagogical Video & Text Overhaul: Domain isolation & comprehensive depth', () => {
  it('SQL and Database topics strictly reject interactive math boards', async () => {
    const { pickBoardRecipe, fallbackBoardSpec, boardForLesson, sanitizeMaterialBoard } = await import('../src/lib/learn/board-spec.ts');
    const sqlTopics = [
      'SQL Aggregate Functions',
      'Database Group By and Having',
      'PostgreSQL Window Functions',
      'MySQL Index Optimization',
      'Relational Database Schema Design',
    ];

    for (const title of sqlTopics) {
      assert.equal(pickBoardRecipe(title), null, `pickBoardRecipe should be null for ${title}`);
      assert.equal(fallbackBoardSpec(title), null, `fallbackBoardSpec should be null for ${title}`);

      const mat = {
        title,
        interactiveBoard: { recipe: 'derivative-tangent' },
        videoScript: { scenes: [] },
      };
      sanitizeMaterialBoard(mat, 'id');
      assert.equal(mat.interactiveBoard, undefined, `sanitizeMaterialBoard should purge board for ${title}`);
      assert.equal(boardForLesson(mat, title, 'id'), null, `boardForLesson should return null for ${title}`);
    }
  });

  it('Fallback video generates 4 scenes spanning at least 80 seconds with topic-relevant recipes', async () => {
    const { buildFallbackVideo } = await import('../src/lib/learn/scene-fallback.ts');
    const video = buildFallbackVideo({
      nodeId: 'sql-agg',
      label: 'Aggregate Functions',
      topic: 'sql-databases',
      category: 'SQL Querying',
      desc: 'COUNT, SUM, AVG aggregate operations in relational queries',
      mathy: false,
      visual: 'data-flow',
      language: 'id',
    });

    assert.equal(video.scenes.length, 4, 'Video must contain 4 pedagogical scenes');
    assert.ok(video.totalDurationSeconds >= 80, `Total duration must be at least 80s, got ${video.totalDurationSeconds}`);

    const recipeNames = video.scenes.map((s) => s.recipe?.name);
    assert.ok(!recipeNames.includes('derivative-tangent'), 'SQL fallback video must not include calculus derivative tangent');
    assert.ok(recipeNames.includes('concept-map'), 'Must include concept-map scene');
    assert.ok(recipeNames.includes('pipeline'), 'Must include pipeline execution scene');
  });

  it('Topic-aware material fallback produces comprehensive depth with multiple sections and examples', async () => {
    const { buildTopicAwareFallback } = await import('../src/lib/learn/generator.ts');
    const fallback = buildTopicAwareFallback({ nodeId: 'sql-group-by', nodeLabel: 'SQL Group By', topic: 'sql-databases', language: 'id' });

    assert.ok(fallback.conceptExplanation.length >= 400, 'Concept explanation must have sufficient text depth');
    assert.ok(fallback.conceptExplanation.includes('### 1.'), 'Must include section 1');
    assert.ok(fallback.conceptExplanation.includes('### 2.'), 'Must include section 2');
    assert.ok(fallback.conceptExplanation.includes('### 3.'), 'Must include section 3');
    assert.ok(fallback.conceptExplanation.includes('### 4.'), 'Must include section 4');
    assert.ok(fallback.examples.length >= 2, 'Must provide at least 2 progressive code examples');
    assert.ok(fallback.checkpointQuestions.length >= 3, 'Must provide at least 3 checkpoint questions');
  });
});

