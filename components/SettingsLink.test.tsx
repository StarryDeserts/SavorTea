import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { render, screen } from '@testing-library/react';
import { SettingsLink } from '@/components/SettingsLink';
import { useLlmConfigStore } from '@/lib/settings/llmConfigStore';

beforeEach(() => useLlmConfigStore.getState().clear());

describe('SettingsLink', () => {
  it('prompts to set a key when unconfigured', () => {
    render(<SettingsLink />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/settings');
    expect(link).toHaveAttribute('data-configured', 'false');
    expect(link).toHaveTextContent('設定你嘅 API Key');
  });

  it('shows the active provider label when configured', () => {
    useLlmConfigStore.getState().setConfig({ provider: 'deepseek', baseURL: 'https://api.deepseek.com', apiKey: 'sk-user', model: 'deepseek-chat' });
    render(<SettingsLink />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('data-configured', 'true');
    expect(link).toHaveTextContent('用緊 你嘅 DeepSeek');
  });
});
