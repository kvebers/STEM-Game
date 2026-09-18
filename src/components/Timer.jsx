import { useEffect, useState } from 'react';

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Countdown from `startedAt` (ms epoch) + `limitSeconds`. Purely a display —
 * the actual match time limit is enforced server-side in
 * fn_apply_match_result (see plan/migration notes), this just shows it.
 */
export function Timer({ startedAt, limitSeconds }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!startedAt) return null;

  const remainingMs = startedAt + limitSeconds * 1000 - now;
  const isLow = remainingMs <= 30_000;

  return <div className={`match-timer ${isLow ? 'match-timer-low' : ''}`}>⏱ {formatRemaining(remainingMs)}</div>;
}
