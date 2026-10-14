import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { weeklyReport, retentionBars, overlayStatus, daysUntilDue, dueRows, nextStep, buildGraphOptions } from '../src/lib/dashboard/derive.ts';
import { cleanDraft, isMissingTable } from '../src/lib/community/posts.ts';

const now = new Date('2026-10-13T12:00:00Z');
const ago = d => new Date(now.getTime() - d * 86400000).toISOString();

describe('dashboard derive', () => {
  test('weekly report counts only the last 7 days and reports empty honestly', () => {
    const rows = [
      { node_id: 'a', status: 'completed', updated_at: ago(0.5), last_reviewed_at: ago(0.5) },
      { node_id: 'b', status: 'completed', updated_at: ago(3), last_reviewed_at: null },
      { node_id: 'c', status: 'completed', updated_at: ago(10), last_reviewed_at: ago(9) },
      { node_id: 'd', status: 'in_progress', updated_at: ago(1) },
    ];
    const w = weeklyReport(rows, now);
    assert.equal(w.mastered, 2);
    assert.equal(w.reviewed, 1);
    assert.equal(w.days[6].mastered, 1);
    assert.equal(w.days[3].mastered, 1);
    assert.equal(weeklyReport([rows[2]], now).hasData, false);
  });
  test('retention bars: completed only, weakest first', () => {
    const rows = [
      { node_id: 'a', status: 'completed', last_reviewed_at: ago(1), stability_days: 1 },
      { node_id: 'b', status: 'completed', last_reviewed_at: ago(1), stability_days: 10 },
      { node_id: 'c', status: 'ready', last_reviewed_at: ago(5), stability_days: 1 },
    ];
    const bars = retentionBars(rows, new Map([['a', 'A']]), now);
    assert.deepEqual(bars.map(b => b.nodeId), ['a', 'b']);
    assert.equal(bars[0].label, 'A');
    assert.equal(bars[0].due, true);
    assert.equal(bars[1].due, false);
    assert.equal(dueRows(rows, now).length, 1);
  });
  test('daysUntilDue matches the 0.7 threshold', () => {
    assert.ok(Math.abs(Math.exp(-daysUntilDue(4) / 4) - 0.7) < 1e-9);
  });
  test('progress rows override node status; nextStep follows the graph engine', () => {
    const nodes = [
      { id: 'x', label: 'X', category: 'k', description: '', status: 'ready', estimated_minutes: 10, is_gap: false },
      { id: 'y', label: 'Y', category: 'k', description: '', status: 'locked', estimated_minutes: 10, is_gap: false },
    ];
    const edges = [{ id: 'e', source: 'x', target: 'y' }];
    const merged = overlayStatus(nodes, [{ node_id: 'x', status: 'completed' }]);
    assert.equal(merged[0].status, 'completed');
    assert.equal(nextStep(nodes, edges).node.id, 'x');
    assert.equal(nextStep(merged.map(n => ({ ...n, status: 'completed' })), edges).kind, 'done');
  });
  test('buildGraphOptions computes done/total progress descriptions accurately', () => {
    const graphs = [
      {
        id: 'g1',
        topic: 'Aljabar Dasar',
        nodes: [{ status: 'completed' }, { status: 'completed' }, { status: 'ready' }],
      },
      {
        id: 'g2',
        topic: 'Kalkulus Lanjut',
        nodes: [{ status: 'ready' }, { status: 'locked' }],
      },
    ];
    const opts = buildGraphOptions(graphs, (done, total) => `${done} dari ${total} konsep`);
    assert.deepEqual(opts, [
      {
        value: 'g1',
        label: 'Aljabar Dasar',
        description: '2 dari 3 konsep',
      },
      {
        value: 'g2',
        label: 'Kalkulus Lanjut',
        description: '0 dari 2 konsep',
      },
    ]);
  });
});

describe('community posts', () => {
  test('cleanDraft trims and rejects empty or oversized input', () => {
    assert.equal(cleanDraft({ title: ' ', content: 'x', concept: 'c', category: 'question' }), null);
    assert.equal(cleanDraft({ title: 't', content: 'x'.repeat(2001), concept: 'c', category: 'question' }), null);
    assert.equal(cleanDraft({ title: ' t ', content: 'x', concept: 'c', category: 'insight' }).title, 't');
  });
  test('detects a missing table', () => {
    assert.equal(isMissingTable({ code: 'PGRST205' }), true);
    assert.equal(isMissingTable({ code: '42P01' }), true);
    assert.equal(isMissingTable({ code: '42501', message: 'permission denied' }), false);
    assert.equal(isMissingTable(null), false);
  });
});
