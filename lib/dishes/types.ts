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
}
