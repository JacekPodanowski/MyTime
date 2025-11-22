// Prosty storage używający localStorage do przechowywania danych

const STORAGE_KEYS = {
  ACTIVITY_TYPES: 'mytime_activity_types',
  TIME_LOGS: 'mytime_time_logs'
};

// Inicjalizacja z domyślnymi danymi
function initStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.ACTIVITY_TYPES)) {
    const defaultTypes = [
      { id: 1, name: 'Praca', color: '#3b82f6', description: 'Czas spędzony na pracy' },
      { id: 2, name: 'Sport', color: '#10b981', description: 'Aktywność fizyczna' },
      { id: 3, name: 'Nauka', color: '#8b5cf6', description: 'Nauka i rozwój' },
      { id: 4, name: 'Odpoczynek', color: '#f59e0b', description: 'Relaks i regeneracja' },
      { id: 5, name: 'Obudzenie', color: '#ef4444', description: 'Start dnia' }
    ];
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_TYPES, JSON.stringify(defaultTypes));
  }
  
  if (!localStorage.getItem(STORAGE_KEYS.TIME_LOGS)) {
    localStorage.setItem(STORAGE_KEYS.TIME_LOGS, JSON.stringify([]));
  }
}

// Typy aktywności
export function getAllActivityTypes() {
  initStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY_TYPES) || '[]');
}

export function createActivityType(name, color, description = '') {
  const types = getAllActivityTypes();
  const newType = {
    id: types.length > 0 ? Math.max(...types.map(t => t.id)) + 1 : 1,
    name,
    color,
    description
  };
  types.push(newType);
  localStorage.setItem(STORAGE_KEYS.ACTIVITY_TYPES, JSON.stringify(types));
  return newType;
}

// Logi czasowe
export function getAllTimeLogs() {
  initStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.TIME_LOGS) || '[]');
}

export function createTimeLog(activityTypeName, startTime, date) {
  const logs = getAllTimeLogs();
  const types = getAllActivityTypes();
  const activityType = types.find(t => t.name === activityTypeName);
  
  if (!activityType) {
    throw new Error(`Nieznany typ aktywności: ${activityTypeName}`);
  }
  
  const newLog = {
    id: logs.length > 0 ? Math.max(...logs.map(l => l.id)) + 1 : 1,
    activityTypeId: activityType.id,
    activityTypeName: activityType.name,
    color: activityType.color,
    startTime,
    date
  };
  
  logs.push(newLog);
  localStorage.setItem(STORAGE_KEYS.TIME_LOGS, JSON.stringify(logs));
  return newLog;
}

export function getTimeLogsByDate(date) {
  const logs = getAllTimeLogs()
    .filter(log => log.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  
  // Dodaj duration dla każdego logu
  return logs.map((log, index, array) => {
    const nextLog = array[index + 1];
    const duration = nextLog 
      ? new Date(nextLog.startTime) - new Date(log.startTime)
      : null;
    
    return { ...log, duration };
  });
}

export function hasDataForDate(date) {
  const logs = getAllTimeLogs();
  return logs.some(log => log.date === date);
}

export function getAllDatesWithData() {
  const logs = getAllTimeLogs();
  const dates = new Set(logs.map(log => log.date));
  return Array.from(dates).sort();
}

export function getTotalTimeByActivityType() {
  const logs = getAllTimeLogs().sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  const totals = {};
  
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const nextLog = logs.find((l, idx) => idx > i && l.date === log.date);
    
    if (nextLog) {
      const duration = new Date(nextLog.startTime) - new Date(log.startTime);
      if (!totals[log.activityTypeName]) {
        totals[log.activityTypeName] = { 
          name: log.activityTypeName, 
          color: log.color, 
          value: 0 
        };
      }
      totals[log.activityTypeName].value += duration;
    }
  }

  return Object.values(totals).map(item => ({
    ...item,
    value: Math.round(item.value / (1000 * 60 * 60) * 10) / 10 // Godziny z jednym miejscem
  }));
}

// Inicjalizacja przy pierwszym imporcie
initStorage();
