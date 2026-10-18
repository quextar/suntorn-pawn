'use client';

import type { ReactNode } from 'react';
import { motion } from 'motion/react';

// ค่อยๆ เลื่อนขึ้นและจางเข้าตอนเปิดหน้า
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
