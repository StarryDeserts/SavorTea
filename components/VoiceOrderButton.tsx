'use client';

import { useState } from 'react';
import { transcribeAudioBlob } from '@/lib/shadowing/transcribeApi';

export interface VoiceOrderButtonProps {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
}

export function VoiceOrderButton({ onTranscript, disabled }: VoiceOrderButtonProps) {
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
        onTranscript(transcript);
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
      className="voice-order-button"
      data-recording={recording}
      data-busy={busy}
      disabled={disabled || busy}
      onClick={recording ? stop : start}
    >
      {busy ? '聽緊…' : recording ? '停止' : '㩒住講粵語'}
    </button>
  );
}
