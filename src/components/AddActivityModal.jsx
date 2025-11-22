import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useData } from '../context/DataContext.jsx';
import './AddActivityModal.css';

const DEFAULT_ACTIVITIES = [
  { time: '08:00', type: 'Obudzenie', isWakeup: true },
  { time: '', type: '' }
];

export default function AddActivityModal({ isOpen, onClose, selectedDate, onSave }) {
  const { activityTypes, timeLogsByDate, ensureActivityTypeExists, saveTimeLogsForDate } = useData();
  const [activities, setActivities] = useState(() => DEFAULT_ACTIVITIES.map((item) => ({ ...item })));
  const [focusedIndex, setFocusedIndex] = useState(null);

  const activityTypeNames = useMemo(
    () => activityTypes.map((type) => type.name),
    [activityTypes]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingLogsData = timeLogsByDate[dateKey];
    const existingLogs = existingLogsData?.entries || [];

    const wakeLog = existingLogs.find((log) => log.isWakeup);
    const wakeTime = wakeLog?.time || existingLogs.find((log) => !log.isWakeup)?.time || '08:00';
    const wakeEntry = { time: wakeTime, type: 'Obudzenie', isWakeup: true };

    const activityEntries = existingLogs
      .filter((log) => !log.isWakeup)
      .map((log) => ({
        id: log.id,
        time: log.time || log.start_time?.slice(11, 16) || '',
        type: log.name,
        isWakeup: false
      }));

    const nextEmpty = { time: '', type: '', isWakeup: false };
    setActivities([wakeEntry, ...activityEntries, nextEmpty]);

    setFocusedIndex(null);
  }, [isOpen, selectedDate, timeLogsByDate]);

  if (!isOpen) return null;

  const addActivity = () => {
    setActivities([...activities, { time: '', type: '', isWakeup: false }]);
  };

  const updateActivity = (index, field, value) => {
    const newActivities = [...activities];
    newActivities[index][field] = value;
    setActivities(newActivities);
  };

  const removeActivity = (index) => {
    if (activities.length > 1) {
      setActivities(activities.filter((_, i) => i !== index));
    }
  };

  const getFilteredActivities = (index) => {
    const searchTerm = activities[index]?.type || '';
    const filtered = searchTerm 
      ? activityTypeNames.filter(type => type.toLowerCase().includes(searchTerm.toLowerCase()))
      : activityTypeNames;
    return filtered.slice(0, 3);
  };

  const selectActivity = (index, type) => {
    updateActivity(index, 'type', type);
    setFocusedIndex(null);
  };

  const addNewActivityType = async (index) => {
    const newType = activities[index]?.type;
    const exists = activityTypeNames.some(
      (type) => type.toLowerCase() === (newType || '').toLowerCase()
    );
    if (newType && !exists) {
      try {
        await ensureActivityTypeExists(newType);
      } catch (error) {
        console.error('Błąd podczas dodawania typu aktywności:', error);
      }
    }
    setFocusedIndex(null);
  };

  const handleSave = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await saveTimeLogsForDate(dateStr, activities);
      if (onSave) {
        onSave();
      }
      onClose();
    } catch (error) {
      console.error('Błąd podczas zapisywania aktywności:', error);
      alert(error?.message || 'Wystąpił błąd podczas zapisywania danych.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Dodaj aktywności</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="date-display">
            {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: pl })}
          </div>

          <div className="activities-list">
            <div className="list-header">
              <span>Godzina rozpoczęcia</span>
              <span>Aktywność</span>
            </div>

            {activities.map((activity, index) => (
              <div key={index} className="activity-row">
                <input
                  type="time"
                  value={activity.time}
                  onChange={(e) => updateActivity(index, 'time', e.target.value)}
                  className="time-input"
                />
                <div className="type-input-wrapper">
                  <input
                    type="text"
                    value={activity.type}
                    onChange={(e) => updateActivity(index, 'type', e.target.value)}
                    onFocus={() => !activity.isWakeup && setFocusedIndex(index)}
                    onBlur={() => setTimeout(() => setFocusedIndex(null), 200)}
                    placeholder={activity.isWakeup ? "Obudzenie (niezmienne)" : "Wpisz lub wybierz aktywność"}
                    className={`type-input ${activity.isWakeup ? 'disabled' : ''}`}
                    disabled={activity.isWakeup}
                  />
                  {focusedIndex === index && !activity.isWakeup && (
                    <div className="suggestions-dropdown">
                      {getFilteredActivities(index).map((type) => (
                        <div
                          key={type}
                          className="suggestion-item"
                          onClick={() => selectActivity(index, type)}
                        >
                          {type}
                        </div>
                      ))}
                      {activities[index]?.type && !activityTypeNames.some((type) => type.toLowerCase() === activities[index].type.toLowerCase()) && (
                        <div
                          className="suggestion-item add-new"
                          onClick={() => addNewActivityType(index)}
                        >
                          + Dodaj "{activities[index].type}" jako nową
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {activities.length > 1 && !activity.isWakeup && (
                  <button
                    className="remove-btn"
                    onClick={() => removeActivity(index)}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button className="add-more-btn" onClick={addActivity}>
            + Dodaj kolejną aktywność
          </button>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Anuluj
          </button>
          <button className="btn-save" onClick={handleSave}>
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
}
