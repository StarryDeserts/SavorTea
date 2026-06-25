import { callDeepSeek } from '@/lib/conversation/deepseek';
import { buildSystemPrompt } from '@/lib/conversation/prompt';
import { DISHES } from '@/lib/dishes/data';
import type { ChatMessage } from '@/lib/conversation/types';

export async function POST(req: Request): Promise<Response> {
  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages)) {
    return Response.json({ error: 'messages_must_be_array' }, { status: 400 });
  }

  const system: ChatMessage = { role: 'system', content: buildSystemPrompt(DISHES) };
  try {
    const reply = await callDeepSeek([system, ...messages]);
    return Response.json({ reply });
  } catch {
    return Response.json({ error: 'upstream_error' }, { status: 502 });
  }
}
