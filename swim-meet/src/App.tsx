import { Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './lib/auth';
import { Landing } from './pages/Landing';
import { Register } from './pages/Register';
import { Confirmation } from './pages/Confirmation';
import { StaffLogin } from './pages/StaffLogin';
import { AdminLayout } from './admin/AdminLayout';
import { AdminOverview } from './admin/AdminOverview';
import { AdminEvents } from './admin/AdminEvents';
import { AdminRegistrations } from './admin/AdminRegistrations';
import { AdminChips } from './admin/AdminChips';
import { TimingLayout } from './timing/TimingLayout';
import { StagingStation } from './timing/StagingStation';
import { StartControl } from './timing/StartControl';
import { FinishStation } from './timing/FinishStation';
import { ResultsBoard } from './pages/ResultsBoard';
import { RequireStaff } from './components/RequireStaff';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/events/:eventId/register/:categoryId" element={<Register />} />
        <Route path="/confirmation/:registrationId" element={<Confirmation />} />
        <Route path="/events/:eventId/results" element={<ResultsBoard />} />
        <Route path="/staff/login" element={<StaffLogin />} />

        <Route
          path="/admin"
          element={
            <RequireStaff>
              <AdminLayout />
            </RequireStaff>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="events/:eventId/registrations" element={<AdminRegistrations />} />
          <Route path="events/:eventId/chips" element={<AdminChips />} />
        </Route>

        <Route
          path="/timing/:categoryId"
          element={
            <RequireStaff>
              <TimingLayout />
            </RequireStaff>
          }
        >
          <Route index element={<Navigate to="staging" replace />} />
          <Route path="staging" element={<StagingStation />} />
          <Route path="start" element={<StartControl />} />
          <Route path="finish" element={<FinishStation />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
