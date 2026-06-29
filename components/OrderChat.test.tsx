import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderChat } from '@/components/OrderChat';
import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { useLlmConfigStore } from '@/lib/settings/llmConfigStore';
import { DISHES } from '@/lib/dishes/data';

vi.mock('@/lib/conversation/engine', () => ({
  judgeOrder: vi.fn().mockResolvedValue({ reply: '好嘞!', stars: 3, tip: '' }),
}));
import { judgeOrder } from '@/lib/conversation/engine';

beforeEach(() => {
  useTeahouseStore.getState().reset();
  useLlmConfigStore.getState().clear();
  vi.mocked(judgeOrder).mockClear();
});

describe('OrderChat', () => {
  it('renders a way to talk to 點心姨', () => {
    render(<OrderChat />);
    expect(screen.getByPlaceholderText(/點心姨/)).toBeInTheDocument();
  });

  it('shows the level-1 quest goal and a voice-order button at the start', () => {
    render(<OrderChat />);
    expect(screen.getByText(DISHES[0].task.goal)).toBeInTheDocument();
    expect(screen.getByText('第 1 關 / 10')).toBeInTheDocument();
    expect(document.querySelector('.voice-order-button')).toBeTruthy();
  });

  it('shows the all-cleared done state once every level is cleared', () => {
    const s = useTeahouseStore.getState();
    DISHES.forEach((d) => s.clearLevel(d.id, 3));
    render(<OrderChat />);
    expect(document.querySelector('[data-all-cleared]')).toBeTruthy();
  });

  it('forwards the saved LLM config to judgeOrder on submit', async () => {
    useLlmConfigStore.getState().setConfig({ baseURL: 'https://prov.test', apiKey: 'sk-user', model: 'deepseek-chat' });
    render(<OrderChat />);
    fireEvent.change(screen.getByPlaceholderText(/點心姨/), { target: { value: DISHES[0].task.hint } });
    fireEvent.click(screen.getByRole('button', { name: '嗌' }));
    await waitFor(() => expect(judgeOrder).toHaveBeenCalled());
    expect(vi.mocked(judgeOrder).mock.calls[0][1]).toMatchObject({
      baseURL: 'https://prov.test',
      apiKey: 'sk-user',
      model: 'deepseek-chat',
    });
  });
});
