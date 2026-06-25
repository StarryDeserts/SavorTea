'use client';

import { useState } from 'react';
import { transcribeAudioBlob } from '@/lib/shadowing/transcribeApi';
import { calculateTextSimilarity } from '@/lib/shadowing/textSimilarity';

export interface ShadowingButtonProps {
  targetPhrase: string;
  onResult: (score: number, transcript: string) => void;
}

export function ShadowingButton({ targetPhrase, onResult }: ShadowingButtonProps) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks: BlobPart[] = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => chunks.push(e.data);
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setBusy(true);
      try {
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        const transcript = await transcribeAudioBlob(blob);
        const score = calculateTextSimilarity(transcript, targetPhrase);
        onResult(score, transcript);
      } finally {
        setBusy(false);
      }
    };
    mr.start();
    setRecorder(mr);
    setRecording(true);
  }

  function stop() {
    recorder?.stop();
    setRecording(false);
  }

  return (
    <button
      type="button"
      className="shadowing-button"
      data-recording={recording}
      disabled={busy}
      onClick={recording ? stop : start}
    >
      {busy ? '評緊分…' : recording ? '停止錄音' : `跟讀:${targetPhrase}`}
    </button>
  );
}
