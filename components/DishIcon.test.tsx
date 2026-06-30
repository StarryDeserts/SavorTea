import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DishIcon } from '@/components/DishIcon';
import { DISHES } from '@/lib/dishes/data';

describe('DishIcon', () => {
  it('renders the mapped SVG for a known dish id (no emoji fallback)', () => {
    const harGow = DISHES.find((d) => d.id === 'har-gow')!;
    const { container } = render(<DishIcon dish={harGow} />);
    expect(container.querySelector('[data-dish-id="har-gow"] svg')).toBeInTheDocument();
    expect(screen.queryByText('🦐')).not.toBeInTheDocument();
  });

  it('falls back to the dish emoji when no SVG is mapped for that id', () => {
    const base = DISHES[0];
    const unmapped = { ...base, id: 'unmapped-x' };
    const { container } = render(<DishIcon dish={unmapped} />);
    expect(screen.getByText(base.emoji)).toBeInTheDocument();
    expect(container.querySelector('[data-dish-id="unmapped-x"] .dish-emoji')).toBeInTheDocument();
    expect(container.querySelector('[data-dish-id="unmapped-x"] svg')).not.toBeInTheDocument();
  });

  it('merges an extra className onto the wrapper', () => {
    const harGow = DISHES.find((d) => d.id === 'har-gow')!;
    const { container } = render(<DishIcon dish={harGow} className="big" />);
    expect(container.querySelector('.dish-icon.big')).toBeInTheDocument();
  });
});
