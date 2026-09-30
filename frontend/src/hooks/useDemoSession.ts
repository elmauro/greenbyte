import { useEffect, useState } from 'react';
import {
  DEMO_SESSION_EVENT,
  readPlantUxSession,
  type PlantUxSession,
} from '../demo/plant/plantDemoSessionAuth';

export function useDemoSession(): PlantUxSession | null {
  const [session, setSession] = useState(() => readPlantUxSession());

  useEffect(() => {
    function refresh() {
      setSession(readPlantUxSession());
    }
    window.addEventListener(DEMO_SESSION_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(DEMO_SESSION_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return session;
}
