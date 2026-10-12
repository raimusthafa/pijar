// ================================================================
// PIJAR - Community Discussion Data Contracts & Showcase Fixtures (F10)
// Clearly separated between verified demo showcases and live user posts
// ================================================================

export interface CommunityDiscussionPost {
  id: string;
  authorName: string;
  authorRole: string;
  conceptTag: string;
  title: string;
  content: string;
  upvotes: number;
  repliesCount: number;
  createdAt: string;
  isDemoShowcase: boolean; // Explicit label to avoid misleading users
}

export const SHOWCASE_COMMUNITY_POSTS: CommunityDiscussionPost[] = [
  {
    id: 'demo-post-1',
    authorName: 'Rian Pratama',
    authorRole: 'Pelajar Machine Learning',
    conceptTag: 'Gradient Descent',
    title: 'Bagaimana cara terbaik mendeteksi overshooting pada learning rate?',
    content: 'Saat mencoba melatih model regresi sederhana, kurva loss saya sempat melonjak tajam alih-alih turun. Ternyata learning rate 0.5 terlalu agresif untuk skala fitur yang belum dinormalisasi. Sangat terbantu dengan visualisasi animasi loss di Pijar!',
    upvotes: 24,
    repliesCount: 5,
    createdAt: '2 jam yang lalu',
    isDemoShowcase: true,
  },
  {
    id: 'demo-post-2',
    authorName: 'Siti Sarah',
    authorRole: 'Software Engineer Intern',
    conceptTag: 'Rekursi & Call Stack',
    title: 'Tips memahami unwinding rekursi: bayangkan piring kotor',
    content: 'Dulu saya selalu bingung mengapa nilai faktorial tidak langsung keluar. Analogi tumpukan piring Call Stack di materi rekursi benar-benar membuka mata: kita menumpuk sampai base case, baru mencuci satu per satu dari atas ke bawah!',
    upvotes: 38,
    repliesCount: 8,
    createdAt: '5 jam yang lalu',
    isDemoShowcase: true,
  },
  {
    id: 'demo-post-3',
    authorName: 'Budi Santoso',
    authorRole: 'Backend Developer',
    conceptTag: 'Indexing & B-Trees',
    title: 'Hati-hati dengan composite index: urutan kolom itu menentukan!',
    content: 'Jangan lupa aturan SARGability saat membuat indeks majemuk: kolom kesetaraan (equality) harus diletakkan di depan sebelum kolom rentang (range/inequality). EXPLAIN ANALYZE adalah sahabat terbaik kita.',
    upvotes: 42,
    repliesCount: 11,
    createdAt: 'Kemarin',
    isDemoShowcase: true,
  },
];
