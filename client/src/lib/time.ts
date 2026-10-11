import { useEffect, useState } from 'react';

// Re-renders once a second so countdowns stay live.
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// "2h 05m" style, always two digits for the smaller unit so the number doesn't jump.
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(Math.abs(ms) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((Math.abs(ms) % 60000) / 1000);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
