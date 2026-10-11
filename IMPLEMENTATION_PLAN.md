# 📋 IMPLEMENTATION PLAN & PROGRESS TRACKER: PIJAR

> **Dokumen Panduan & Pelacak Kemajuan Proyek**  
> Digunakan sebagai checkpoint status pengerjaan. Setiap kali sesi berhenti atau berlanjut, perbarui status dan checklist di file ini agar dapat langsung melanjutkan progress tanpa kehilangan konteks.

---

## 📌 Status Saat Ini
- **Nama Aplikasi:** `Pijar`
- **Fase Aktif:** `Fase 3: Dynamic Curriculum Knowledge Graph (F3)` *(Selesai, Lolos Typecheck & Production Build)*
- **Status:** 🚀 *Fase 3 Berhasil Diimplementasikan & Tervalidasi*
- **Terakhir Diperbarui:** 2026-10-11
- **Tahap Berikutnya:** `Fase 4: Personalization Learning Journey (F4)` — Integrasi penuh materi belajar kuis mini & auto-unlock.

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
*Status: ✅ Selesai*

- [x] **1.1 Halaman Autentikasi**
  - [x] `src/middleware.ts` — Route protection & session refresh Supabase SSR.
  - [x] `app/auth/login/page.tsx` — UI Login split-screen + Demo Login 1-klik.
  - [x] `app/auth/register/page.tsx` — UI Register + password strength indicator.
  - [x] `app/auth/callback/route.ts` — OAuth/email confirmation callback handler.
  - [x] `app/globals.css` — Pijar design system (brand amber, glassmorphism, animations).
  - [x] `app/layout.tsx` — Root layout dengan metadata SEO & TooltipProvider.
  - [x] `app/page.tsx` — Landing page premium (hero, how-it-works, features, CTA).
- [x] **1.2 Alur Onboarding**
  - [x] `app/onboarding/page.tsx` — Wizard 3 langkah: pilih topik (6 opsi), tujuan (4 opsi), gaya belajar (2 opsi).
  - [x] Simpan preferensi ke tabel `profiles` via Supabase.
  - [x] `app/dashboard/page.tsx` — Dashboard Server Component dengan daftar kurikulum aktif.
- [x] **1.3 Design System Pijar**
  - [x] Warna brand amber/gold dengan `oklch`.
  - [x] Glassmorphism, gradient hero, micro-animations, tipografi Plus Jakarta Sans + Inter.

---

### 🟩 Fase 2: Pre-test Adaptif & Prerequisite Detection (F1 & F2)
*Status: ✅ Selesai (Dievaluasi & Diverifikasi via Browser Subagent)*

- [x] **2.1 Generator Soal Diagnostik (F1)**
  - [x] Endpoint `/api/diagnostic/start` untuk menghasilkan 3–5 soal diagnostik adaptif berbasis topik.
  - [x] Komponen UI kuis interaktif (pertanyaan satu per satu, pilihan ganda, progress indicator, hotkeys A-D).
- [x] **2.2 Engine Deteksi Prasyarat & Analisis Gap (F2)**
  - [x] Endpoint `/api/diagnostic/analyze` untuk mengevaluasi jawaban user.
  - [x] AI prompt khusus untuk mengidentifikasi *root knowledge gap* (konsep prasyarat yang belum dikuasai).
  - [x] Output JSON terstruktur: daftar konsep prasyarat yang hilang + narasi justifikasi mengapa konsep tersebut krusial.
  - [x] Tampilan ringkasan hasil diagnosis sebelum masuk ke Knowledge Graph (`/diagnostic` results view).

---

### 🟩 Fase 3: Dynamic Curriculum Knowledge Graph (F3)
*Status: ✅ Selesai (Diverifikasi Algoritmik & Production Build Turbopack)*

- [x] **3.1 Graph Data Generator & Domain Engine**
  - [x] Engine graf murni (`src/lib/graph/engine.ts`) dengan validasi DAG Kahn's Algorithm & deteksi siklus.
  - [x] Atribut Node lengkap (`src/lib/graph/types.ts` & `src/types/index.ts`): `id`, `label`, `category`, `status` (`locked` | `prerequisite_gap` | `ready` | `in_progress` | `completed`), `estimatedMinutes`, `is_gap`, `justification`.
  - [x] Hierarchical topological DAG layout (`src/lib/graph/layout.ts`) dengan penempatan deterministik kiri-ke-kanan tanpa tumpang tindih.
  - [x] Adapter multi-topik & hasil diagnostik pre-test (`src/lib/graph/adapter.ts`).
