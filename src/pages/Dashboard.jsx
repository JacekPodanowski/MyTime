import { useMemo, useState, useEffect } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import AddActivityModal from '../components/AddActivityModal';
import { useData } from '../context/DataContext.jsx';
import './Dashboard.css';

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(new Date());
  const [nowTick, setNowTick] = useState(Date.now());
  const { timeLogsByDate, activityTypes } = useData();
  const weekStart = startOfWeek(selectedDate, { locale: pl, weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const activityColors = useMemo(() => {
    return activityTypes.reduce((acc, type) => {
      acc[type.name.toLowerCase()] = type.color;
      return acc;
    }, {});
  }, [activityTypes]);

  const openModal = (date) => {
    setModalDate(date);
    setIsModalOpen(true);
  };

  // update now line every full minute for the dashboard
  useEffect(() => {
    // align to next minute boundary, then update each 60s
    let timeout = null;
    let interval = null;
    const tick = () => setNowTick(Date.now());
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 60 * 1000);
    }, Math.max(0, msToNextMinute));

    return () => {
      if (timeout) clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  const MIN_BLOCK_HEIGHT = 3; // procent

  const renderDayContent = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayData = timeLogsByDate[dateKey];
    const logs = dayData?.entries || [];
    const dayStart = dayData?.dayStartMinutes ?? 0;
    const dayEnd = dayData?.dayEndMinutes ?? dayStart + 1440;
    const dayDuration = Math.max(dayEnd - dayStart, 1);
    const wakeLog = logs.find((log) => log.isWakeup);
    const activities = logs.filter((log) => !log.isWakeup && Number.isFinite(log.absoluteMinutes))
      .slice()
      .sort((a, b) => a.absoluteMinutes - b.absoluteMinutes);

    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const isToday = dateKey === todayKey;

    // compute now relative to day start (handle wrap) using tick (auto-updates)
    const nowDate = new Date(nowTick);
    const nowMinutesRaw = nowDate.getHours() * 60 + nowDate.getMinutes();
    let nowAbsolute = nowMinutesRaw;
    if (dayStart !== null && Number.isFinite(dayStart)) {
      if (nowMinutesRaw < dayStart) {
        nowAbsolute = nowMinutesRaw + 1440;
      }
    }
    // clamp now into timeline range
    const nowWithin = Math.max(dayStart, Math.min(nowAbsolute, dayEnd));

    if (activities.length === 0) {
      return (
        <div className="no-data">
          <span className="watermark">?</span>
        </div>
      );
    }

    const wakeTopPercent = (() => {
      const absoluteWake = Number.isFinite(wakeLog?.absoluteMinutes) ? wakeLog.absoluteMinutes : dayStart;
      const offset = absoluteWake - dayStart;
      const ratio = Math.max(Math.min(offset / dayDuration, 1), 0);
      return ratio * 100;
    })();

    return (
      <div className="timeline-track">
        {activities.map((log, idx) => {
          const color = activityColors[log.name.toLowerCase()] || '#6b7280';
          const absoluteStart = Number.isFinite(log.absoluteMinutes) ? log.absoluteMinutes : dayStart;
          const startOffset = absoluteStart - dayStart;
          // determine next activity to compute visible end
          const next = activities[idx + 1];
          let nextAbsolute = next?.absoluteMinutes ?? dayEnd;

          // If this is the last activity for today and it's actually today, clamp to now
          if (isToday && !next) {
            nextAbsolute = Math.min(nowWithin, dayEnd);
          }

          // adjusted duration used for visual height
          const adjustedDuration = Math.max(nextAbsolute - absoluteStart, 0);
          const topPercent = Math.min((startOffset / dayDuration) * 100, 100 - MIN_BLOCK_HEIGHT);
          const rawHeight = (adjustedDuration / dayDuration) * 100;
          const availableSpace = Math.max(100 - topPercent, MIN_BLOCK_HEIGHT);

          // For the last activity on today, avoid forcing minimum height so it ends exactly at 'now'
          const isLast = !next;
          const desiredHeight = (isToday && isLast) ? rawHeight : Math.max(rawHeight, MIN_BLOCK_HEIGHT);
          const heightPercent = Math.min(desiredHeight, availableSpace);

          // do not render activities that fully end before start or have zero visible height
          if (adjustedDuration <= 0 || heightPercent <= 0) return null;

          const displayMinutes = (isToday && isLast) ? Math.max(Math.round(adjustedDuration), 0) : (log.durationMinutes || Math.max(Math.round(adjustedDuration), 0));

          return (
            <div
              key={log.id || `${log.start_time}-${log.name}`}
              className="activity-block"
              style={{
                top: `${topPercent}%`,
                height: `${heightPercent}%`,
                backgroundColor: color
              }}
            >
              <span className="activity-label">
                <strong>{log.name}</strong>
                <span>{formatDuration(displayMinutes)}</span>
              </span>
            </div>
          );
        })}

          {isToday && (
            <div
              className="now-line"
              style={{ top: `${Math.min(Math.max(((nowWithin - dayStart) / dayDuration) * 100, 0), 100)}%` }}
            >
              <span className="now-label">{`${String(nowDate.getHours()).padStart(2, '0')}:${String(nowDate.getMinutes()).padStart(2, '0')}`}</span>
            </div>
          )}

          {wakeLog?.time && (
            <div className="wake-indicator" style={{ top: `${wakeTopPercent}%` }}>
              <span>{wakeLog.time}</span>
            </div>
          )}
      </div>
    );
  };

  return (
    <>
      <div className="dashboard">
        <button className="add-button" onClick={() => openModal(new Date())}>+ Dodaj</button>
        
        <div className="week-view">
          {weekDays.map((day, index) => (
            <div key={index} className="day-wrapper">
              <div className="day-label">
                {format(day, 'EEE', { locale: pl })} {format(day, 'dd')}
              </div>
              <div 
                className="day-column" 
                onClick={() => openModal(day)}
              >
                <div className="day-content">
                  {renderDayContent(day)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AddActivityModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={modalDate}
      />
    </>
  );
}

const formatDuration = (minutes) => {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '';
  }
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs > 0 && mins > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (hrs > 0) {
    return `${hrs}h`;
  }
  return `${mins}m`;
};
