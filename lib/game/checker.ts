import type { Dish, OrderSkill } from '@/lib/dishes/types';
import { DISHES } from '@/lib/dishes/data';
import { normalizeForCompare } from '@/lib/shadowing/normalize';
import { containsAny, hasPolite, hasQuantity, hasPrice, hasCheckout } from './vocab';

// `normalizedText` MUST already be normalized.
export function hitsDishName(normalizedText: string, dish: Dish): boolean {
  const names = [dish.nameYue, dish.namePutonghua, ...(dish.task.aliases ?? [])];
  return containsAny(normalizedText, names);
}

export function countDistinctDishNames(normalizedText: string, dishes: Dish[]): number {
  return dishes.filter((d) => hitsDishName(normalizedText, d)).length;
}

function checkSkill(skill: OrderSkill, t: string, dish: Dish): boolean {
  switch (skill) {
    case 'name':
    case 'alias':
      return hitsDishName(t, dish);
    case 'polite':
      return hasPolite(t);
    case 'quantity':
      return hasQuantity(t);
    case 'modifier':
      return containsAny(t, dish.task.modifiers ?? []);
    case 'price':
      return hasPrice(t);
    case 'checkout':
      return hasCheckout(t);
    case 'multi':
      return countDistinctDishNames(t, DISHES) >= 2;
  }
}

export function checkOrder(
  transcript: string,
  dish: Dish,
): { pass: boolean; hit: Record<OrderSkill, boolean> } {
  const t = normalizeForCompare(transcript);
  const hit = {
    name: false, polite: false, quantity: false, modifier: false,
    alias: false, price: false, multi: false, checkout: false,
  } as Record<OrderSkill, boolean>;
  for (const skill of dish.task.skills) hit[skill] = checkSkill(skill, t, dish);
  const pass = dish.task.skills.every((s) => hit[s]);
  return { pass, hit };
}
