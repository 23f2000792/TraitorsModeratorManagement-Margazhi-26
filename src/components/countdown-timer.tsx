'use client';

import { useState, useEffect } from 'react';

type CountdownTimerProps = {
  endTime: number;
};

export const CountdownTimer = ({ endTime }: CountdownTimerProps) => {
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
    <div className="font-mono font-bold text-primary text-5xl">
      <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
      <span className="animate-pulse">:</span>
      <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
    </div>
  );
};
