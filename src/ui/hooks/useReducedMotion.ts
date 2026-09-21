import { useEffect, useState } from 'react';

/**
 * Tracks `prefers-reduced-motion`. Used to freeze camera drift / orbital
 * motion in the scene (`cinematic={false}`) and to skip any decorative
 * transitions in the DOM layer.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window === 'undefined'
      ? false
      : window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
