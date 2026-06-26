import type { JudgeResult } from './judge';

export async function judgeOrder(input: {
  dishId: string;
  transcript: string;
  pass: boolean;
}): Promise<JudgeResult> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`judge failed: ${res.status}`);
  return (await res.json()) as JudgeResult;
}
