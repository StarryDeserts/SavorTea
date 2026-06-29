'use client';

import { motion } from 'motion/react';

const STEPS = [
  { n: 1, icon: '🗣️', title: '開口嗌', desc: '諗住想食乜,直接講(或者打字)俾點心姨聽。' },
  { n: 2, icon: '💬', title: '姨應你', desc: '點心姨用粵語應你,仲會評下你講得幾「地道」(★1–3)。' },
  { n: 3, icon: '🥟', title: '蓋印仔', desc: '嗌啱就蓋個印仔,儲齊十道,得張「今日飲茶」分享卡。' },
] as const;

export function HowToPlay() {
  return (
    <section className="how-to-play">
      {STEPS.map((s, i) => (
        <motion.div
          key={s.n}
          className="how-step"
          data-step={s.n}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
        >
          <span className="how-step-icon" aria-hidden>
            {s.icon}
          </span>
          <h3 className="how-step-title">{s.title}</h3>
          <p className="how-step-desc">{s.desc}</p>
        </motion.div>
      ))}
    </section>
  );
}
