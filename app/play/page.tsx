'use client';

import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { DISHES } from '@/lib/dishes/data';
import { OrderChat } from '@/components/OrderChat';
import { StampBook } from '@/components/StampBook';
import { ShareCardButton } from '@/components/ShareCardButton';
import { SettingsLink } from '@/components/SettingsLink';
import { SealMark } from '@/components/SealMark';

export default function PlayPage() {
  const clearedDishIds = useTeahouseStore((s) => s.clearedDishIds);
  const allCleared = clearedDishIds.length >= DISHES.length;

  return (
    <main className="teahouse">
      <SettingsLink />
      <header className="teahouse-brand">
        <SealMark size={50} className="teahouse-seal" />
        <h1>叹茶 · 虛擬茶樓</h1>
      </header>
      <OrderChat />
      <StampBook dishes={DISHES} stampedDishIds={clearedDishIds} />
      {allCleared && <ShareCardButton />}
    </main>
  );
}
