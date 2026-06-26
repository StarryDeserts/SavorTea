import { callDeepSeek } from '@/lib/conversation/deepseek';
import { buildJudgePrompt } from '@/lib/conversation/prompt';
import { parseJudgeContent, buildJudgeFallback } from '@/lib/conversation/judge';
import { DISHES } from '@/lib/dishes/data';
import type { ChatMessage } from '@/lib/conversation/types';

interface JudgeRequest {
  dishId?: unknown;
  transcript?: unknown;
  pass?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  let body: JudgeRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { dishId, transcript, pass } = body;
  if (typeof dishId !== 'string' || typeof transcript !== 'string' || typeof pass !== 'boolean') {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const dish = DISHES.find((d) => d.id === dishId);
  if (!dish) {
    return Response.json({ error: 'unknown_dish' }, { status: 400 });
  }

  try {
    const system: ChatMessage = { role: 'system', content: buildJudgePrompt(dish, transcript, pass) };
    const user: ChatMessage = { role: 'user', content: transcript };
    const content = await callDeepSeek([system, user], { jsonMode: true });
    const parsed = parseJudgeContent(content);
    return Response.json(parsed ?? buildJudgeFallback(dish, pass));
  } catch {
    return Response.json(buildJudgeFallback(dish, pass));
  }
}
