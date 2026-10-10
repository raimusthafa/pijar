n # Product Requirements Document (PRD) - App Joints
**Status:** MVP (Hackathon Edition)
**Tujuan:** Mengembangkan aplikasi pembelajaran adaptif yang mendiagnosis *knowledge gap* dan membangun kurikulum dinamis berbasis graf (Curriculum Knowledge Graph).

## 1. Tech Stack (Fullstack)
Proyek ini menggunakan arsitektur modern yang ramah terhadap *vibe coding* (AI-assisted development):
*   **Framework:** Next.js (App Router) - *Fullstack* (React frontend & API Routes backend).
*   **Styling & UI:** Tailwind CSS, Shadcn UI (komponen UI cepat), React Flow / Vis.js (visualisasi graf kurikulum).
*   **Database & Auth:** Supabase (PostgreSQL) - Menangani autentikasi *user* dan penyimpanan relasional.
*   **AI Providers:**
    *   **Google Gemini (Gemini 1.5 Flash):** Prioritas untuk kecepatan pemrosesan data (seperti *parsing* JSON untuk *Knowledge Graph*).
    *   **OpenAI (gpt-4o-mini):** Digunakan sebagai alternatif atau dikhususkan untuk *reasoning* kompleks (*Misconception Detection* / *AI Agent*).
    *   *Catatan Arsitektur AI:* Buat abstraksi *service/util* di Next.js API Routes agar mudah menukar (*toggle*) antara Gemini atau ChatGPT.

## 2. Core User Flow (Alur Pengguna)
1.  **Onboarding:** Pengguna *login* (Supabase Auth) dan mengatur *Goals* pembelajaran.
2.  **Diagnostic (Pre-test):** Pengguna mengambil tes awal. Soal disesuaikan secara adaptif oleh AI.
3.  **Graph Generation (Curriculum):** AI memproses hasil tes, mendeteksi materi yang kurang (*Prerequisite Detection*), lalu merender graf rute belajar (*Knowledge Graph*).
4.  **Learning Journey:** Pengguna mulai belajar dengan format materi sesuai preferensi mereka (Video/Teks).
5.  **Interactive Tutoring:** Di dalam halaman materi, terdapat *AI Agent* untuk tanya jawab dan sistem *Misconception Detection* saat *user* mengerjakan kuis latihan.

## 3. Spesifikasi Fitur (Requirement Specifications)

### A. Fitur Prioritas (MVP Utama - Wajib Selesai)
*Fokuskan pengerjaan pada fitur-fitur ini untuk demo hackathon.*

*   **F1. Pre-test Adaptif**
    *   **Deskripsi:** Tes diagnostik awal untuk menemukan *learning gaps*.
    *   **Implementasi:** Next.js *Client Component* untuk UI kuis, memanggil Next.js API Route yang terhubung ke LLM untuk *generate* soal berdasarkan respons sebelumnya.
*   **F2. Prerequisite Detection**
    *   **Deskripsi:** Mengidentifikasi konsep dasar yang belum dikuasai dan memberikan alasan *mengapa* pengguna butuh materi tersebut.
    *   **Implementasi:** LLM menganalisis jawaban salah dari pre-test dan mengeluarkan *output* JSON berisi daftar konsep prasyarat dan narasi justifikasinya.
*   **F3. Curriculum Knowledge Graph**
    *   **Deskripsi:** Representasi visual rute pembelajaran berbentuk graf (hubungan antar konsep).
    *   **Implementasi:** Menggunakan pustaka `reactflow`. Data *nodes* dan *edges* dihasilkan dari *output* JSON LLM berdasarkan hasil dari F2, kemudian disimpan ke Supabase agar persisten.
*   **F4. Personalization Learning Method**
    *   **Deskripsi:** Penyesuaian format penyampaian materi sesuai gaya belajar.
    *   **Implementasi:** Opsi *toggle* (Video / Teks) di UI yang mengubah cara materi (di- *generate* oleh AI atau diambil dari *database*) ditampilkan kepada pengguna.

### B. Fitur Penting (Pembeda / Differentiator)
*Dikerjakan setelah fitur prioritas terintegrasi.*

*   **F5. User Dashboard**
    *   **Deskripsi:** Dasbor utama pengguna.
    *   **Implementasi:** Halaman beranda Next.js yang mengambil data dari Supabase (Biodata, Progres belajar terkini).
*   **F6. AI Agent**
    *   **Deskripsi:** Asisten belajar interaktif (kopilot).
    *   **Implementasi:** Komponen *chat bubble* menggunakan Vercel AI SDK (opsional) atau *fetch* langsung ke Next.js API Routes (mendukung *streaming text* dari Gemini/OpenAI). *Prompt* dibatasi hanya untuk menjawab konteks materi aktif.
*   **F7. Misconception Detection**
    *   **Deskripsi:** Analisis pola jawaban salah saat latihan untuk meluruskan pola pikir.
    *   **Implementasi:** *Background process* saat evaluasi latihan. LLM mengevaluasi histori kuis pengguna dan memberikan *feedback* perbaikan kognitif.

### C. Fitur Mid (Vision / Pitch Deck Only)
*Cukup buat UI Mockup/Dummy untuk keperluan presentasi, tidak perlu di-backend-kan.*

*   **F8. Mastery Tracking:** Grafik perkembangan penguasaan konsep dari waktu ke waktu.
*   **F9. Learning Scheduler:** Kalender/pengingat jadwal belajar.
*   **F10. Community:** Halaman forum diskusi antarpengguna.

## 4. Struktur Database (Draft Supabase Schema)
Untuk mempercepat *vibe coding*, berikut panduan skema tabel Supabase:

*   **`users`**: Menampung profil (*handled by* Supabase Auth + tabel ekstensi untuk *learning_style*, *goals*).
*   **`learning_graphs`**: Menyimpan struktur JSON dari graf kurikulum pengguna (kolom: `id`, `user_id`, `graph_data_json`, `created_at`).
*   **`user_progress`**: Menyimpan status *node* graf mana yang sedang dipelajari atau sudah selesai.
*   **`chat_history`**: Menyimpan histori percakapan AI Agent per sesi/materi.

## 5. Aturan AI Prompting (Vibe Coding Rules)
*Instruksi untuk AI Code Editor (Cursor/Windsurf):*
1.  **Format JSON Wajib:** Setiap kali berinteraksi dengan Gemini/OpenAI API untuk *logic* fitur (kecuali *chat agent*), paksa LLM merespons dalam format JSON (gunakan fitur *Structured Outputs* OpenAI atau `response_mime_type: "application/json"` di Gemini).
2.  **Server Actions/API Routes:** Gunakan Next.js API Routes (App Router `/app/api/...`) atau Server Actions secara aman untuk menyembunyikan API Key LLM dan Supabase Service Key.
3.  **Modular Components:** Buat komponen UI (Tombol, Card, ChatBox, GraphCanvas) di *folder* `/components` secara terpisah.
4.  **Desain Minimalis:** Gunakan utilitas Tailwind secara ekstensif, pertahankan UI bersih dengan dominasi *whitespace* (khas ed-tech modern).