import type { ChatMessage } from './types';

export async function postChatCompletions(opts: {
  baseURL: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  jsonMode?: boolean;
}): Promise<string> {
  const res = await fetch(`${opts.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: 0.8,
      max_tokens: 400,
      ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`chat error ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}
