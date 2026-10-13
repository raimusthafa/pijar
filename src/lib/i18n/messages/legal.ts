import { defineMessages } from '../define';

// Terms and Privacy. Structure (sections and paragraph counts) lives in src/components/legal/LegalPage.tsx.
// Draft text, not legal advice. The contact placeholder must be filled by the owner before launch.
export default defineMessages({
  id: {
    'common.draft': 'Draf, bukan nasihat hukum.',
    'common.updated': 'Terakhir diperbarui 13 Oktober 2026.',
    'common.backHome': 'Kembali ke beranda',
    'common.contact': '[alamat email kontak, diisi pemilik]',

    'terms.title': 'Syarat Layanan',
    'terms.intro':
      'Dengan membuat akun atau memakai Pijar, kamu setuju dengan syarat di bawah ini. Bahasanya sengaja dibuat sederhana supaya siswa bisa membacanya sendiri.',
    'terms.use.title': 'Apa yang Pijar lakukan',
    'terms.use.p1':
      'Pijar adalah alat belajar. Kamu menjawab soal diagnostik, lalu Pijar menunjukkan konsep dasar yang masih lemah dan menyusun urutan materi dari titik itu. Materi, soal, dan umpan balik dibuat dengan bantuan AI.',
    'terms.use.p2':
      'Pijar tidak menggantikan guru, buku pelajaran, atau ujian resmi. Pakai ia sebagai teman belajar.',
    'terms.account.title': 'Akunmu',
    'terms.account.p1':
      'Kamu bertanggung jawab atas akun dan kata sandimu. Kalau kamu curiga akunmu dipakai orang lain, ganti kata sandi dan hubungi kami.',
    'terms.account.p2':
      'Siswa di bawah 17 tahun sebaiknya memakai Pijar bersama orang tua atau guru.',
    'terms.content.title': 'Foto dan tulisan yang kamu kirim',
    'terms.content.p1':
      'Foto lembar kerja, hasil coretan di kanvas, dan teks yang kamu kirim tetap milikmu. Kamu mengizinkan Pijar menyimpannya dan mengirimkannya ke layanan AI, hanya untuk membuat materi dan umpan balik bagimu.',
    'terms.content.p2':
      'Jangan menaruh data pribadi di dalam foto atau teks, baik milikmu maupun milik orang lain: nama lengkap, alamat, nomor telepon, atau wajah. Alasannya ada di Kebijakan Privasi.',
    'terms.ai.title': 'Materi buatan AI bisa salah',
    'terms.ai.p1':
      'AI bisa membuat penjelasan, soal, atau penilaian yang keliru. Periksa lagi dengan buku atau gurumu, terutama sebelum ujian. Kami tidak menjanjikan nilai atau hasil belajar tertentu.',
    'terms.rules.title': 'Aturan pemakaian',
    'terms.rules.p1':
      'Jangan memakai Pijar untuk melanggar hukum, mengganggu orang lain, membobol sistem, atau mengambil materinya secara massal. Kami boleh membatasi atau menutup akun yang melanggar hal ini.',
    'terms.changes.title': 'Perubahan dan ketersediaan',
    'terms.changes.p1':
      'Pijar masih dikembangkan. Fitur bisa berubah dan layanan kadang tidak bisa dibuka. Kalau syarat ini berubah, versi barunya tampil di halaman ini beserta tanggal pembaruan.',
    'terms.end.title': 'Berhenti memakai Pijar',
    'terms.end.p1':
      'Kamu bisa berhenti kapan saja dan meminta akunmu dihapus. Caranya ada di Kebijakan Privasi.',
    'terms.contact.title': 'Kontak',
    'terms.contact.p1': 'Pertanyaan tentang syarat ini bisa dikirim ke {contact}.',

    'privacy.title': 'Kebijakan Privasi',
    'privacy.intro':
      'Halaman ini menjelaskan data apa yang Pijar simpan, di mana disimpannya, dan siapa yang menerimanya.',
    'privacy.collect.title': 'Data yang kami simpan',
    'privacy.collect.p1':
      'Data akun: alamat email dan kata sandi. Kata sandi tidak kami simpan sebagai teks biasa.',
    'privacy.collect.p2':
      'Data belajar: topik yang kamu pilih, jawaban diagnostik, peta konsep, tingkat penguasaan tiap konsep, jadwal ulasan, dan progres.',
    'privacy.collect.p3':
      'Berkas: foto lembar kerja dan hasil ekspor kanvas yang kamu unggah.',
    'privacy.where.title': 'Di mana data disimpan',
    'privacy.where.p1':
      'Data akun dan data belajar disimpan di Supabase. Foto dan ekspor kanvas disimpan di bucket Supabase Storage yang privat, sehingga hanya pemiliknya yang bisa membacanya.',
    'privacy.gemini.title': 'Pengiriman ke Google Gemini',
    'privacy.gemini.p1':
      'Untuk membuat materi dan umpan balik, Pijar mengirim teks dan foto yang relevan ke Gemini API milik Google.',
    'privacy.gemini.p2':
      'Pijar memakai Gemini API tingkat gratis. Pada tingkat gratis, Google dapat memakai konten yang dikirim untuk meningkatkan produknya. Karena itu jangan memasukkan informasi pribadi ke dalam foto atau teks, misalnya nama lengkap, alamat, nomor telepon, atau wajah.',
    'privacy.gemini.p3':
      'Setelah konten sampai ke Google, penanganannya mengikuti kebijakan Google, bukan kebijakan kami.',
    'privacy.never.title': 'Yang tidak kami lakukan',
    'privacy.never.p1': 'Kami tidak menjual datamu dan tidak memakainya untuk iklan.',
    'privacy.cookies.title': 'Cookie',
    'privacy.cookies.p1':
      'Pijar memakai cookie untuk menjaga kamu tetap masuk dan untuk mengingat pilihan bahasa. Tidak ada cookie iklan.',
    'privacy.rights.title': 'Meminta salinan atau penghapusan data',
    'privacy.rights.p1':
      'Kamu bisa meminta salinan data atau penghapusan akun beserta seluruh data belajar dan berkas yang tersimpan. Kirim permintaannya ke {contact} dari email yang kamu pakai untuk mendaftar.',
    'privacy.age.title': 'Usia',
    'privacy.age.p1':
      'Siswa di bawah 17 tahun sebaiknya memakai Pijar bersama orang tua atau guru, termasuk saat memutuskan foto apa yang boleh diunggah.',
    'privacy.changes.title': 'Perubahan',
    'privacy.changes.p1':
      'Kalau kebijakan ini berubah, versi barunya tampil di halaman ini beserta tanggal pembaruan.',
    'privacy.contact.title': 'Kontak',
    'privacy.contact.p1': 'Pertanyaan tentang privasi bisa dikirim ke {contact}.',
  },
  en: {
    'common.draft': 'Draft, not legal advice.',
    'common.updated': 'Last updated October 13, 2026.',
    'common.backHome': 'Back to home',
    'common.contact': '[contact email, to be filled in by the owner]',

    'terms.title': 'Terms of Service',
    'terms.intro':
      'By creating an account or using Pijar you agree to the terms below. They are kept plain on purpose so students can read them on their own.',
    'terms.use.title': 'What Pijar does',
    'terms.use.p1':
      'Pijar is a study tool. You answer diagnostic questions, and Pijar shows which basic concepts are still weak and orders the material from that point. Lessons, questions, and feedback are made with the help of AI.',
    'terms.use.p2':
      'Pijar does not replace a teacher, a textbook, or an official exam. Treat it as a study partner.',
    'terms.account.title': 'Your account',
    'terms.account.p1':
      'You are responsible for your account and password. If you think someone else is using your account, change your password and contact us.',
    'terms.account.p2':
      'Students under 17 should use Pijar together with a parent or teacher.',
    'terms.content.title': 'Photos and text you send',
    'terms.content.p1':
      'Worksheet photos, canvas drawings, and text you send stay yours. You allow Pijar to store them and send them to an AI service, only to make lessons and feedback for you.',
    'terms.content.p2':
      "Keep personal information out of photos and text, yours or anyone else's: full names, addresses, phone numbers, or faces. The Privacy Policy explains why.",
    'terms.ai.title': 'AI-made material can be wrong',
    'terms.ai.p1':
      'AI can produce explanations, questions, or grading that are mistaken. Check against your textbook or your teacher, especially before an exam. We do not promise any particular grade or learning result.',
    'terms.rules.title': 'Rules of use',
    'terms.rules.p1':
      'Do not use Pijar to break the law, bother other people, break into the system, or copy its material in bulk. We may limit or close accounts that do.',
    'terms.changes.title': 'Changes and availability',
    'terms.changes.p1':
      'Pijar is still being built. Features can change and the service is sometimes down. If these terms change, the new version appears on this page with its update date.',
    'terms.end.title': 'Stopping',
    'terms.end.p1':
      'You can stop at any time and ask for your account to be deleted. The Privacy Policy says how.',
    'terms.contact.title': 'Contact',
    'terms.contact.p1': 'Questions about these terms can go to {contact}.',

    'privacy.title': 'Privacy Policy',
    'privacy.intro':
      'This page explains what data Pijar keeps, where it is kept, and who receives it.',
    'privacy.collect.title': 'What we store',
    'privacy.collect.p1':
      'Account data: your email address and password. We do not store the password as plain text.',
    'privacy.collect.p2':
      'Study data: the topics you pick, diagnostic answers, concept maps, your mastery of each concept, review schedules, and progress.',
    'privacy.collect.p3': 'Files: the worksheet photos and canvas exports you upload.',
    'privacy.where.title': 'Where it is stored',
    'privacy.where.p1':
      'Account and study data live in Supabase. Photos and canvas exports are kept in a private Supabase Storage bucket that only their owner can read.',
    'privacy.gemini.title': 'What goes to Google Gemini',
    'privacy.gemini.p1':
      "To make lessons and feedback, Pijar sends the relevant text and photos to Google's Gemini API.",
    'privacy.gemini.p2':
      'Pijar uses the free tier of the Gemini API. On the free tier, Google may use submitted content to improve its products. So do not put personal information in photos or text, such as a full name, an address, a phone number, or a face.',
    'privacy.gemini.p3':
      "Once content reaches Google, Google's own policies decide how it is handled, not ours.",
    'privacy.never.title': 'What we do not do',
    'privacy.never.p1': 'We do not sell your data and we do not use it for advertising.',
    'privacy.cookies.title': 'Cookies',
    'privacy.cookies.p1':
      'Pijar uses cookies to keep you signed in and to remember your language. There are no advertising cookies.',
    'privacy.rights.title': 'Asking for a copy or deletion',
    'privacy.rights.p1':
      'You can ask for a copy of your data, or for your account to be deleted along with all study data and files. Send the request to {contact} from the email you signed up with.',
    'privacy.age.title': 'Age',
    'privacy.age.p1':
      'Students under 17 should use Pijar together with a parent or teacher, including when deciding which photos are fine to upload.',
    'privacy.changes.title': 'Changes',
    'privacy.changes.p1':
      'If this policy changes, the new version appears on this page with its update date.',
    'privacy.contact.title': 'Contact',
    'privacy.contact.p1': 'Privacy questions can go to {contact}.',
  },
});
