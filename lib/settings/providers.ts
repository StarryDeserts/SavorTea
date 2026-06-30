export interface ProviderPreset {
  id: string;
  label: string;
  baseURL: string;
  defaultModel: string;
  models?: string[];
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  { id: 'deepseek', label: 'DeepSeek', baseURL: 'https://api.deepseek.com', defaultModel: 'deepseek-v4-flash', models: ['deepseek-v4-flash', 'deepseek-v4-pro'] },
  { id: 'openai', label: 'OpenAI', baseURL: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
  { id: 'moonshot', label: 'Moonshot', baseURL: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k' },
  { id: 'qwen', label: '通义(DashScope)', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus' },
  { id: 'custom', label: '自定义', baseURL: '', defaultModel: '' },
];

export function providerLabel(id: string): string {
  return PROVIDER_PRESETS.find((p) => p.id === id)?.label ?? id;
}
