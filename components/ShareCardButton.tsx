'use client';

import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { DISHES } from '@/lib/dishes/data';
import { buildShareCardData, generateShareCardBlob } from '@/lib/share/shareCard';

export function ShareCardButton() {
  const clearedDishIds = useTeahouseStore((s) => s.clearedDishIds);
  const stars = useTeahouseStore((s) => s.stars);

  async function download() {
    const data = buildShareCardData({ dishes: DISHES, clearedDishIds, stars });
    const blob = await generateShareCardBlob(data);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `今日飲茶-${data.date}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className="share-card-button" onClick={download}>
      生成「今日飲茶」分享卡
    </button>
  );
}
