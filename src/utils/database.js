import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.join(dbDir, 'mytime.db'));

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS time_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_type_id INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (activity_type_id) REFERENCES activity_types(id)
    );

    CREATE INDEX IF NOT EXISTS idx_date ON time_logs(date);
  `);

  // Dodaj przykładowe aktywności jeśli baza pusta
  const count = db.prepare('SELECT COUNT(*) as count FROM activity_types').get();
  if (count.count === 0) {
    const insert = db.prepare('INSERT INTO activity_types (name, color, description) VALUES (?, ?, ?)');
    insert.run('Praca', '#3b82f6', 'Czas spędzony na pracy');
    insert.run('Sport', '#10b981', 'Aktywność fizyczna');
    insert.run('Nauka', '#8b5cf6', 'Nauka i rozwój');
    insert.run('Odpoczynek', '#f59e0b', 'Relaks i regeneracja');
    insert.run('Obudzenie', '#ef4444', 'Początek dnia');
  }
}

export function getAllActivityTypes() {
  return db.prepare('SELECT * FROM activity_types ORDER BY name').all();
}

export function getActivityTypeById(id) {
  return db.prepare('SELECT * FROM activity_types WHERE id = ?').get(id);
}

export function getActivityTypeByName(name) {
  return db.prepare('SELECT * FROM activity_types WHERE LOWER(name) = LOWER(?)').get(name);
}

export function createActivityType(name, color, description = '') {
  const stmt = db.prepare('INSERT INTO activity_types (name, color, description) VALUES (?, ?, ?)');
  const result = stmt.run(name, color, description);
  return getActivityTypeById(result.lastInsertRowid);
}

export function ensureActivityType(name, color = '#3b82f6', description = '') {
  const existing = getActivityTypeByName(name);
  if (existing) {
    return existing;
  }
  try {
    return createActivityType(name, color, description);
  } catch (error) {
    // Jeśli równoległe wywołanie dodało już typ, pobierz go ponownie
    return getActivityTypeByName(name);
  }
}

export function createTimeLog(activityTypeId, startTime, date) {
  const stmt = db.prepare('INSERT INTO time_logs (activity_type_id, start_time, date) VALUES (?, ?, ?)');
  const result = stmt.run(activityTypeId, startTime, date);
  return {
    id: result.lastInsertRowid,
    activity_type_id: activityTypeId,
    start_time: startTime,
    date
  };
}

export function getTimeLogsByDate(date) {
  const logs = db.prepare(`
    SELECT tl.*, at.name, at.color, at.description,
           CASE WHEN LOWER(at.name) = 'obudzenie' THEN 1 ELSE 0 END AS is_wakeup
    FROM time_logs tl
    JOIN activity_types at ON tl.activity_type_id = at.id
    WHERE tl.date = ?
    ORDER BY tl.start_time
  `).all(date);

  return logs.map((log, index, array) => {
    const nextLog = array
      .slice(index + 1)
      .find((candidate) => candidate.date === log.date && candidate.is_wakeup !== 1);
    const duration = nextLog 
      ? new Date(nextLog.start_time) - new Date(log.start_time)
      : null;
    
    return { ...log, duration };
  });
}

export function hasDataForDate(date) {
  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM time_logs tl
    JOIN activity_types at ON tl.activity_type_id = at.id
    WHERE tl.date = ? AND LOWER(at.name) != 'obudzenie'
  `).get(date);
  return result.count > 0;
}

export function getTotalTimeByActivityType() {
  const logs = db.prepare(`
    SELECT tl.*, at.name, at.color
    FROM time_logs tl
    JOIN activity_types at ON tl.activity_type_id = at.id
    WHERE LOWER(at.name) != 'obudzenie'
    ORDER BY tl.date, tl.start_time
  `).all();

  const totals = {};
  
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const nextLog = logs.find((l, idx) => idx > i && l.date === log.date);
    const duration = nextLog
      ? Math.max(new Date(nextLog.start_time) - new Date(log.start_time), 0)
      : 60 * 60 * 1000; // Zakładamy domyślnie godzinę, jeśli brak kolejnej aktywności

    if (!totals[log.name]) {
      totals[log.name] = { name: log.name, color: log.color, value: 0 };
    }
    totals[log.name].value += duration;
  }

  return Object.values(totals).map(item => ({
    ...item,
    value: Math.round(item.value / (1000 * 60 * 60) * 10) / 10 // Godziny z jednym miejscem
  }));
}

export function getAllDatesWithData() {
  const results = db.prepare(`
    SELECT DISTINCT tl.date AS date
    FROM time_logs tl
    JOIN activity_types at ON tl.activity_type_id = at.id
    WHERE LOWER(at.name) != 'obudzenie'
    ORDER BY tl.date
  `).all();
  return results.map(row => row.date);
}

export function getAllTimeLogs() {
  return db.prepare(`
    SELECT tl.*, at.name, at.color, at.description,
           CASE WHEN LOWER(at.name) = 'obudzenie' THEN 1 ELSE 0 END AS is_wakeup
    FROM time_logs tl
    JOIN activity_types at ON tl.activity_type_id = at.id
    ORDER BY tl.date, tl.start_time
  `).all();
}

export function replaceTimeLogsForDate(date, entries) {
  const deleteStmt = db.prepare('DELETE FROM time_logs WHERE date = ?');
  const insertStmt = db.prepare('INSERT INTO time_logs (activity_type_id, start_time, date) VALUES (?, ?, ?)');

  const transaction = db.transaction((records) => {
    deleteStmt.run(date);
    for (const record of records) {
      insertStmt.run(record.activityTypeId, record.startTime, date);
    }
  });

  transaction(entries);
}

initDatabase();
