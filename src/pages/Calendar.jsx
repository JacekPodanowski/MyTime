import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isAfter, isToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AddActivityModal from '../components/AddActivityModal';
import { useData } from '../context/DataContext.jsx';
import './Calendar.css';

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(new Date());
  const { datesWithData } = useData();
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: pl, weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { locale: pl, weekStartsOn: 1 });

  const days = [];
  let day = startDate;

  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMonthStart = startOfMonth(today);
  const nextMonthDate = addMonths(currentMonth, 1);
  const canGoForward = !isAfter(startOfMonth(nextMonthDate), todayMonthStart);

  const hasData = (date) => {
    return datesWithData.has(format(date, 'yyyy-MM-dd'));
  };

  const getDayClass = (date) => {
    const classes = ['calendar-day'];
    
    if (!isSameMonth(date, monthStart)) {
      classes.push('other-month');
    }
    
    if (isAfter(date, today)) {
      classes.push('future');
    } else if (hasData(date)) {
      classes.push('has-data');
    } else {
      classes.push('no-data');
    }
    
    if (isToday(date)) {
      classes.push('today');
    }
    
    return classes.join(' ');
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    const targetMonth = addMonths(currentMonth, 1);
    if (isAfter(startOfMonth(targetMonth), todayMonthStart)) {
      return;
    }
    setCurrentMonth(targetMonth);
  };

  const handleDayClick = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!isAfter(date, today)) {
      setModalDate(date);
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div className="calendar-page">
        <div className="calendar-header">
          <button onClick={prevMonth} className="month-nav">
            <ChevronLeft size={24} />
          </button>
          <h2>{format(currentMonth, 'LLLL yyyy', { locale: pl })}</h2>
          <button
            onClick={nextMonth}
            className={`month-nav ${!canGoForward ? 'disabled' : ''}`}
            disabled={!canGoForward}
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="calendar-grid">
          <div className="weekday-header">Pon</div>
          <div className="weekday-header">Wt</div>
          <div className="weekday-header">Śr</div>
          <div className="weekday-header">Czw</div>
          <div className="weekday-header">Pt</div>
          <div className="weekday-header">Sob</div>
          <div className="weekday-header">Nie</div>

          {days.map((day, index) => (
            <div
              key={index}
              className={getDayClass(day)}
              onClick={() => handleDayClick(day)}
            >
              <span className="day-number">{format(day, 'd')}</span>
              {!isAfter(day, today) && !hasData(day) && (
                <span className="day-watermark">?</span>
              )}
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
