'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLlmConfigStore } from '@/lib/settings/llmConfigStore';
import { PROVIDER_PRESETS } from '@/lib/settings/providers';
import { hasLlmConfig } from '@/lib/settings/llmConfig';
import { postChatCompletions } from '@/lib/conversation/openaiCompatible';

type TestState = 'idle' | 'testing' | 'ok' | 'fail';

export default function SettingsPage() {
  const { provider, baseURL, apiKey, model, setConfig, clear } = useLlmConfigStore();
  const [test, setTest] = useState<TestState>('idle');
  const ready = hasLlmConfig({ provider, baseURL, apiKey, model });
  const currentModels = PROVIDER_PRESETS.find((p) => p.id === provider)?.models;

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
      <h1>设置 · API Key</h1>
      <p className="settings-privacy">
        你的 API Key 只保存在本机,直接连接你选择的服务商,不会经过我们的服务器、不会上传、不会记录。
      </p>

      <label className="settings-field">
        <span className="settings-label">服务商</span>
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
        <span className="settings-label">模型 model</span>
        {currentModels ? (
          <select className="settings-provider-select" value={model} onChange={(e) => setConfig({ model: e.target.value })}>
            {currentModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        ) : (
          <input className="settings-input" value={model} onChange={(e) => setConfig({ model: e.target.value })} />
        )}
      </label>

      <div className="settings-actions">
        <button type="button" className="settings-test-button" onClick={testConnection} disabled={!ready}>测试连接</button>
        <button type="button" onClick={() => { clear(); setTest('idle'); }}>清除 Key</button>
        <Link href="/">返回</Link>
      </div>

      <p className="settings-test-result" data-state={test}>
        {test === 'testing' && '测试中…'}
        {test === 'ok' && '连接成功,可以使用'}
        {test === 'fail' && '连接失败(可能是 CORS 限制、Key 错误,或网络问题)'}
      </p>
    </main>
  );
}
