# 📋 IMPLEMENTATION PLAN & PROGRESS TRACKER: PIJAR

> **Dokumen Panduan & Pelacak Kemajuan Proyek**  
> Digunakan sebagai checkpoint status pengerjaan. Setiap kali sesi berhenti atau berlanjut, perbarui status dan checklist di file ini agar dapat langsung melanjutkan progress tanpa kehilangan konteks.

---

## 📌 Status Saat Ini
- **Nama Aplikasi:** `Pijar`
- **Fase Aktif:** `Fase 4: Personalization Learning Journey (F4)` & `Fase 5: AI Copilot & Misconceptions` *(Selesai & Terverifikasi Lolos 35 Test & Build)*
- **Status:** 🚀 *Fase 4 & Fase 5 Berhasil Diimplementasikan Secara Penuh*
- **Terakhir Diperbarui:** 2026-10-12
- **Tahap Berikutnya:** `Fase 6: Vision Showcase (F8 - F10)` — UI Mockup & Pitch Deck Presentation Polish.

---

## 🧭 Cara Melanjutkan Progress (Resume Guide)
Saat memulai sesi baru dengan AI Assistant, cukup berikan prompt:
> *"Lanjutkan pengerjaan proyek App Joints berdasarkan checklist pada `IMPLEMENTATION_PLAN.md` mulai dari [sebutkan sub-fase atau task berikutnya]."*

---

## 🗺️ Roadmap & Checklist Progres

### 🟩 Fase 0: Project Scaffolding & Core Foundations
*Status: ✅ Selesai*

- [x] **0.1 Inisialisasi Proyek**
  - [x] Inisialisasi Next.js (App Router, TypeScript, Tailwind CSS, ESLint) → folder `pijar/`.
  - [x] Setup dependensi UI (`lucide-react`, Shadcn UI + komponen: card, badge, progress, separator, dialog, tooltip).
  - [x] Setup dependensi graf (`@xyflow/react`).
  - [x] Setup dependensi AI & backend (`@google/genai`, `openai`, `@supabase/supabase-js`, `@supabase/ssr`).
- [x] **0.2 Struktur Folder & Skema Database**
  - [x] Buat file `schema.sql` (tabel `profiles`, `learning_graphs`, `node_progress`, `chat_history`, `diagnostic_logs` + RLS + trigger auto-create profile).
  - [x] Buat file konfigurasi environment (`.env.local.example`).
  - [x] Buat client helper Supabase (`lib/supabase/client.ts` & `lib/supabase/server.ts`).
- [x] **0.3 AI Provider Abstraction Layer**
  - [x] Buat `lib/ai/provider.ts` (Unified interface untuk Gemini 1.5 Flash & GPT-4o-mini).
  - [x] Implementasi fungsi `generateStructuredJSON<T>()` + `streamChatResponse()` dengan JSON Structured Output enforce.
  - [x] Buat `lib/ai/mock-data.ts` (Mock data kurikulum, pre-test, & chat untuk fail-safe demo).
  - [x] Buat `src/types/index.ts` (TypeScript types global untuk seluruh entitas Pijar).

---

### 🟩 Fase 1: Auth, Onboarding & User Goal Setting
*Status: ✅ Selesai & Terverifikasi (Audit Keamanan Lolos 100%)*

- [x] **1.1 Halaman Autentikasi**
  - [x] `src/proxy.ts` (Next.js 16 Proxy) — Route protection & session validation server-side (`supabase.auth.getUser()`).
  - [x] `app/auth/login/page.tsx` — Login form dengan verifikasi fail-closed Supabase nyata (tanpa mock bypass).
  - [x] `app/auth/register/page.tsx` — Pendaftaran akun dengan validasi live Supabase.
  - [x] `app/auth/logout/route.ts` — Server-side cookie cleanup & Supabase session invalidation.
  - [x] `app/auth/callback/route.ts` — OAuth/email confirmation callback handler.
  - [x] `app/globals.css` — Pijar design system (brand amber, glassmorphism, animations).
  - [x] `app/layout.tsx` — Root layout dengan metadata SEO & TooltipProvider.
  - [x] `app/page.tsx` — Landing page premium (hero, how-it-works, features, CTA).
