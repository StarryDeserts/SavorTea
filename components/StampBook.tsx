import type { Dish } from '@/lib/dishes/types';

export function StampBook({
  dishes,
  stampedDishIds,
}: {
  dishes: Dish[];
  stampedDishIds: string[];
}) {
  const stamped = new Set(stampedDishIds);
  return (
    <ul className="stamp-book">
      {dishes.map((d) => {
        const got = stamped.has(d.id);
        return (
          <li
            key={d.id}
            className="stamp"
            data-stamped={got}
            aria-label={`${d.nameYue}${got ? ' 已蓋章' : ' 未蓋章'}`}
          >
            <span className="stamp-emoji" aria-hidden>
              {got ? d.emoji : '⚪'}
            </span>
            <span className="stamp-name">{d.nameYue}</span>
          </li>
        );
      })}
    </ul>
  );
}
