'use client';

import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { DISHES } from '@/lib/dishes/data';
import { OrderChat } from '@/components/OrderChat';
import { StampBook } from '@/components/StampBook';
import { ShareCardButton } from '@/components/ShareCardButton';
import { ShadowingButton } from '@/components/ShadowingButton';
import { DishCard } from '@/components/DishCard';

export default function Page() {
  const stampedDishIds = useTeahouseStore((s) => s.stampedDishIds);
  const setBestScore = useTeahouseStore((s) => s.setBestScore);
  const addStamp = useTeahouseStore((s) => s.addStamp);

  return (
    <main className="teahouse">
      <h1>叹茶 · 虛擬茶樓</h1>
      <OrderChat />
      <section className="shadowing-practice">
        <h2>跟讀練習</h2>
        {DISHES.map((d) => (
          <div key={d.id} className="practice-row">
            <DishCard dish={d} />
            <ShadowingButton
              targetPhrase={d.orderPhrase}
              onResult={(score) => {
                setBestScore(score);
                if (score >= 70) addStamp(d.id);
              }}
            />
          </div>
        ))}
      </section>
      <StampBook dishes={DISHES} stampedDishIds={stampedDishIds} />
      <ShareCardButton />
    </main>
  );
}
