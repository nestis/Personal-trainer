import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Session, SessionStatus } from '../types';
import { api } from '../services/api';
import { toDateString } from '../utils/format';

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function firstOfMonth(d: Date): string {
  return `${monthKey(d)}-01`;
}

function lastOfMonth(d: Date): string {
  return toDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/**
 * Loads sessions one month at a time and caches each month, so the week strip,
 * the month calendar and the lists below all read from the same data.
 * The first load fetches the previous and the current month in one query.
 */
export function useSessionCalendar() {
  const today = useRef(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(
    () => new Date(today.current.getFullYear(), today.current.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, Session[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const [reloadKey, setReloadKey] = useState(0);

  // First load: previous + current month
  useEffect(() => {
    const now = today.current;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listSessions(firstOfMonth(prev), lastOfMonth(now))
      .then((items) => {
        if (cancelled) return;
        const buckets: Record<string, Session[]> = { [monthKey(prev)]: [], [monthKey(now)]: [] };
        for (const s of items) {
          const key = s.date.substring(0, 7);
          if (buckets[key]) buckets[key].push(s);
        }
        setCache(buckets);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load sessions');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Any other month is fetched on demand (once)
  const pending = useRef(new Set<string>());
  const ensureMonth = useCallback((d: Date) => {
    const key = monthKey(d);
    if (cacheRef.current[key] || pending.current.has(key)) return;
    pending.current.add(key);
    setLoading(true);
    api
      .listSessions(firstOfMonth(d), lastOfMonth(d))
      .then((items) => setCache((c) => ({ ...c, [key]: items })))
      .catch((err) => setError(err.message || 'Failed to load sessions'))
      .finally(() => {
        pending.current.delete(key);
        setLoading(pending.current.size > 0);
      });
  }, []);

  useEffect(() => {
    if (!loading && !error) ensureMonth(currentMonth);
  }, [currentMonth, loading, error, ensureMonth]);

  const changeMonth = useCallback((d: Date) => {
    setError(null);
    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }, []);

  const retry = useCallback(() => {
    setCache({});
    setReloadKey((k) => k + 1);
  }, []);

  // Every session loaded so far, newest first
  const allSessions = useMemo(
    () =>
      Object.values(cache)
        .flat()
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [cache]
  );

  const sessionDates = useMemo(() => {
    const map: Record<string, SessionStatus> = {};
    for (const s of allSessions) {
      const existing = map[s.date];
      if (!existing || s.status === 'completed') {
        map[s.date] = s.status;
      }
    }
    return map;
  }, [allSessions]);

  return {
    currentMonth,
    setCurrentMonth: changeMonth,
    ensureMonth,
    selectedDate,
    setSelectedDate,
    allSessions,
    sessionDates,
    loading,
    error,
    retry,
  };
}
