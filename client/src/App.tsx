import { Navigate, Route, Routes } from 'react-router-dom';
import { CustomerQueuePage } from './pages/CustomerQueuePage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/q/:shopSlug" element={<CustomerQueuePage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
