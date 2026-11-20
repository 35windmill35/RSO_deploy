import { useEffect, useRef, useState } from "react";

// Элемент хотя бы раз попал в видимую область — для ленивой загрузки блока.
// Без IntersectionObserver (старые браузеры, тесты) считается видимым сразу.
export function useInViewport<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const element = ref.current;
    if (seen || !element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [seen]);

  return { ref, seen };
}
