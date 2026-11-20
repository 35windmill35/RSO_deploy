import { useEffect, useState } from "react";

// Анимация числа от 0 до значения, как в KPI дашборда ДТП.
// При «уменьшить движение» в системе — сразу итог.

const DURATION_MS = 1300;

const easeOutQuart = (x: number) => 1 - Math.pow(1 - x, 4);

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

interface CountUpState {
  target: number | null;
  progress: number;
}

// Прогресс хранится вместе со значением, к которому относится:
// новое значение всегда начинает анимацию с нуля, без «прыжка» старого кадра
export function useCountUp(target: number | null): number | null {
  const [state, setState] = useState<CountUpState>({ target: null, progress: 1 });
  const skip = target === null || prefersReducedMotion();

  useEffect(() => {
    if (skip) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      setState({ target, progress });
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, skip]);

  if (skip || target === null) return target;
  const progress = state.target === target ? state.progress : 0;
  return target * easeOutQuart(progress);
}
