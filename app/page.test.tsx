import { describe, it, expect, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { render, screen } from '@testing-library/react';
import LandingPage from '@/app/page';

describe('LandingPage (/)', () => {
  it('renders hero slogan, how-to-play, menu wall, cultural intro, and a /play link', () => {
    render(<LandingPage />);
    expect(screen.getByText(/開口就嗌/)).toBeInTheDocument(); // hero slogan
    expect(screen.getByText('開口嗌')).toBeInTheDocument(); // how-step 1 title
    expect(screen.getByText(/廣府人嘅生活味道/)).toBeInTheDocument(); // cultural intro
    expect(screen.getByText('蝦餃')).toBeInTheDocument(); // menu wall
    const playLinks = screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/play');
    expect(playLinks.length).toBeGreaterThanOrEqual(1);
  });
});