- [x] **1.2 Alur Onboarding**
  - [x] `app/onboarding/page.tsx` — Wizard 3 langkah: pilih topik (6 opsi), tujuan (4 opsi), gaya belajar (2 opsi).
  - [x] Simpan preferensi ke tabel `profiles` via Supabase.
  - [x] `app/dashboard/page.tsx` — Dashboard Server Component dengan Next.js 16 `connection()` (Partial Prerendering).

---

### 🟩 Fase 2: Pre-test Adaptif & Prerequisite Detection (F1 & F2)
*Status: ✅ Selesai (Dievaluasi & Diverifikasi via Automated Engine)*

- [x] **2.1 Generator Soal Diagnostik (F1)**
  - [x] Endpoint `/api/diagnostic/start` menghasilkan 5 soal diagnostik adaptif berbasis AI dengan topic-aware fallbacks.
  - [x] Komponen UI kuis interaktif (pertanyaan satu per satu, pilihan ganda, progress indicator).
- [x] **2.2 Engine Deteksi Prasyarat & Analisis Gap (F2)**
  - [x] Endpoint `/api/diagnostic/analyze` mengevaluasi jawaban secara deterministik + sintesis kualitatif AI.
  - [x] AI prompt mengidentifikasi *root knowledge gap* (konsep prasyarat yang belum dikuasai).
  - [x] Logging ke tabel `diagnostic_logs` di Supabase.

---

### 🟩 Fase 3: Dynamic Curriculum Knowledge Graph (F3)
*Status: ✅ Selesai (Diverifikasi 10 Skenario Graph Unit Test & Production Build)*

- [x] **3.1 Graph Data Generator & Domain Engine**
  - [x] Engine graf murni (`src/lib/graph/engine.ts`) dengan validasi DAG Kahn's Algorithm & deteksi siklus.
  - [x] Atribut Node lengkap (`src/lib/graph/types.ts` & `src/types/index.ts`).
  - [x] Hierarchical topological DAG layout (`src/lib/graph/layout.ts`) kiri-ke-kanan tanpa tumpang tindih.
  - [x] Adapter multi-topik & hasil diagnostik pre-test (`src/lib/graph/adapter.ts`).
  - [x] Sinkronisasi Cloud Supabase (`src/lib/graph/storage.ts`) dengan pencegahan duplikasi graf aktif.
- [x] **3.2 UI Knowledge Graph Canvas**
  - [x] Komponen kanvas React Flow `@xyflow/react` (`src/components/graph/CurriculumCanvas.tsx`).
  - [x] Desain custom nodes (`ConceptNodeComponent.tsx`) dengan status badges dan efek pulse glow.
  - [x] Kontrol kanvas: Zoom, Pan, Fit View, Filter, Minimap, dan Legend.
  - [x] Inspector panel (`GraphInspector.tsx`) dengan detail konsep dan penyorotan rantai dependensi.
  - [x] Halaman utama `/graph` (`src/app/graph/page.tsx`) terhubung langsung ke Supabase cloud graph.

---

### 🟩 Fase 4: Personalization Learning Journey (F4)
*Status: ✅ Selesai & Terverifikasi (Lolos 35 Unit Test & Production Build 19 Routes)*

- [x] **4.1 Materi Pembelajaran Konseptual Dinamis**
  - [x] Halaman detail materi adaptif (`/learn/[graphId]/[nodeId]`) dengan dukungan multi-topik (DSA, ML, Database, Web, Math, Stats).
  - [x] Endpoint `/api/learn/material` dengan arsitektur multi-tier cache (In-Memory -> Supabase Cloud DB `concept_materials` -> AI Generation -> Topic-Aware Fallback).
  - [x] Penghapusan total template dummy `solve(input > 0)`. Setiap materi memiliki penjelasan mendalam, analogi dunia nyata, definisi istilah, dan contoh kode nyata sesuai bahasa topik (Python, SQL, TypeScript).
