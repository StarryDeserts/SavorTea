import 'server-only';
import type { ChatMessage } from './types';

export async function callDeepSeek(
  messages: ChatMessage[],
  opts?: { jsonMode?: boolean },
): Promise<string> {
  const base = process.env.DEEPSEEK_API_BASE_URL;
  const key = process.env.DEEPSEEK_API_KEY;
  if (!base || !key) throw new Error('DeepSeek env not configured');

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.8,
      max_tokens: 400,
      ...(opts?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek error ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}
