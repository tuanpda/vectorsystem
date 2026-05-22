import { useEffect, useState } from 'react';
import { api, API_OFFLINE_MSG, HealthResponse } from '../api/client';

export function useHealth(intervalMs = 15000) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [apiOffline, setApiOffline] = useState(false);

  useEffect(() => {
    const load = () => {
      api
        .health()
        .then((h) => {
          setHealth(h);
          setApiOffline(false);
        })
        .catch(() => {
          setHealth(null);
          setApiOffline(true);
        });
    };
    load();
    const t = setInterval(load, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);

  return { health, apiOffline, offlineMessage: API_OFFLINE_MSG };
}
