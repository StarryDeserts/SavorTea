'use client';

import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { DISHES } from '@/lib/dishes/data';
import { LandingHero } from '@/components/landing/LandingHero';
import { HowToPlay } from '@/components/landing/HowToPlay';
import { MenuWall } from '@/components/landing/MenuWall';
import { CulturalIntro } from '@/components/landing/CulturalIntro';
import { EnterCta } from '@/components/landing/EnterCta';
import { SettingsLink } from '@/components/SettingsLink';

export default function LandingPage() {
  const clearedDishIds = useTeahouseStore((s) => s.clearedDishIds);
  const stars = useTeahouseStore((s) => s.stars);
  const total = DISHES.length;
  const clearedCount = clearedDishIds.length;

  return (
    <main className="landing">
      <SettingsLink />
      <LandingHero clearedCount={clearedCount} total={total} />
      <HowToPlay />
      <MenuWall dishes={DISHES} clearedDishIds={clearedDishIds} stars={stars} />
      <CulturalIntro />
      <EnterCta clearedCount={clearedCount} total={total} />
    </main>
  );
}
