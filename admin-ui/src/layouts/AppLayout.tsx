import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { useHealth } from '../hooks/useHealth';

export function AppLayout() {
  const { apiOffline, offlineMessage } = useHealth();

  return (
    <div className="layout">
      <Header />
      <main className="main">
        {apiOffline && (
          <div className="alert alert-error" role="alert">
            {offlineMessage}
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
