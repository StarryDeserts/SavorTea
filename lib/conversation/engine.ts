import type { Dish } from '@/lib/dishes/types';
import type { ChatMessage } from './types';
import { FALLBACK_LINES } from './persona';

export function detectOrderedDishes(userText: string, dishes: Dish[]): Dish[] {
  return dishes.filter(
    (d) => userText.includes(d.nameYue) || userText.includes(d.namePutonghua),
  );
}

function randomFallback(): string {
  return FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)];
}

export async function sendChat(history: ChatMessage[]): Promise<string> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });
    if (!res.ok) throw new Error(`chat failed: ${res.status}`);
    const data = (await res.json()) as { reply?: string };
    if (!data.reply) throw new Error('empty reply');
    return data.reply;
  } catch {
    return randomFallback();
  }
}
