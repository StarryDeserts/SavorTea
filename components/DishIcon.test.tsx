import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DishIcon } from '@/components/DishIcon';
import { DISHES } from '@/lib/dishes/data';

describe('DishIcon', () => {
  it('falls back to the dish emoji when no SVG is mapped', () => {
    const harGow = DISHES.find((d) => d.id === 'har-gow')!;
    const { container } = render(<DishIcon dish={harGow} />);
    expect(screen.getByText('🦐')).toBeInTheDocument();
    expect(container.querySelector('[data-dish-id="har-gow"]')).toBeInTheDocument();
  });

  it('merges an extra className onto the wrapper', () => {
    const harGow = DISHES.find((d) => d.id === 'har-gow')!;
    const { container } = render(<DishIcon dish={harGow} className="big" />);
    expect(container.querySelector('.dish-icon.big')).toBeInTheDocument();
  });
});
