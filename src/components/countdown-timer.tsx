'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type CountdownTimerProps = {
  endTime: number;
  className?: string;
};

export const CountdownTimer = ({ endTime, className }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = endTime - Date.now();
      if (difference > 0) {
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        return { minutes, seconds };
      }
      return { minutes: 0, seconds: 0 };
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className={cn("font-mono font-bold text-primary text-8xl md:text-9xl tracking-widest", className)}>
      <span className="bg-black/50 px-4 py-2 rounded-lg tabular-nums">{String(timeLeft.minutes).padStart(2, '0')}</span>
      <span className="animate-pulse mx-2">:</span>
      <span className="bg-black/50 px-4 py-2 rounded-lg tabular-nums">{String(timeLeft.seconds).padStart(2, '0')}</span>
    </div>
  );
};
