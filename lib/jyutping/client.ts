export const SHADOWING_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.shadowing.app.aidimsum.com';

export async function fetchJyutping(text: string): Promise<string> {
  const res = await fetch(`${SHADOWING_API_BASE}/api/to_jyutping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Jyutping fetch failed: ${res.status}`);
  const data = (await res.json()) as { content?: string };
  return data.content ?? '';
}
