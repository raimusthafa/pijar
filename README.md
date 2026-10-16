# PIJAR

Platform belajar adaptif berbasis AI yang menemukan konsep prasyarat yang belum dikuasai siswa, lalu menyusun jalur belajar mulai dari titik itu. Dibuat untuk siswa SMA, dimulai dari matematika.

**Situs:** https://pijar.syahranfd.site
**Kompetisi:** Hackathon JOINTS UGM 2026, tema Education

Mengapa PIJAR ada: banyak siswa tersendat bukan karena konsep yang sedang dipelajari terlalu sulit, tetapi karena konsep di belakangnya belum kuat. Di PISA 2022, 18% siswa Indonesia mencapai minimal Level 2 matematika, sedangkan rata-rata OECD 69% (OECD, 2023).

## Yang bisa dilakukan siswa

1. **Tes diagnostik adaptif.** Siswa menulis tujuan belajar, lalu menjawab maksimal 10 soal. Jawaban benar membawa ke soal lebih sulit, jawaban salah membuka konsep yang mendasarinya sampai dua tingkat.
2. **Peta prasyarat.** Hasil tes tampil sebagai graf berarah tanpa siklus. Konsep lanjutan terkunci sampai prasyaratnya dikuasai.
3. **Pelajaran per konsep.** Video bernarasi yang dirender di peramban, papan interaktif yang bisa digeser, penjelasan, analogi, contoh, dan bagian salah kaprah.
4. **Ruang belajar dengan tutor AI.** Alur 5E (Engage, Explore, Explain, Elaborate, Evaluate). Tutor membimbing lewat pertanyaan sebelum memberi jawaban, dan siswa bisa mengirim foto lembar kerja.
5. **Uji pemahaman.** Sampai 10 soal. Skor di atas 70 menandai konsep selesai dan membuka konsep berikutnya.
6. **Ulasan harian.** Konsep yang selesai diajukan kembali saat perkiraan ingatan turun di bawah 0,7, memakai kurva peluruhan `R = exp(-hari / stabilitas)`.

Antarmuka tersedia dalam Bahasa Indonesia dan Inggris.

## Teknologi

| Bagian | Yang dipakai |
|---|---|
| Aplikasi web | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Peta prasyarat | React Flow (`@xyflow/react`) |
| Video dan papan | manim-web, JSXGraph, KaTeX, `mathjs` untuk parser ekspresi yang aman |
| Data dan akun | Supabase (PostgreSQL, Auth, Storage) |
| AI | Google Gemini (`@google/genai`), OpenAI sebagai cadangan |
| Uji | `node --test` untuk unit, Playwright untuk e2e |

Logika inti ada di `src/lib/<domain>` sebagai fungsi biasa yang bisa diuji tanpa Next: `graph`, `diagnostic`, `mastery`, `scheduler`, `learn`, `workspace`, dan `ai`. Semua pemanggilan model AI lewat satu pintu, `src/lib/ai/provider.ts`, dan keluaran AI divalidasi sebelum disimpan atau ditampilkan.

## Menjalankan secara lokal

Prasyarat: Node.js 22 atau lebih baru, dan satu proyek Supabase.

```bash
npm ci
cp .env.example .env      # isi nilainya, lihat tabel di bawah
npm run dev               # http://localhost:3000
```

Terapkan skema database dengan menjalankan berkas di `supabase/migrations/` secara berurutan (SQL Editor Supabase atau `supabase db push`).

| Variabel | Fungsi |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Kunci publik (boleh sampai ke peramban) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sama dengan kunci publik, dipakai kode lama |
| `SUPABASE_SERVICE_ROLE_KEY` | Hanya untuk server, jangan diawali `NEXT_PUBLIC_` |
| `GEMINI_API_KEY` | Kunci Google AI Studio |
| `OPENAI_API_KEY` | Opsional, cadangan bila Gemini tidak tersedia |
| `AI_PROVIDER` | `gemini` atau `openai` |
| `NEXT_PUBLIC_DEMO_MODE` | `true` memakai materi cadangan tanpa memanggil AI |

## Pengujian

```bash
npm run lint
npx tsc --noEmit
npm test            # 201 tes unit
npm run test:e2e    # Playwright
```

## Deploy

Push ke `master` menjalankan GitHub Actions (`.github/workflows/deploy.yml`): lint, tipe, tes, build, lalu build dipublikasikan sebagai rilis. Server mengambil rilis terbaru lewat timer systemd, mengalihkan ke build baru, dan kembali ke build sebelumnya bila pemeriksaan kesehatan gagal. Rinciannya ada di [`deploy/README.md`](deploy/README.md).

## Privasi

Data belajar disimpan di Supabase dan memakai Row Level Security. Teks dan foto yang relevan dikirim ke Google Gemini untuk menyusun materi. Data tidak dijual atau dipakai untuk iklan. Aturan lengkap ada di halaman Syarat Layanan dan Kebijakan Privasi di aplikasi.

## Penggunaan AI dalam pengembangan

Sesuai ketentuan lomba, kami menyatakan bahwa asisten AI dipakai selama pengembangan untuk membantu menulis dan meninjau kode serta dokumentasi. Keputusan produk, arsitektur, dan hasil akhir ditinjau oleh tim. Di dalam aplikasi, model Gemini dipakai untuk menyusun materi, soal, dan narasi, dan hasilnya divalidasi sebelum sampai ke siswa.

## Tim

Dewa Geda Reksa Parama Aditya, Syahran Fadhil Dafanindra, Raihan Musthafa Kamal, Alfandi Hassan.

## Referensi

- OECD (2023). *PISA 2022 Results (Volume I)*. OECD Publishing. https://doi.org/10.1787/53f23881-en
- Hogan, A. dkk. (2021). Knowledge graphs. *ACM Computing Surveys, 54*(4). https://doi.org/10.1145/3447772
- Bybee, R. W. dkk. (2006). *The BSCS 5E instructional model: Origins and effectiveness*. BSCS.
