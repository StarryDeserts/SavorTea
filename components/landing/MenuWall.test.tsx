import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MenuWall } from '@/components/landing/MenuWall';
import { DISHES } from '@/lib/dishes/data';

describe('MenuWall', () => {
  it('renders every dish name', () => {
    render(<MenuWall dishes={DISHES} clearedDishIds={[]} stars={{}} />);
    for (const d of DISHES) {
      expect(screen.getByText(d.nameYue)).toBeInTheDocument();
    }
  });

  it('marks cleared dishes and shows their best star count', () => {
    const { container } = render(
      <MenuWall dishes={DISHES} clearedDishIds={['har-gow']} stars={{ 'har-gow': 2 }} />,
    );
    const harGow = container.querySelector('.menu-dish[data-cleared="true"]');
    expect(harGow).toBeInTheDocument();
    expect(harGow!.querySelectorAll('.star[data-filled="true"]').length).toBe(2);
    expect(harGow!.querySelector('.star[data-filled="false"]')).toBeInTheDocument();
  });

  it('shows 未叹 for every dish not yet cleared', () => {
    render(<MenuWall dishes={DISHES} clearedDishIds={['har-gow']} stars={{ 'har-gow': 2 }} />);
    expect(screen.getAllByText('未叹').length).toBe(DISHES.length - 1);
  });
});
