'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseInterviewTimerOptions {
  timeLimit: number; // seconds
  warningThreshold?: number; // seconds remaining to show warning
  dangerThreshold?: number; // seconds remaining to show danger
  onExpired?: () => void;
}

type TimerState = 'idle' | 'running' | 'warning' | 'danger' | 'expired';

export function useInterviewTimer(options: UseInterviewTimerOptions) {
  const {
    timeLimit,
    warningThreshold = 30,
    dangerThreshold = 10,
    onExpired,
  } = options;

  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpiredRef = useRef(onExpired);

  // Keep callback ref fresh
  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setTimeRemaining(timeLimit);
    setTimerState('running');

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;

        if (next <= 0) {
          clearTimer();
          setTimerState('expired');
          onExpiredRef.current?.();
          return 0;
        }

        if (next <= dangerThreshold) {
          setTimerState('danger');
        } else if (next <= warningThreshold) {
          setTimerState('warning');
        }

        return next;
      });
    }, 1000);
  }, [timeLimit, warningThreshold, dangerThreshold, clearTimer]);

  const resetTimer = useCallback(() => {
    clearTimer();
    setTimeRemaining(timeLimit);
    setTimerState('idle');
  }, [timeLimit, clearTimer]);

  const pauseTimer = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const formattedTime = `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`;

  const progress = timeLimit > 0 ? (timeRemaining / timeLimit) * 100 : 0;

  // Cleanup
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    timeRemaining,
    timerState,
    formattedTime,
    progress,
    isExpired: timerState === 'expired',
    startTimer,
    resetTimer,
    pauseTimer,
  };
}
