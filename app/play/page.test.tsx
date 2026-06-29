import { describe, it, expect, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { render, screen } from '@testing-library/react';
import PlayPage from '@/app/play/page';

describe('PlayPage (/play)', () => {
  it('renders the game surface (stamp book)', () => {
    render(<PlayPage />);
    expect(screen.getByLabelText('蝦餃 未蓋章')).toBeInTheDocument();
  });
});
