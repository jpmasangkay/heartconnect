import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Returns a live scrollY value updated via requestAnimationFrame.
 * Single scroll listener — cheap to call from many components.
 */
export function useScrollY(): number {
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return scrollY;
}

/**
 * Returns a CSS transform string for a parallax layer.
 * @param speed  0 = pinned (moves opposite page), 1 = scrolls normally, 0.3 = drifts slowly
 */
export function useParallax(speed: number): string {
  const scrollY = useScrollY();
  const translateY = (scrollY * (1 - speed)).toFixed(2);
  return `translateY(${translateY}px)`;
}

/**
 * Sticky parallax — tracks scroll progress through a sticky container.
 * Returns a 0→1 progress value as the user scrolls through the section height.
 * @param sectionRef  ref attached to the outer scroll-height wrapper
 */
export function useStickyProgress(sectionRef: RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const el = sectionRef.current;
        if (!el) return;
        const { top, height } = el.getBoundingClientRect();
        // top goes from 0 → -height as user scrolls through
        const scrolled = Math.min(Math.max(-top / (height - window.innerHeight), 0), 1);
        setProgress(scrolled);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [sectionRef]);

  return progress;
}

/**
 * Lazy-load / in-view hook using IntersectionObserver.
 * Returns [ref, isInView]. Once in view, stays true (one-shot by default).
 */
export function useInView<T extends HTMLElement>(
  options: IntersectionObserverInit = {},
  once = true,
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        if (once) observer.disconnect();
      } else if (!once) {
        setInView(false);
      }
    }, { threshold: 0.15, ...options });
    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  return [ref, inView];
}
