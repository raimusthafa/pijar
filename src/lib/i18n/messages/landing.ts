import { defineMessages } from '../define';

// Owned by the landing page agent. Use as t('landing.key.name'). Each language is written natively.
// Sample concept names, the sample question and the status labels are illustrations of the product, not data about users.
export default defineMessages({
  id: {
    'hero.title.a': 'Susah kalkulus?',
    'hero.title.b': 'Mungkin masalahnya di aljabar.',
    'hero.sub':
      'Pijar mencari konsep dasar yang belum kuat dari jawabanmu, lalu menyusun jalur belajar mulai dari titik itu.',
    'cta.primary': 'Mulai diagnostik',
    'hero.object.label':
      'Empat kartu konsep terhubung dalam bentuk logo Pijar. Persamaan linear ditandai sebagai konsep yang perlu diperkuat.',

    'how.title.a': 'Dari tes pendek',
    'how.title.b': 'sampai jalur belajar yang jelas',
    'how.prev': 'Langkah sebelumnya',
    'how.next': 'Langkah berikutnya',
    'how.step.1.title': 'Tes diagnostik',
    'how.step.1.body':
      'Paling banyak 10 soal. Soal berikutnya menyesuaikan jawabanmu sebelumnya, jadi kamu tidak mengerjakan soal yang tidak perlu.',
    'how.step.1.q': 'Selesaikan: 2x + 6 = 14',
    'how.step.2.title': 'Peta prasyarat',
    'how.step.2.body':
      'Hasilnya berupa peta konsep. Konsep yang lemah ditandai, lengkap dengan konsep lain yang bergantung padanya.',
    'how.step.3.title': 'Pelajaran beranimasi',
    'how.step.3.body':
      'Tiap konsep dijelaskan dengan animasi grafik. Kamu bisa menjedanya, lalu menggeser titiknya sendiri.',
    'how.step.3.cap': 'Garis singgung f(x) = x^2 di x = 1',
    'how.step.4.title': 'Ruang belajar 5E',
    'how.step.4.body':
      'Tutor memandumu lewat lima tahap. Foto lembar kerjamu atau tulis langsung di kanvas, lalu minta umpan balik.',
    'how.step.5.title': 'Ulasan harian',
    'how.step.5.body':
      'Konsep yang sudah kamu pelajari dijadwalkan ulang mengikuti kurva lupa, supaya tidak hilang begitu saja.',
    'how.step.5.cap': 'Ilustrasi kurva lupa dengan tiga ulasan',

    'fitur.title.a': 'Lihat penjelasannya bergerak,',
    'fitur.title.b': 'lihat konsep mana yang menahanmu',
    'fitur.math.chip': 'Animasi penjelasan',
    'fitur.math.title': 'Grafik yang bisa kamu tonton, jeda, dan geser',
    'fitur.math.stage': 'Kemiringan di setiap titik',
    'fitur.math.body':
      'Ini potongan dari panggung animasi di ruang belajar. Di sana kamu bisa menjeda, memundurkan, dan memilih adegan, lalu menggeser titik di papan latihan.',
    'fitur.map.chip': 'Peta prasyarat',
    'fitur.map.title': 'Tunjukkan konsep yang perlu dibereskan dulu',
    'fitur.map.body':
      'Pilih sebuah konsep untuk melihat semua prasyaratnya. Peta ini contoh, bukan datamu.',
    'fitur.map.label': 'Peta konsep contoh. Pilih konsep untuk menyorot prasyaratnya.',

    'node.n1': 'Bilangan dan pecahan',
    'node.n2': 'Persamaan linear',
    'node.n3': 'Fungsi',
    'node.n4': 'Limit fungsi',
    'node.n5': 'Turunan',
    'node.cat.aljabar': 'Aljabar',
    'node.cat.kalkulus': 'Kalkulus',
    'status.completed': 'Dikuasai',
    'status.gap': 'Perlu diperkuat',
    'status.ready': 'Siap dipelajari',
    'status.locked': 'Terkunci',

    'phase.engage': 'Engage',
    'phase.explore': 'Explore',
    'phase.explain': 'Explain',
    'phase.elaborate': 'Elaborate',
    'phase.evaluate': 'Evaluate',

    'privacy.title.a': 'Data belajarmu,',
    'privacy.title.b': 'dan ke mana ia pergi',
    'privacy.intro':
      'Ringkasannya di bawah ini. Aturan lengkapnya ada di dua halaman yang ditautkan.',
    'privacy.store.title': 'Disimpan di Supabase',
    'privacy.store.body':
      'Akun, jawaban, peta konsep, dan progresmu ada di Supabase. Foto lembar kerja dan hasil kanvas masuk ke bucket privat yang hanya bisa dibuka pemiliknya.',
    'privacy.gemini.title': 'Dikirim ke Google Gemini',
    'privacy.gemini.body':
      'Teks dan foto yang relevan dikirim ke Gemini API untuk membuat materi dan umpan balik. Kami memakai tingkat gratis, dan di tingkat itu Google dapat memakai kontennya untuk meningkatkan produknya. Jangan unggah nama lengkap, alamat, nomor telepon, atau wajah.',
    'privacy.never.title': 'Yang tidak kami lakukan',
    'privacy.never.body': 'Datamu tidak dijual dan tidak dipakai untuk iklan. Cookie hanya untuk login dan pilihan bahasa.',
    'privacy.delete.title': 'Minta salinan atau hapus',
    'privacy.delete.body':
      'Kamu bisa meminta salinan data atau penghapusan akun beserta seluruh isinya. Caranya tertulis di Kebijakan Privasi.',
    'privacy.link.terms': 'Baca Syarat Layanan',
    'privacy.link.privacy': 'Baca Kebijakan Privasi',

    'close.title.a': 'Mulai dari titik',
    'close.title.b': 'kamu benar-benar berada',
  },
  en: {
    'hero.title.a': 'Struggling with calculus?',
    'hero.title.b': 'The problem may be in algebra.',
    'hero.sub':
      'Pijar finds the foundation concept you have not mastered yet, then builds a learning path from that point.',
    'cta.primary': 'Start the diagnostic',
    'hero.object.label':
      'Four linked concept cards arranged in the shape of the Pijar logo. Linear equations is marked as the concept to strengthen.',

    'how.title.a': 'From a short test',
    'how.title.b': 'to a learning path you can follow',
    'how.prev': 'Previous step',
    'how.next': 'Next step',
    'how.step.1.title': 'Diagnostic test',
    'how.step.1.body':
      'At most 10 questions. Each next question adapts to your earlier answers, so you skip questions that tell Pijar nothing new.',
    'how.step.1.q': 'Solve: 2x + 6 = 14',
    'how.step.2.title': 'Prerequisite map',
    'how.step.2.body':
      'The result is a concept map. Weak concepts are marked, together with the concepts that depend on them.',
    'how.step.3.title': 'Animated lessons',
    'how.step.3.body':
      'Each concept is explained with an animated graph. Pause it, then drag the point yourself.',
    'how.step.3.cap': 'Tangent to f(x) = x^2 at x = 1',
    'how.step.4.title': '5E workspace',
    'how.step.4.body':
      'A tutor walks you through five stages. Photograph your worksheet or write on the canvas, then ask for feedback.',
    'how.step.5.title': 'Daily review',
    'how.step.5.body':
      'Concepts you have studied come back on a schedule that follows the forgetting curve, so they do not just fade.',
    'how.step.5.cap': 'Illustration of a forgetting curve with three reviews',

    'fitur.title.a': 'Watch the explanation move,',
    'fitur.title.b': 'see which concept holds you back',
    'fitur.math.chip': 'Animated explanation',
    'fitur.math.title': 'A graph you can watch, pause, and drag',
    'fitur.math.stage': 'The slope at every point',
    'fitur.math.body':
      'This is a clip of the animation stage in the study workspace. There you can pause, rewind, and pick a scene, then drag the point on the practice board.',
    'fitur.map.chip': 'Prerequisite map',
    'fitur.map.title': 'Point at the concept to fix first',
    'fitur.map.body':
      'Select a concept to see everything it depends on. This map is a sample, not your data.',
    'fitur.map.label': 'Sample concept map. Select a concept to highlight its prerequisites.',

    'node.n1': 'Numbers and fractions',
    'node.n2': 'Linear equations',
    'node.n3': 'Functions',
    'node.n4': 'Limits',
    'node.n5': 'Derivatives',
    'node.cat.aljabar': 'Algebra',
    'node.cat.kalkulus': 'Calculus',
    'status.completed': 'Mastered',
    'status.gap': 'Needs work',
    'status.ready': 'Ready to learn',
    'status.locked': 'Locked',

    'phase.engage': 'Engage',
    'phase.explore': 'Explore',
    'phase.explain': 'Explain',
    'phase.elaborate': 'Elaborate',
    'phase.evaluate': 'Evaluate',

    'privacy.title.a': 'Your study data,',
    'privacy.title.b': 'and where it goes',
    'privacy.intro': 'A short version is below. The full rules are on the two pages linked here.',
    'privacy.store.title': 'Stored in Supabase',
    'privacy.store.body':
      'Your account, answers, concept map, and progress live in Supabase. Worksheet photos and canvas exports go to a private bucket that only their owner can open.',
    'privacy.gemini.title': 'Sent to Google Gemini',
    'privacy.gemini.body':
      'Relevant text and photos go to the Gemini API to produce lessons and feedback. We use the free tier, and on that tier Google may use the content to improve its products. Do not upload your full name, address, phone number, or face.',
    'privacy.never.title': 'What we do not do',
    'privacy.never.body':
      'Your data is not sold and not used for ads. Cookies are only for staying signed in and remembering your language.',
    'privacy.delete.title': 'Ask for a copy or deletion',
    'privacy.delete.body':
      'You can ask for a copy of your data, or for your account and everything in it to be deleted. The Privacy Policy explains how.',
    'privacy.link.terms': 'Read the Terms of Service',
    'privacy.link.privacy': 'Read the Privacy Policy',

    'close.title.a': 'Start from where',
    'close.title.b': 'you actually are',
  },
});