- [x] **3.2 UI Knowledge Graph Canvas**
  - [x] Komponen kanvas React Flow `@xyflow/react` (`src/components/graph/CurriculumCanvas.tsx`).
  - [x] Desain custom nodes (`ConceptNodeComponent.tsx`) dengan status badges dan efek *restrained gap pulse glow* berbasis `prefers-reduced-motion`.
  - [x] Kontrol kanvas: Zoom, Pan, Fit View, Recenter, Filter (Semua / Hanya Gap / Siap Belajar), Minimap, dan Legend (`GraphControlsBar.tsx`, `GraphLegend.tsx`).
  - [x] Inspector panel (`GraphInspector.tsx`) dengan detail konsep, justifikasi gap, daftar prasyarat langsung, materi turunan, tombol fokus & sorot rantai ketergantungan.
  - [x] Halaman utama `/graph` (`src/app/graph/page.tsx`), dynamic route `/graph/[id]`, serta fallback terhubung ke `/learn/[graphId]/[nodeId]`.

---

### 🟦 Fase 4: Personalization Learning Journey (F4)
*Status: 🔲 Belum Mulai*

- [ ] **4.1 Tampilan Materi Pembelajaran**
  - [ ] Halaman / Modal detail materi per konsep (`/learn/[graphId]/[nodeId]`).
  - [ ] Toggle format belajar:
    - **Mode Teks:** Materi ringkas terstruktur, analogi mudah dipahami, poin penting.
    - **Mode Video:** Kurasi embed video YouTube / referensi visual interaktif.
- [ ] **4.2 Checkpoint Kuis & Update Progres**
  - [ ] Mini kuis pemahaman (1–2 soal per konsep).
  - [ ] Pembaruan status node menjadi `completed` di Supabase dan membuka node berikutnya di graf secara otomatis.

---

### 🟦 Fase 5: AI Copilot & Misconception Detection (F5, F6, F7)
*Status: 🔲 Belum Mulai*

- [ ] **5.1 AI Learning Copilot (F6)**
  - [ ] Widget chat interaktif di samping/bawah materi belajar.
  - [ ] Streaming respon Gemini / OpenAI via API Route `/api/chat`.
  - [ ] Pembatasan konteks agar AI hanya menjawab seputar materi konsep yang sedang aktif.
- [ ] **5.2 Misconception Detection (F7)**
  - [ ] Analisis pola ketika pengguna salah memilih jawaban pada mini kuis.
  - [ ] AI memberikan feedback kognitif: membedah mengapa pengguna berpikir opsi tersebut benar dan meluruskan konsep yang sebenarnya.
- [ ] **5.3 User Dashboard (F5)**
  - [ ] Halaman dashboard utama: Ringkasan kurikulum aktif, persentase penguasaan, daftar gap yang sudah teratasi.

---

### 🟦 Fase 6: Vision Showcase (F8 - F10), Fail-Safe Demo & Final Polish
*Status: 🔲 Belum Mulai*

- [ ] **6.1 UI Mockup Fitur Vision (Pitch Deck Purpose)**
  - [ ] **F8 Mastery Tracking:** Grafik radar / progress penguasaan materi.
  - [ ] **F9 Learning Scheduler:** Kalender target belajar visual.
  - [ ] **F10 Community:** Feed forum diskusi dummy.
- [ ] **6.2 Hackathon Fail-Safe Demo Mode**
  - [ ] Tombol *"Quick Demo Walkthrough"* (memuat data pre-set tanpa menunggu pemrosesan LLM jika terjadi limit API juri).
  - [ ] Switch toggle Demo Mode (Live AI vs Mock Offline).
- [ ] **6.3 UI Polish & Aesthetics**
  - [ ] Dark/Light mode elegan, micro-animations, styling typography Google Font (Inter / Outfit).

---

## 🛠️ Catatan Teknis & Arsitektur
1. **Aturan AI Output:** Seluruh respon dari Gemini/OpenAI untuk graf dan diagnosis WAJIB berupa JSON terstruktur (gunakan `response_mime_type: "application/json"` untuk Gemini atau `response_format: { type: "json_object" }` untuk OpenAI).
2. **Keamanan Kunci API:** API Key Gemini, OpenAI, dan Supabase Service Key hanya diakses melalui Next.js API Routes / Server Actions, tidak boleh terekspos ke client.
3. **Komponen Modular:** Pisahkan komponen ke dalam folder `components/ui/`, `components/graph/`, `components/diagnostic/`, dan `components/tutor/`.
