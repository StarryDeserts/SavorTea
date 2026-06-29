export interface LlmConfig {
  provider: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

export function hasLlmConfig(c: LlmConfig): boolean {
  return Boolean(c.baseURL && c.apiKey && c.model);
}
