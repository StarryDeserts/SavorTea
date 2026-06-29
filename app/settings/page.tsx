'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLlmConfigStore } from '@/lib/settings/llmConfigStore';
import { PROVIDER_PRESETS } from '@/lib/settings/providers';
import { postChatCompletions } from '@/lib/conversation/openaiCompatible';

type TestState = 'idle' | 'testing' | 'ok' | 'fail';

export default function SettingsPage() {
  const { provider, baseURL, apiKey, model, setConfig, clear } = useLlmConfigStore();
  const [test, setTest] = useState<TestState>('idle');

  function onPreset(id: string) {
    const preset = PROVIDER_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    if (id === 'custom') setConfig({ provider: id });
    else setConfig({ provider: id, baseURL: preset.baseURL, model: preset.defaultModel });
  }

  async function testConnection() {
    setTest('testing');
    try {
      await postChatCompletions({ baseURL, apiKey, model, messages: [{ role: 'user', content: 'ping' }] });
      setTest('ok');
    } catch {
      setTest('fail');
    }
  }

  return (
    <main className="settings">
      <h1>設定 · API Key</h1>
      <p className="settings-privacy">
        你嘅 API key 只存喺你部機,直連你揀嘅 provider,唔會經過我哋嘅伺服器、唔會上傳、唔會 log。
      </p>

      <label className="settings-field">
        <span className="settings-label">供應商</span>
        <select className="settings-provider-select" value={provider} onChange={(e) => onPreset(e.target.value)}>
          {PROVIDER_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </label>

      <label className="settings-field">
        <span className="settings-label">接口地址 baseURL</span>
        <input className="settings-input" value={baseURL} onChange={(e) => setConfig({ baseURL: e.target.value })} />
      </label>

      <label className="settings-field">
        <span className="settings-label">API Key</span>
        <input className="settings-input" type="password" value={apiKey} onChange={(e) => setConfig({ apiKey: e.target.value })} />
      </label>

      <label className="settings-field">
        <span className="settings-label">型號 model</span>
        <input className="settings-input" value={model} onChange={(e) => setConfig({ model: e.target.value })} />
      </label>

      <div className="settings-actions">
        <button type="button" className="settings-test-button" onClick={testConnection}>測試連接</button>
        <button type="button" onClick={() => { clear(); setTest('idle'); }}>清除 key</button>
        <Link href="/">返去</Link>
      </div>

      <p className="settings-test-result" data-state={test}>
        {test === 'testing' && '測緊…'}
        {test === 'ok' && '通咗,可以用'}
        {test === 'fail' && '連唔到(可能 CORS 封咗、key 唔啱、或者網絡問題)'}
      </p>
    </main>
  );
}
