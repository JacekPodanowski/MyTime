import express from 'express';
import cors from 'cors';
import { 
  getAllActivityTypes, 
  createTimeLog, 
  getTimeLogsByDate,
  getAllDatesWithData,
  ensureActivityType,
  getAllTimeLogs,
  replaceTimeLogsForDate,
  getTotalTimeByActivityType
} from './src/utils/database.js';

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// Pobierz wszystkie typy aktywności
app.get('/api/activity-types', (req, res) => {
  try {
    const types = getAllActivityTypes();
    res.json(types);
  } catch (error) {
    console.error('Błąd podczas pobierania typów aktywności:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Dodaj nowy typ aktywności
app.post('/api/activity-types', (req, res) => {
  try {
    const { name, color = '#3b82f6', description = '' } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Brak nazwy aktywności' });
    }
    const type = ensureActivityType(name.trim(), color, description);
    res.status(201).json(type);
  } catch (error) {
    console.error('Błąd podczas tworzenia typu aktywności:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Zapisz log czasowy (pojedynczy)
app.post('/api/time-logs', (req, res) => {
  try {
    const { activityType, startTime, date, color, description } = req.body;
    if (!activityType || !startTime || !date) {
      return res.status(400).json({ error: 'Niekompletne dane logu' });
    }

    const type = ensureActivityType(activityType, color, description);
    const result = createTimeLog(type.id, startTime, date);
    res.status(201).json(result);
  } catch (error) {
    console.error('Błąd podczas zapisywania logu czasowego:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Zapisz logi czasowe dla konkretnego dnia (zastępując istniejące)
app.put('/api/time-logs/:date', (req, res) => {
  try {
    const { date } = req.params;
    const { entries } = req.body;

    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: 'Brak danych do zapisania' });
    }

    const records = entries
      .filter(entry => entry.activityType && entry.startTime)
      .map(entry => {
        const type = ensureActivityType(entry.activityType, entry.color, entry.description);
        return {
          activityTypeId: type.id,
          startTime: entry.startTime
        };
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    replaceTimeLogsForDate(date, records);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Błąd podczas zapisywania logów dla dnia:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Pobierz wszystkie logi
app.get('/api/time-logs', (req, res) => {
  try {
    const logs = getAllTimeLogs();
    res.json(logs);
  } catch (error) {
    console.error('Błąd podczas pobierania logów:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Pobierz wszystkie daty z danymi
app.get('/api/dates-with-data', (req, res) => {
  try {
    const dates = getAllDatesWithData();
    res.json(dates);
  } catch (error) {
    console.error('Błąd podczas pobierania dat z danymi:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Pobierz logi dla konkretnej daty
app.get('/api/time-logs/:date', (req, res) => {
  try {
    const { date } = req.params;
    const logs = getTimeLogsByDate(date);
    res.json(logs);
  } catch (error) {
    console.error('Błąd podczas pobierania logów:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Dane początkowe dla klienta
app.get('/api/initial-data', (req, res) => {
  try {
    const activityTypes = getAllActivityTypes();
    const timeLogs = getAllTimeLogs();
    const analysis = getTotalTimeByActivityType();
    const dates = getAllDatesWithData();

    res.json({
      activityTypes,
      timeLogs,
      analysis,
      datesWithData: dates
    });
  } catch (error) {
    console.error('Błąd podczas pobierania danych początkowych:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.listen(PORT, () => {
  console.log(`Serwer API działa na http://localhost:${PORT}`);
});
