'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  ThumbsUp,
  Share2,
  Sparkles,
  Tag,
  Send,
  PlusCircle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { SHOWCASE_COMMUNITY_POSTS, type CommunityDiscussionPost } from '@/lib/community/fixtures';

interface CommunityViewProps {
  currentUserName?: string;
}

export function CommunityView({ currentUserName = 'Pelajar Pijar' }: CommunityViewProps) {
  const [posts, setPosts] = useState<CommunityDiscussionPost[]>(SHOWCASE_COMMUNITY_POSTS);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [isPosting, setIsPosting] = useState<boolean>(false);

  // Form State
  const [newTitle, setNewTitle] = useState<string>('');
  const [newConcept, setNewConcept] = useState<string>('Rekursi');
  const [newContent, setNewContent] = useState<string>('');

  // Load custom posts from localStorage if any
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pijar_community_posts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPosts([...parsed, ...SHOWCASE_COMMUNITY_POSTS]);
        }
      }
    } catch {}
  }, []);

  const handleUpvote = (id: string) => {
    setUpvotedIds(prev => {
      const next = new Set(prev);
      const isUpvoted = next.has(id);
      if (isUpvoted) next.delete(id);
      else next.add(id);

      setPosts(curr =>
        curr.map(p => {
          if (p.id === id) {
            return { ...p, upvotes: p.upvotes + (isUpvoted ? -1 : 1) };
          }
          return p;
        })
      );
      return next;
    });
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newPost: CommunityDiscussionPost = {
      id: `user-post-${Date.now()}`,
      authorName: currentUserName,
      authorRole: 'Pelajar Aktif Pijar',
      conceptTag: newConcept,
      title: newTitle.trim(),
      content: newContent.trim(),
      upvotes: 1,
      repliesCount: 0,
      createdAt: 'Baru saja',
      isDemoShowcase: false,
    };

    const updated = [newPost, ...posts];
    setPosts(updated);
    setUpvotedIds(prev => new Set(prev).add(newPost.id));

    // Save only user posts to storage
    const userOnly = updated.filter(p => !p.isDemoShowcase);
    try {
      localStorage.setItem('pijar_community_posts', JSON.stringify(userOnly));
    } catch {}

    setNewTitle('');
    setNewContent('');
    setIsPosting(false);
  };

  return (
    <div className="space-y-6">
      {/* ── Community Header ───────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <MessageSquare className="w-3.5 h-3.5" />
            Komunitas Belajar & Diskusi Konseptual
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Forum Tanya Jawab & Wawasan Rekan Belajar
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Diskusikan analogi materi, pecahkan miskonsepsi bersama, dan berbagi wawasan terkait konsep kurikulum teknologi.
          </p>
        </div>

        <button
          onClick={() => setIsPosting(prev => !prev)}
          className="px-4 py-2.5 rounded-xl font-bold text-xs text-white pijar-gradient shadow-md hover:opacity-95 transition-all flex items-center gap-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          {isPosting ? 'Tutup Form' : 'Mulai Diskusi Baru'}
        </button>
      </div>

      {/* ── Create Post Form Modal/Card ─────────────────────── */}
      {isPosting && (
        <form
          onSubmit={handleCreatePost}
          className="p-6 rounded-3xl bg-card border border-amber-500/40 shadow-xl space-y-4 animate-fade-in-up"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Tulis Pertanyaan atau Wawasan Belajar Baru
            </h3>
            <span className="text-xs text-muted-foreground">Diposting sebagai: {currentUserName}</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Judul Diskusi:</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Contoh: Mengapa Tail Call Optimization menghemat memori?"
                className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Topik / Konsep:</label>
              <select
                value={newConcept}
                onChange={e => setNewConcept(e.target.value)}
                className="w-full bg-muted/60 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-foreground"
              >
                <option value="Rekursi">Rekursi & Call Stack</option>
                <option value="Gradient Descent">Gradient Descent & Adam</option>
                <option value="Indexing & B-Trees">Indexing & B-Trees</option>
                <option value="Async JavaScript">Async JS & Event Loop</option>
                <option value="Logika Proposisi">Logika Proposisi</option>
                <option value="Teorema Bayes">Teorema Bayes</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Detail Pertanyaan / Pemikiran:</label>
            <textarea
              required
              rows={3}
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Jelaskan pertanyaan atau kendala pemahamanmu secara mendalam..."
              className="w-full bg-muted/60 border border-border rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsPosting(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white pijar-gradient shadow-md hover:opacity-90 transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Publikasikan Diskusi
            </button>
          </div>
        </form>
      )}

      {/* ── Discussion Feed ─────────────────────────────────── */}
      <div className="space-y-4">
        {posts.map(post => {
          const isUpvoted = upvotedIds.has(post.id);

          return (
            <div
              key={post.id}
              className="p-5 sm:p-6 rounded-3xl bg-card border border-border hover:border-border/80 transition-all space-y-3 shadow-sm"
            >
              {/* Post Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full pijar-gradient flex items-center justify-center text-white text-xs font-bold">
                    {post.authorName[0]?.toUpperCase() || 'P'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-2">
                      <span>{post.authorName}</span>
                      {post.isDemoShowcase ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          Showcase Demo
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Pelajar Aktif
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {post.authorRole} • {post.createdAt}
                    </div>
                  </div>
                </div>

                {/* Concept Tag */}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-muted text-muted-foreground border border-border/50 shrink-0">
                  <Tag className="w-3 h-3 text-amber-500" />
                  {post.conceptTag}
                </span>
              </div>

              {/* Title & Body */}
              <div className="space-y-1.5">
                <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                  {post.title}
                </h3>
                <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                <button
                  onClick={() => handleUpvote(post.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                    isUpvoted
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                      : 'border-border/60 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{post.upvotes}</span>
                </button>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{post.repliesCount} Jawaban</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
