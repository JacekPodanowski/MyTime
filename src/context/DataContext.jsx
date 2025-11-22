import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const DataContext = createContext(null);

const COLOR_PALETTE = [
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#f97316',
  '#14b8a6',
  '#f59e0b',
  '#ef4444',
  '#6366f1',
  '#f43f5e'
];

function pickColor(existingCount) {
  return COLOR_PALETTE[existingCount % COLOR_PALETTE.length];
}

export function DataProvider({ children }) {
  const [activityTypes, setActivityTypes] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [analysisData, setAnalysisData] = useState([]);
  const [datesWithData, setDatesWithData] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const normalizeLogs = (logs) => {
    return (logs || []).map((log) => {
      const name = log.name || log.activityTypeName || '';
      const isWakeup = name.toLowerCase() === 'obudzenie';
      const time = log.start_time?.slice(11, 16) || log.time || '';
      return {
        ...log,
        name,
        isWakeup,
        time,
      };
    });
  };

  const toMinutes = (timeString) => {
    if (!timeString) {
      return null;
    }
    const [hours, minutes] = timeString.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return null;
    }
    return hours * 60 + minutes;
  };

  const groupLogsByDate = (logs) => {
    const grouped = (logs || []).reduce((acc, log) => {
      if (!log.date) {
        return acc;
      }
      if (!acc[log.date]) {
        acc[log.date] = [];
      }
      acc[log.date].push({ ...log });
      return acc;
    }, {});

    const result = {};

    Object.keys(grouped).forEach((dateKey) => {
      const entries = grouped[dateKey].map((entry) => ({ ...entry }));
      entries.sort((a, b) => a.start_time.localeCompare(b.start_time));

      const wakeEntry = entries.find((entry) => entry.isWakeup);
      const wakeMinutes = wakeEntry ? toMinutes(wakeEntry.time) : null;
      const dayStart = wakeMinutes ?? 0;

      entries.forEach((entry) => {
        const minutes = toMinutes(entry.time);
        let absolute = minutes;

        if (entry.isWakeup) {
          absolute = wakeMinutes ?? minutes;
        } else if (minutes !== null && wakeMinutes !== null) {
          absolute = minutes < wakeMinutes ? minutes + 1440 : minutes;
        }

        entry.minutes = minutes;
        entry.absoluteMinutes = absolute;
      });

      entries.sort((a, b) => {
        const aVal = Number.isFinite(a.absoluteMinutes) ? a.absoluteMinutes : Number.POSITIVE_INFINITY;
        const bVal = Number.isFinite(b.absoluteMinutes) ? b.absoluteMinutes : Number.POSITIVE_INFINITY;
        return aVal - bVal;
      });

      let dayEnd = 1440;
      if (wakeMinutes !== null) {
        dayEnd = Math.max(dayEnd, wakeMinutes + 1);
      }
      entries.forEach((entry) => {
        if (!entry.isWakeup && Number.isFinite(entry.absoluteMinutes)) {
          if (entry.absoluteMinutes >= 1440) {
            dayEnd = Math.max(dayEnd, entry.absoluteMinutes + 60);
          } else {
            dayEnd = Math.max(dayEnd, entry.absoluteMinutes + 1);
          }
        }
      });

      for (let i = 0; i < entries.length; i += 1) {
        const current = entries[i];
        if (current.isWakeup || !Number.isFinite(current.absoluteMinutes)) {
          current.durationMinutes = current.isWakeup ? 0 : null;
          continue;
        }

        const next = entries.slice(i + 1).find((entry) => !entry.isWakeup && Number.isFinite(entry.absoluteMinutes));
        let nextAbsolute = next?.absoluteMinutes ?? dayEnd;

        if (nextAbsolute <= current.absoluteMinutes) {
          nextAbsolute = current.absoluteMinutes + 1;
        }

        current.durationMinutes = nextAbsolute - current.absoluteMinutes;
      }

      result[dateKey] = {
        entries,
        dayStartMinutes: dayStart,
        dayEndMinutes: Math.max(dayEnd, dayStart + 1)
      };
    });

    return result;
  };

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/initial-data');
      if (!response.ok) {
        throw new Error('Nie udało się pobrać danych początkowych');
      }
      const data = await response.json();
      const normalizedLogs = normalizeLogs(data.timeLogs || []);
      setActivityTypes((data.activityTypes || []).sort((a, b) => a.name.localeCompare(b.name, 'pl')));
      setTimeLogs(normalizedLogs);
      const cleanedAnalysis = (data.analysis || []).filter(
        (item) => item.name?.toLowerCase() !== 'obudzenie'
      );
      setAnalysisData(cleanedAnalysis);
      setDatesWithData(new Set(data.datesWithData || []));
    } catch (err) {
      console.error('Błąd podczas ładowania danych początkowych:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const timeLogsByDate = useMemo(() => groupLogsByDate(timeLogs), [timeLogs]);

  const ensureActivityTypeExists = async (name, opts = {}) => {
    if (!name) return null;
    const normalizedName = name.trim();
    const existing = activityTypes.find(
      (type) => type.name.toLowerCase() === normalizedName.toLowerCase()
    );
    if (existing) {
      return existing;
    }

    const payload = {
      name: normalizedName,
      color: opts.color || pickColor(activityTypes.length),
      description: opts.description || ''
    };

    const response = await fetch('/api/activity-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Nie udało się utworzyć aktywności');
    }

    const type = await response.json();
    setActivityTypes((prev) =>
      [...prev.filter((t) => t.id !== type.id), type].sort((a, b) => a.name.localeCompare(b.name, 'pl'))
    );
    return type;
  };

  const saveTimeLogsForDate = async (date, entries) => {
    if (!date) return;
    const preparedEntries = (entries || [])
      .filter((entry) => entry.time && entry.type)
      .map((entry) => ({
        activityType: entry.type.trim(),
        startTime: `${date}T${entry.time}:00`,
        time: entry.time,
        isWakeup: !!entry.isWakeup
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    if (preparedEntries.length === 0) {
      // Usuń wpisy jeśli brak aktywności
      await fetch(`/api/time-logs/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: [] })
      });
      await refreshData();
      return;
    }

    // Upewnij się, że wszystkie typy istnieją zanim zapiszemy
    const uniqueTypes = [...new Set(preparedEntries.map((entry) => entry.activityType))];
    for (const typeName of uniqueTypes) {
      await ensureActivityTypeExists(typeName);
    }

    const toMinutes = (timeString) => {
      if (!timeString) {
        return null;
      }
      const [hours, minutes] = timeString.split(':').map(Number);
      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return null;
      }
      return hours * 60 + minutes;
    };

    const wakeEntry = preparedEntries.find((entry) => entry.isWakeup);
    const wakeMinutes = wakeEntry ? toMinutes(wakeEntry.time) : null;

    const computeAbsoluteMinutes = (entry) => {
      const minutes = toMinutes(entry.time);
      if (!Number.isFinite(minutes)) {
        return Number.POSITIVE_INFINITY;
      }
      if (entry.isWakeup || wakeMinutes === null) {
        return minutes;
      }
      return minutes < wakeMinutes ? minutes + 1440 : minutes;
    };

    const orderedEntries = [...preparedEntries].sort(
      (a, b) => computeAbsoluteMinutes(a) - computeAbsoluteMinutes(b)
    );

    let previousAbsolute = null;
    for (const entry of orderedEntries) {
      const absoluteMinutes = computeAbsoluteMinutes(entry);
      if (!Number.isFinite(absoluteMinutes)) {
        continue;
      }

      if (entry.isWakeup) {
        previousAbsolute = absoluteMinutes;
        continue;
      }

      if (previousAbsolute !== null && absoluteMinutes - previousAbsolute < 1) {
        throw new Error('Minimalna długość aktywności to 1 minuta. Sprawdź godziny rozpoczęcia.');
      }

      previousAbsolute = absoluteMinutes;
    }

    const response = await fetch(`/api/time-logs/${date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entries: orderedEntries.map(({ activityType, startTime, isWakeup }) => ({
          activityType,
          startTime,
          isWakeup
        }))
      })
    });

    if (!response.ok) {
      throw new Error('Nie udało się zapisać aktywności');
    }

    await refreshData();
  };

  const value = {
    activityTypes,
    timeLogs,
    timeLogsByDate,
    analysisData,
    datesWithData,
    loading,
    error,
    refreshData,
    ensureActivityTypeExists,
    saveTimeLogsForDate
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData musi być użyte wewnątrz DataProvider');
  }
  return context;
}
