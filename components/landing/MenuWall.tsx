'use client';

import { motion } from 'motion/react';
import type { Dish } from '@/lib/dishes/types';
import { DishIcon } from '@/components/DishIcon';

export function MenuWall({
  dishes,
  clearedDishIds,
  stars,
}: {
  dishes: Dish[];
  clearedDishIds: string[];
  stars: Record<string, number>;
}) {
  const cleared = new Set(clearedDishIds);
  return (
    <ul className="menu-wall">
      {dishes.map((dish, i) => {
        const got = cleared.has(dish.id);
        const filled = stars[dish.id] ?? 0;
        return (
          <motion.li
            key={dish.id}
            className="menu-dish"
            data-cleared={got}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <DishIcon dish={dish} className="menu-dish-icon" />
            <span className="menu-dish-name">{dish.nameYue}</span>
            <span className="menu-dish-status">
              {got ? (
                <span className="stars" role="img" aria-label={`${dish.nameYue} 叹咗 ${filled} 粒星`}>
                  {[1, 2, 3].map((n) => (
                    <span key={n} className="star" data-filled={n <= filled} aria-hidden>
                      ★
                    </span>
                  ))}
                </span>
              ) : (
                <span className="menu-dish-todo">未叹</span>
              )}
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}
