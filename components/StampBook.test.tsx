import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StampBook } from '@/components/StampBook';
import { DISHES } from '@/lib/dishes/data';

describe('StampBook', () => {
  it('shows every dish and marks only stamped ones', () => {
    render(<StampBook dishes={DISHES} stampedDishIds={['har-gow']} />);
    for (const d of DISHES) {
      expect(screen.getByText(d.nameYue)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('蝦餃 已蓋章')).toBeInTheDocument();
    expect(screen.getByLabelText('燒賣 未蓋章')).toBeInTheDocument();
  });
});
