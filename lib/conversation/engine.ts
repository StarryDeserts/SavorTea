import type { JudgeResult } from './judge';
import { parseJudgeContent } from './judge';
import type { LlmConfig } from '@/lib/settings/llmConfig';
import { hasLlmConfig } from '@/lib/settings/llmConfig';
import { DISHES } from '@/lib/dishes/data';
import { buildJudgePrompt } from './prompt';
import { postChatCompletions } from './openaiCompatible';
import type { ChatMessage } from './types';

export async function judgeOrder(
  input: { dishId: string; transcript: string; pass: boolean },
  llmConfig?: LlmConfig,
): Promise<JudgeResult> {
  if (llmConfig && hasLlmConfig(llmConfig)) {
    const dish = DISHES.find((d) => d.id === input.dishId);
    if (!dish) throw new Error(`unknown dish: ${input.dishId}`);
    const messages: ChatMessage[] = [
      { role: 'system', content: buildJudgePrompt(dish, input.transcript, input.pass) },
      { role: 'user', content: input.transcript },
    ];
    const content = await postChatCompletions({
      baseURL: llmConfig.baseURL,
      apiKey: llmConfig.apiKey,
      model: llmConfig.model,
      messages,
      jsonMode: true,
    });
    const parsed = parseJudgeContent(content);
    if (!parsed) throw new Error('judge parse failed');
    return parsed;
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`judge failed: ${res.status}`);
  return (await res.json()) as JudgeResult;
}
