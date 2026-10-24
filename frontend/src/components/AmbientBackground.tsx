import React, { useEffect, useRef } from 'react';

export const AmbientBackground: React.FC = () => {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      rafId = requestAnimationFrame(() => {
        if (spotlightRef.current) {
          spotlightRef.current.style.setProperty('--cursor-x', `${e.clientX}px`);
          spotlightRef.current.style.setProperty('--cursor-y', `${e.clientY}px`);
        }
      });
    };

    window.addEventListener('pointermove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={spotlightRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-slate-100/70 dark:bg-transparent transition-colors"
    >
      {/* Subtle grid/dot matrix background */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(15,23,42,0.06)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:opacity-35" />

      {/* Dynamic GPU-accelerated cursor spotlight */}
      <div
        className="absolute inset-0 opacity-30 dark:opacity-60 transition-opacity duration-700 ease-out"
        style={{
          background: 'radial-gradient(850px circle at var(--cursor-x, 50vw) var(--cursor-y, 30vh), var(--accent-spotlight, rgba(249, 115, 22, 0.05)), rgba(59, 130, 246, 0.035), transparent 70%)',
        }}
      />
    </div>
  );
};
export default AmbientBackground;
