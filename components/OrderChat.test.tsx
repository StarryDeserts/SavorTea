import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderChat } from '@/components/OrderChat';
import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { DISHES } from '@/lib/dishes/data';

beforeEach(() => useTeahouseStore.getState().reset());

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
});
