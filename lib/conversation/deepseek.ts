import 'server-only';
import type { ChatMessage } from './types';
import { postChatCompletions } from './openaiCompatible';

export async function callDeepSeek(
  messages: ChatMessage[],
  opts?: { jsonMode?: boolean },
): Promise<string> {
  const baseURL = process.env.DEEPSEEK_API_BASE_URL;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!baseURL || !apiKey) throw new Error('DeepSeek env not configured');
  return postChatCompletions({ baseURL, apiKey, model: 'deepseek-chat', messages, jsonMode: opts?.jsonMode });
}
