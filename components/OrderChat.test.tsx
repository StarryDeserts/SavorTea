import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderChat } from '@/components/OrderChat';
import { useTeahouseStore } from '@/lib/store/teahouseStore';

beforeEach(() => useTeahouseStore.getState().reset());

describe('OrderChat', () => {
  it('renders an input to talk to 點心姨', () => {
    render(<OrderChat />);
    expect(screen.getByPlaceholderText(/點心姨/)).toBeInTheDocument();
  });
});
