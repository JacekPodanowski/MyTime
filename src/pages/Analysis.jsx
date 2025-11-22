import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useMemo } from 'react';
import { useData } from '../context/DataContext.jsx';
import './Analysis.css';

export default function Analysis() {
  const { analysisData, loading, datesWithData } = useData();
  const hasData = analysisData && analysisData.length > 0;

  const sortedData = useMemo(() => {
    if (!hasData) {
      return [];
    }
    return [...analysisData].sort((a, b) => b.value - a.value);
  }, [analysisData, hasData]);

  const totalHours = useMemo(() => {
    if (!hasData) {
      return 0;
    }
    return Math.round(sortedData.reduce((sum, item) => sum + item.value, 0) * 10) / 10;
  }, [sortedData, hasData]);

  const averagePerDay = useMemo(() => {
    if (!hasData) {
      return 0;
    }
    const daysCount = datesWithData.size || 0;
    if (!daysCount) {
      return 0;
    }
    return Math.round((totalHours / daysCount) * 10) / 10;
  }, [totalHours, datesWithData, hasData]);

  return (
    <div className="analysis">
      <h1>Analiza Czasu</h1>
      
      {!hasData ? (
        <div className="no-data-message">
          {loading ? <p>Ładowanie danych...</p> : <p>Brak danych do analizy. Zacznij dodawać aktywności!</p>}
        </div>
      ) : (
        <div className="analysis-grid">
          <div className="widget pie-widget">
            <h3>Rozkład Aktywności</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sortedData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}h`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sortedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="widget ranking-widget">
            <h3>Ranking Aktywności</h3>
            <div className="ranking-list">
              {sortedData.map((item, index) => (
                <div key={index} className="ranking-item">
                    <span className="rank">#{index + 1}</span>
                    <span 
                      className="dot" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="name">{item.name}</span>
                    <span className="time">{item.value}h</span>
                  </div>
              ))}
            </div>
          </div>

          {/* Statystyki Tygodnia removed as requested */}
        </div>
      )}
    </div>
  );
}
