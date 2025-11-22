import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import ThemeToggle from './components/UI/ThemeToggle';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Analysis from './pages/Analysis';
import './styles/theme.css';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
        <nav className="nav">
          <div className="nav-brand">MyTime</div>
          <div className="nav-links">
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/calendar" className="nav-link">Kalendarz</Link>
            <Link to="/analysis" className="nav-link">Analiza</Link>
            <ThemeToggle />
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/analysis" element={<Analysis />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
