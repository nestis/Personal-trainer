import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Session, SessionStatus } from '../types';
import { api } from '../services/api';
import { toDateString } from '../utils/format';

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function firstOfMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function lastOfMonth(d: Date): string {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return toDateString(last);
}

export function useSessionCalendar() {
  const today = useRef(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(
    () => new Date(today.current.getFullYear(), today.current.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Record<string, Session[]>>({});
  const initialFetchDone = useRef(false);

  // Partition sessions into cache buckets by month
  const partitionIntoCache = useCallback((items: Session[]) => {
    const buckets: Record<string, Session[]> = {};
    for (const s of items) {
      const key = s.date.substring(0, 7);
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(s);
    }
    for (const [key, value] of Object.entries(buckets)) {
      cacheRef.current[key] = value;
    }
  }, []);

  // Initial load: last 3 weeks through end of current month
  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;

    const threeWeeksAgo = new Date(today.current);
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    const startDate = toDateString(threeWeeksAgo);
    const endDate = lastOfMonth(today.current);

    setLoading(true);
    setError(null);
    api
      .listSessions(startDate, endDate)
      .then((items) => {
        partitionIntoCache(items);
        const key = monthKey(currentMonth);
        setSessions(cacheRef.current[key] || []);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load sessions');
      })
      .finally(() => setLoading(false));
  }, [currentMonth, partitionIntoCache]);

  // Fetch when month changes (cache-first)
  useEffect(() => {
    const key = monthKey(currentMonth);
    if (cacheRef.current[key]) {
      setSessions(cacheRef.current[key]);
      return;
    }

    // Don't fetch if initial load hasn't completed
    if (!initialFetchDone.current) return;

    const start = firstOfMonth(currentMonth);
    const end = lastOfMonth(currentMonth);

    setLoading(true);
    setError(null);
    api
      .listSessions(start, end)
      .then((items) => {
        cacheRef.current[key] = items;
        setSessions(items);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load sessions');
      })
      .finally(() => setLoading(false));
  }, [currentMonth]);

  const retry = useCallback(() => {
    const key = monthKey(currentMonth);
    delete cacheRef.current[key];
    // Force re-fetch by toggling month
    setCurrentMonth(new Date(currentMonth));
  }, [currentMonth]);

  // Derive session dates map for calendar dots
  const sessionDates = useMemo(() => {
    const map: Record<string, SessionStatus> = {};
    for (const s of sessions) {
      const existing = map[s.date];
      if (!existing || s.status === 'completed') {
        map[s.date] = s.status;
      }
    }
    return map;
  }, [sessions]);

  // Filter displayed sessions
  const displaySessions = useMemo(() => {
    if (selectedDate) {
      return sessions.filter((s) => s.date === selectedDate);
    }
    return sessions;
  }, [sessions, selectedDate]);

  return {
    currentMonth,
    setCurrentMonth,
    selectedDate,
    setSelectedDate,
    displaySessions,
    sessionDates,
    loading,
    error,
    retry,
  };
}
