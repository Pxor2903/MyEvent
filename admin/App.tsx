import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './src/components/AdminLayout.tsx';
import { LoginAdmin } from './src/components/LoginAdmin.tsx';
import { Dashboard } from './src/components/Dashboard.tsx';
import { ProvidersList } from './src/components/ProvidersList.tsx';
import { ProviderDetail } from './src/components/ProviderDetail.tsx';
import { AdminActions } from './src/components/AdminActions.tsx';
import { useAdminAuth } from './src/hooks/useAdminAuth.ts';

export default function App() {
  const { user, loading } = useAdminAuth();

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        Chargement…
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginAdmin />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="providers" element={<ProvidersList />} />
        <Route path="providers/:id" element={<ProviderDetail />} />
        <Route path="actions" element={<AdminActions />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
