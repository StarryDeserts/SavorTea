'use client';

import Link from 'next/link';
import { motion } from 'motion/react';

export function EnterCta({ clearedCount, total }: { clearedCount: number; total: number }) {
  const returning = clearedCount > 0;
  const label = returning ? `續攤(已叹 ${clearedCount}/${total})` : '開市';
  return (
    <motion.div
      className="enter-cta"
      data-returning={returning}
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
    >
      <Link href="/play">{label}</Link>
    </motion.div>
  );
}
