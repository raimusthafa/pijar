import Link from 'next/link';
import { ArrowRight, Brain, GitBranch, Sparkles, Zap, BookOpen, Target } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-full">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 glass border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg pijar-gradient flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Pijar
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Masuk
            </Link>
            <Link
              href="/auth/register"
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full pijar-gradient text-white hover:opacity-90 transition-opacity shadow-sm"
            >
              Mulai Gratis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="flex-1 pijar-gradient-hero flex items-center justify-center px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pijar-100 text-pijar-700 text-xs font-semibold mb-6 border border-pijar-200 animate-fade-in-up">
            <Zap className="w-3.5 h-3.5" />
            Powered by Gemini AI
          </div>

          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6 animate-fade-in-up"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", animationDelay: '0.1s' }}
          >
            Belajar yang{' '}
            <span className="relative">
              <span className="relative z-10 text-transparent bg-clip-text pijar-gradient">
                Benar-benar
              </span>
            </span>
            <br />
            Personal untukmu
          </h1>

          <p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            Pijar mendiagnosis <em>knowledge gap</em> kamu, lalu membangun jalur belajar visual berbasis AI
            yang dimulai dari titik <strong className="text-foreground">persis di mana kamu berada</strong> — bukan dari nol.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link
              href="/auth/register"
              id="hero-cta-register"
              className="flex items-center gap-2 px-7 py-3.5 rounded-full pijar-gradient text-white font-semibold text-base hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Diagnosa Sekarang — Gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/login?demo=true"
              id="hero-cta-demo"
              className="flex items-center gap-2 px-7 py-3.5 rounded-full border border-border bg-background/80 font-semibold text-base hover:bg-accent transition-all text-foreground"
            >
              <Zap className="w-4 h-4 text-pijar-500" />
              Coba Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section className="py-24 px-6 bg-background border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Bagaimana Pijar bekerja?</h2>
            <p className="text-muted-foreground text-lg">Tiga langkah untuk jalur belajar yang personal</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Target className="w-6 h-6" />,
                step: '01',
                title: 'Diagnosa Pertama',
                desc: 'Ambil pre-test singkat 5 soal. AI menganalisis pola jawaban kamu untuk menemukan gap konsep yang sebenarnya.',
              },
              {
                icon: <GitBranch className="w-6 h-6" />,
                step: '02',
                title: 'Peta Belajarmu',
                desc: 'AI membangun Knowledge Graph visual — peta konsep interaktif yang menunjukkan urutan belajar optimal untukmu.',
              },
              {
                icon: <Brain className="w-6 h-6" />,
                step: '03',
                title: 'Belajar dengan Kopilot',
                desc: 'Pelajari setiap konsep dengan AI Tutor yang kontekstual. Salah? AI langsung meluruskan pola pikirmu.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group relative p-8 rounded-2xl border border-border/70 bg-card hover:border-pijar-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="text-xs font-bold text-pijar-400 tracking-widest mb-4">{item.step}</div>
                <div className="w-12 h-12 rounded-xl bg-pijar-100 text-pijar-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Highlights ──────────────────────────────── */}
      <section className="py-24 px-6 pijar-gradient-soft border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Lebih dari sekadar kursus biasa</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: <Brain className="w-5 h-5" />, title: 'Misconception Detection', desc: 'AI mendeteksi dan meluruskan pola pikir yang salah saat kamu menjawab kuis, bukan sekadar memberi tahu jawaban benar.' },
              { icon: <GitBranch className="w-5 h-5" />, title: 'Curriculum Knowledge Graph', desc: 'Lihat jalur belajarmu sebagai graf interaktif. Pahami ketergantungan antar konsep secara visual.' },
              { icon: <BookOpen className="w-5 h-5" />, title: 'Gaya Belajarmu', desc: 'Pilih format yang cocok — ringkasan teks terstruktur atau video kurasi. Toggle kapan saja.' },
              { icon: <Sparkles className="w-5 h-5" />, title: 'AI Tutor Kontekstual', desc: 'Tanya apa saja tentang materi yang sedang dipelajari. AI hanya fokus pada konteks pelajaranmu, bukan menjawab hal lain.' },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 p-6 rounded-2xl bg-background border border-border/70 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-lg bg-pijar-100 text-pijar-600 flex-shrink-0 flex items-center justify-center">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ─────────────────────────────────────── */}
      <section className="py-24 px-6 bg-background border-t border-border/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Siap mulai belajar dengan cara yang benar?</h2>
          <p className="text-muted-foreground mb-8">Gratis. Tanpa kartu kredit. Mulai diagnosa dalam 2 menit.</p>
          <Link
            href="/auth/register"
            id="bottom-cta-register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full pijar-gradient text-white font-semibold text-base hover:opacity-90 transition-all shadow-lg"
          >
            Mulai Gratis Sekarang <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-border/50 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded pijar-gradient flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="font-bold text-sm">Pijar</span>
        </div>
        <p className="text-xs text-muted-foreground">Built for JOINTS UGM Hackathon 2026</p>
      </footer>
    </div>
  );
}
