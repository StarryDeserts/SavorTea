'use client';

import Link from 'next/link';
import { useLlmConfigStore } from '@/lib/settings/llmConfigStore';
import { hasLlmConfig } from '@/lib/settings/llmConfig';
import { providerLabel } from '@/lib/settings/providers';

export function SettingsLink() {
  const provider = useLlmConfigStore((s) => s.provider);
  const baseURL = useLlmConfigStore((s) => s.baseURL);
  const apiKey = useLlmConfigStore((s) => s.apiKey);
  const model = useLlmConfigStore((s) => s.model);
  const configured = hasLlmConfig({ provider, baseURL, apiKey, model });
  return (
    <Link className="settings-link" href="/settings" data-configured={configured}>
      {configured ? `用緊 你嘅 ${providerLabel(provider)}` : '設定你嘅 API Key'}
    </Link>
  );
}
