'use client';

import { motion } from 'motion/react';
import { EnterCta } from '@/components/landing/EnterCta';
import { SealMark } from '@/components/SealMark';

export function LandingHero({ clearedCount, total }: { clearedCount: number; total: number }) {
  return (
    <section className="landing-hero">
      <motion.div
        className="landing-hero-seal"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1.4, 0.4, 1] }}
      >
        <SealMark size={92} />
      </motion.div>
      <motion.h1
        className="landing-hero-title"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.12 }}
      >
        叹茶 · 虛擬茶樓
      </motion.h1>
      <motion.p
        className="landing-hero-slogan"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        一盅兩件,開口就嗌 —— 同點心姨用粵語飲返餐靚茶。
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <EnterCta clearedCount={clearedCount} total={total} />
      </motion.div>
    </section>
  );
}
