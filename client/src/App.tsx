import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell, RequireAuth } from './components/AppShell';
import { LoginPage } from './features/auth/LoginPage';
import { NewTicketPage } from './features/tickets/NewTicketPage';
import { TicketDetailPage } from './features/tickets/TicketDetailPage';
import { TicketListPage } from './features/tickets/TicketListPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<TicketListPage />} />
          <Route path="tickets/new" element={<NewTicketPage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
