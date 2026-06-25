import type { Dish } from '@/lib/dishes/types';

export function DishCard({ dish }: { dish: Dish }) {
  return (
    <article className="dish-card" data-dish-id={dish.id}>
      <div className="dish-emoji" aria-hidden>
        {dish.emoji}
      </div>
      <h3 className="dish-name-yue">{dish.nameYue}</h3>
      <p className="dish-jyutping">{dish.jyutping}</p>
      <p className="dish-name-alt">
        {dish.namePutonghua} · {dish.nameEn}
      </p>
      <p className="dish-note">{dish.culturalNote}</p>
    </article>
  );
}
