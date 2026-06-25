import { encodeWAV } from './wavEncoder';
import { SHADOWING_API_BASE } from '@/lib/jyutping/client';

export async function convertBlobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx =
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) throw new Error('Web Audio API not available');
  const audioContext = new AudioCtx();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const samples = audioBuffer.getChannelData(0);
    const wavBuffer = encodeWAV(samples, audioBuffer.sampleRate);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  } finally {
    void audioContext.close();
  }
}

export async function transcribeAudioBlob(
  blob: Blob,
  convert: (b: Blob) => Promise<Blob> = convertBlobToWav,
): Promise<string> {
  const wav = await convert(blob);
  const form = new FormData();
  form.append('file', wav, 'audio.wav');
  form.append('task', 'transcribe');
  const res = await fetch(`${SHADOWING_API_BASE}/api/transcribe`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Transcribe failed: ${res.status}`);
  const data = (await res.json()) as { text?: string };
  return data.text ?? '';
}
