import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '@/app/settings/page';
import { useLlmConfigStore } from '@/lib/settings/llmConfigStore';

beforeEach(() => useLlmConfigStore.getState().clear());
afterEach(() => vi.restoreAllMocks());

describe('SettingsPage', () => {
  it('renders the key field and the privacy note', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/只保存在本机/)).toBeInTheDocument();
    expect(document.querySelector('input[type="password"]')).toBeTruthy();
  });

  it('fills baseURL and model when a preset is chosen', () => {
    render(<SettingsPage />);
    fireEvent.change(document.querySelector('.settings-provider-select')!, { target: { value: 'openai' } });
    const baseURL = screen.getByDisplayValue('https://api.openai.com/v1');
    expect(baseURL).toBeInTheDocument();
    expect(screen.getByDisplayValue('gpt-4o-mini')).toBeInTheDocument();
  });

  it('shows a success state when the connection test resolves', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
    }));
    useLlmConfigStore.getState().setConfig({ apiKey: 'sk-user' });
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('测试连接'));
    await waitFor(() => expect(screen.getByText('连接成功,可以使用')).toBeInTheDocument());
  });

  it('shows a failure state when the connection test rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    useLlmConfigStore.getState().setConfig({ apiKey: 'sk-user' });
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('测试连接'));
    await waitFor(() => expect(screen.getByText(/连接失败/)).toBeInTheDocument());
  });

  it('renders the model field as a select with deepseek options on initial render', () => {
    render(<SettingsPage />);
    expect(screen.getByDisplayValue('deepseek-v4-flash')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'deepseek-v4-pro' })).toBeInTheDocument();
  });

  it('clears the key', () => {
    useLlmConfigStore.getState().setConfig({ apiKey: 'sk-user' });
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('清除 Key'));
    expect(useLlmConfigStore.getState().apiKey).toBe('');
  });
});
