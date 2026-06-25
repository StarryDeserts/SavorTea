import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShareCardButton } from '@/components/ShareCardButton';
import { useTeahouseStore } from '@/lib/store/teahouseStore';

beforeEach(() => useTeahouseStore.getState().reset());

describe('ShareCardButton', () => {
  it('renders the share action', () => {
    render(<ShareCardButton />);
    expect(screen.getByRole('button')).toHaveTextContent('今日飲茶');
  });
});
