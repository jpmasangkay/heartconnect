import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
      }}
      exit={{
        opacity: 0,
        y: -6,
        transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      }}
    >
      {children}
    </motion.div>
  );
}
