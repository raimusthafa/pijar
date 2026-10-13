import { getQuestions } from '@/lib/learn/question-bank';
import { currentItem, type AdaptiveState } from './adaptive';
import type { CurriculumNode } from '@/types';

/** Resolves the head of the queue into a question (cache first). Question includes correctIndex: the pretest is formative. */
export async function nextAdaptiveQuestion(
  state: AdaptiveState, nodes: CurriculumNode[], topic: string, language: 'id' | 'en' = 'id'
) {
  const item = currentItem(state);
  if (!item) return null;
  const label = nodes.find(n => n.id === item.nodeId)?.label;
  const [question] = await getQuestions({ topic, nodeId: item.nodeId, label, difficulty: item.level, count: 1, language });
  return { ...item, question };
}
