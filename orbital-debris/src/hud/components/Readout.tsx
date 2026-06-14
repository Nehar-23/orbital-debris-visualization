import { useEffect, useRef, useState } from 'react';

interface ReadoutProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
  className?: string;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export default function Readout({
  value,
  duration = 1200,
  decimals = 0,
  prefix = '',
  suffix = '',
  style,
  className,
}: ReadoutProps) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(0);

  useEffect(() => {
    // Cancel any in-progress animation
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    const from = startValueRef.current;
    const to = value;
    startTimeRef.current = null;

    function tick(now: number) {
      if (startTimeRef.current === null) {
        startTimeRef.current = now;
      }
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(t);
      const current = from + (to - from) * eased;
      setDisplayed(current);
      startValueRef.current = current;

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayed(to);
        startValueRef.current = to;
        rafRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const formatted =
    decimals === 0
      ? Math.round(displayed).toLocaleString('en-US')
      : displayed.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });

  return (
    <span
      className={className}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        color: '#FFFFFF',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