- [x] **4.2 AI Interactive Visual Video Player (Eksplanasi Video Nyata)**
  - [x] Mode Video Interaktif (`InteractiveVideoPlayer.tsx`) menggantikan placeholder kartu kosong.
  - [x] Pipeline Scene Script JSON terstruktur: durasi terkalibrasi, narasi suara, dan subtitle/captions waktu-nyata.
  - [x] Visual Scene Library modular (`SceneVisualRenderer.tsx`): Call Stack (DSA), Loss Landscape (ML), B-Tree (DB), Code Stepper (Web), dan Data Flow.
  - [x] Kontrol playback penuh: Play/Pause, Timeline Scrubber, Speed (1x, 1.25x, 1.5x), Subtitle CC toggle, Fullscreen, dan Web Speech Synthesis audio narration (Bahasa Indonesia).
- [x] **4.3 Checkpoint Kuis Bermakna & Evaluasi Server-Side**
  - [x] Kuis pemahaman minimal 3 soal konseptual per materi dengan kunci jawaban bervariasi (bukan selalu opsi A).
  - [x] Evaluasi deterministik server-side via `/api/learn/evaluate-quiz` (mencegah kecurangan manipulasi client-side).
  - [x] Penguncian status kelulusan (passing score threshold >= 65%).
- [x] **4.4 Progres, Mastery & Prerequisite Auto-Unlock**
  - [x] Persistensi otomatis penguasaan konsep ke tabel Supabase `node_progress` & sinkronisasi localStorage.
  - [x] Perhitungan pembukaan konsep turunan (downstream unlocking): konsep lanjutan terbuka hanya jika SELURUH prasyarat wajibnya telah berstatus `completed`.
  - [x] Tautan langsung ke Knowledge Graph setelah lulus kuis.

---

### 🟩 Fase 5: AI Copilot & Misconception Detection (F5, F6, F7)
*Status: ✅ Selesai & Terverifikasi*

- [x] **5.1 AI Learning Copilot (F6)**
  - [x] Widget chat interaktif mengambang di halaman belajar (`/learn`).
  - [x] Streaming respon Gemini / OpenAI via API Route `/api/chat` dengan failover otomatis ke OpenAI `gpt-4o-mini`.
  - [x] Pembatasan konteks materi aktif (Metode Socratic, analogi, panduan checkpoint).
- [x] **5.2 Cognitive Misconception Feedback pada Checkpoint Kuis (F7)**
  - [x] Analisis kognitif seketika ketika siswa salah memilih opsi kuis.
  - [x] Penjelasan empatik yang meluruskan pola pikir (*cognitive debiasing*) mengapa opsi tersebut salah dan cara berpikir yang benar.
- [x] **5.3 User Dashboard (F5)**
  - [x] Halaman dashboard utama: Ringkasan kurikulum aktif dari Supabase `learning_graphs` (Partial Prerendering Next.js 16).

---

### 🟦 Fase 6: Vision Showcase (F8 - F10), Fail-Safe Demo & Final Polish
*Status: 🔲 Belum Mulai (UI Vision Mockups)*

- [ ] **6.1 UI Mockup Fitur Vision (Pitch Deck Purpose)**
  - [ ] **F8 Mastery Tracking:** Grafik radar / progress penguasaan materi.
  - [ ] **F9 Learning Scheduler:** Kalender target belajar visual.
  - [ ] **F10 Community:** Feed forum diskusi dummy.
- [x] **6.2 Hackathon Fail-Safe Demo Mode**
  - [x] Akses demo cepat di landing page dan login form.
  - [x] Fallback dataset cerdas saat kuota API LLM habis.
- [x] **6.3 UI Polish & Aesthetics**
  - [x] Dark/Light mode elegan, micro-animations, tipografi Plus Jakarta Sans.

---

## 🛠️ Catatan Teknis & Arsitektur
1. **Aturan AI Output:** Seluruh respon dari Gemini/OpenAI untuk graf dan diagnosis WAJIB berupa JSON terstruktur (gunakan `response_mime_type: "application/json"` untuk Gemini atau `response_format: { type: "json_object" }` untuk OpenAI).
2. **Keamanan Kunci API:** API Key Gemini, OpenAI, dan Supabase Service Key hanya diakses melalui Next.js API Routes / Server Actions, tidak boleh terekspos ke client.
3. **Komponen Modular:** Pisahkan komponen ke dalam folder `components/ui/`, `components/graph/`, `components/diagnostic/`, dan `components/tutor/`.
