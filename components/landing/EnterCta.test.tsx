import { describe, it, expect, vi } from 'vitest';

// next/link 在 App Router 单测里会找 router context;用一个渲染 <a> 的桩替掉。
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { render, screen } from '@testing-library/react';
import { EnterCta } from '@/components/landing/EnterCta';

describe('EnterCta', () => {
  it('shows 開市 and links to /play for a fresh visitor', () => {
    render(<EnterCta clearedCount={0} total={10} />);
    const link = screen.getByRole('link', { name: '開市' });
    expect(link).toHaveAttribute('href', '/play');
  });

  it('shows 續攤 with progress for a returning visitor', () => {
    const { container } = render(<EnterCta clearedCount={3} total={10} />);
    expect(screen.getByRole('link', { name: /續攤/ })).toBeInTheDocument();
    expect(screen.getByText(/3\/10/)).toBeInTheDocument();
    expect(container.querySelector('.enter-cta[data-returning="true"]')).toBeInTheDocument();
  });
});
