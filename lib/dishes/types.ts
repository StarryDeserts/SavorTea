export type DishCategory = 'steamed' | 'fried' | 'baked' | 'congee' | 'dessert';

export interface Dish {
  id: string;
  nameYue: string;
  jyutping: string;
  namePutonghua: string;
  nameEn: string;
  category: DishCategory;
  emoji: string;
  culturalNote: string;
  orderPhrase: string;
  orderPhraseJyutping: string;
  corpusUuid?: string;
  task: DishTask;
}

export type OrderSkill =
  | 'name' | 'polite' | 'quantity' | 'modifier'
  | 'alias' | 'price' | 'multi' | 'checkout';

export interface DishTask {
  level: number;        // 1..10, menu order
  skills: OrderSkill[]; // this level's requires
  goal: string;         // 點心姨's goal line (粵文)
  hint: string;         // demo phrase (echoing it must pass this level)
  aliases?: string[];   // for the `alias` skill, e.g. ['蝦腸','蝦腸粉']
  modifiers?: string[]; // for the `modifier` skill, e.g. ['熱','趁熱']
}
