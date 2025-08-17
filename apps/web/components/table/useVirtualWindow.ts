import { useEffect, useMemo, useRef, useState } from 'react';

export function useVirtualWindow(total: number, rowHeight = 40) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    const onResize = () => setHeight(el.clientHeight || 600);
    onResize();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); };
  }, []);

  const { start, end, offset } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 5);
    const visible = Math.ceil(height / rowHeight) + 10;
    const end = Math.min(total, start + visible);
    const offset = start * rowHeight;
    return { start, end, offset };
  }, [scrollTop, height, total, rowHeight]);

  return { containerRef, start, end, offset, totalHeight: total * rowHeight };
}


