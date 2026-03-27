import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

const ease = [0.22, 1, 0.36, 1] as const;

type FadePresenceProps = {
  /** Distinct key per visual state so exit/enter crossfade runs (e.g. `loading`, `empty`, `list`). */
  activeKey: string;
  children: ReactNode;
  className?: string;
  /** Opacity transition length in seconds (enter + exit use the same duration). */
  duration?: number;
};

/**
 * Cross-fades between loading / empty / content (or any states) using `activeKey`.
 * Use `mode="wait"` so the outgoing view fades out before the next fades in.
 */
export function FadePresence({
  activeKey,
  children,
  className,
  duration = 0.28,
}: FadePresenceProps) {
  const reduceMotion = useReducedMotion();
  const d = reduceMotion ? 0.01 : duration;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeKey}
        className={cn(className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: d, ease }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
