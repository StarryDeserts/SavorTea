import type { JudgeResult } from './judge';
import { parseJudgeContent, buildJudgeFallback } from './judge';
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
  const dish = DISHES.find((d) => d.id === input.dishId);
  if (!dish) throw new Error(`unknown dish: ${input.dishId}`);

  // No user key configured → deterministic fallback, fully client-side (no server).
  if (!llmConfig || !hasLlmConfig(llmConfig)) {
    return buildJudgeFallback(dish, input.pass);
  }

  // BYOK → call the user's chosen provider directly from the browser.
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
  return parseJudgeContent(content) ?? buildJudgeFallback(dish, input.pass);
}
