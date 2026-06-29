'use client';

import { motion } from 'motion/react';

export function CulturalIntro() {
  return (
    <motion.section
      className="cultural-intro"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7 }}
    >
      <p className="cultural-intro-body">
        飲茶唔淨係食點心。一盅兩件、揭盅斟茶、講聲「唔該」—— 茶樓裡頭每個細節,都係廣府人嘅生活味道。入嚟坐低,慢慢嘆。
      </p>
    </motion.section>
  );
}
