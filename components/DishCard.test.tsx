import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DishCard } from '@/components/DishCard';
import { DISHES } from '@/lib/dishes/data';

describe('DishCard', () => {
  it('renders the dish 粤文 name, jyutping and cultural note', () => {
    const dish = DISHES[0];
    render(<DishCard dish={dish} />);
    expect(screen.getByText(dish.nameYue)).toBeInTheDocument();
    expect(screen.getByText(dish.jyutping)).toBeInTheDocument();
    expect(screen.getByText(dish.culturalNote)).toBeInTheDocument();
  });
});
