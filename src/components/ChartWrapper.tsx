/**
 * ChartWrapper.tsx — Wrapper pour éviter le bug -1x-1
 * Wrap tous tes graphiques avec ce composant
 */
import React, { useRef, useState, useEffect } from 'react';
import { ResponsiveContainer } from 'recharts';

interface Props {
  children: React.ReactNode;
  height?: number | string;
  minHeight?: number;
  style?: React.CSSProperties;
}

export default function ChartWrapper({ children, height = 300, minHeight = 200, style }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Attendre que le conteneur ait des dimensions valides
    const check = () => {
      if (containerRef.current) {
        const { width, height: h } = containerRef.current.getBoundingClientRect();
        if (width > 0 && h >= 0) setReady(true);
      }
    };
    check();
    const timer = setTimeout(check, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height, minHeight, position: 'relative', ...style }}
    >
      {ready && (
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      )}
    </div>
  );
}
