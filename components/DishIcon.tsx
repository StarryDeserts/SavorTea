import type { ReactNode } from 'react';
import type { Dish } from '@/lib/dishes/types';

// Phase 2: open-design 往这里按 dish.id 填 <svg>;在此之前每道都回退 emoji。
const DISH_SVGS: Record<string, ReactNode> = {};

export function DishIcon({ dish, className }: { dish: Dish; className?: string }) {
  const svg = DISH_SVGS[dish.id];
  return (
    <span className={`dish-icon${className ? ` ${className}` : ''}`} data-dish-id={dish.id}>
      {svg ?? (
        <span className="dish-emoji" aria-hidden>
          {dish.emoji}
        </span>
      )}
    </span>
  );
}
