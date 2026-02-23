'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAntiCheatOptions {
  maxViolations: number;
  enabled: boolean;
  onMaxViolations?: () => void;
  onViolation?: (count: number) => void;
}

export function useAntiCheat(options: UseAntiCheatOptions) {
  const { maxViolations, enabled, onMaxViolations, onViolation } = options;

  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);

  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacksRef = useRef({ onMaxViolations, onViolation });

  useEffect(() => {
    callbacksRef.current = { onMaxViolations, onViolation };
  }, [onMaxViolations, onViolation]);

  // Fire callbacks AFTER state has settled (avoids setState-during-render)
  const prevViolationsRef = useRef(0);
  useEffect(() => {
    if (violations > prevViolationsRef.current) {
      callbacksRef.current.onViolation?.(violations);
      if (violations >= maxViolations) {
        setIsTerminated(true);
        callbacksRef.current.onMaxViolations?.();
      } else {
        setShowWarning(true);
      }
    }
    prevViolationsRef.current = violations;
  }, [violations, maxViolations]);

  const handleViolation = useCallback(() => {
    setViolations((prev) => prev + 1);
  }, []);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  useEffect(() => {
    if (!enabled || isTerminated) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    // blur/focus handlers only for edge cases where visibilitychange
    // doesn't fire (e.g., OS-level alt-tab with some browsers).
    // The blur handler guards against double-counting by skipping
    // if the tab is already hidden (visibilitychange already handled it).
    const handleBlur = () => {
      blurTimeoutRef.current = setTimeout(() => {
        // Only count if visibilitychange didn't already fire
        if (!document.hidden) {
          handleViolation();
        }
      }, 300);
    };

    const handleFocus = () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, [enabled, isTerminated, handleViolation]);

  return {
    violations,
    showWarning,
    isTerminated,
    remainingViolations: Math.max(0, maxViolations - violations),
    dismissWarning,
  };
}
