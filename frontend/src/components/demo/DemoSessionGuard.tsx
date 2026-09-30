import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { readPlantUxSession } from '../../demo/plant/plantDemoSessionAuth';
import { paths } from '../../routes/paths';

export function DemoSessionGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const session = readPlantUxSession();

  if (!session) {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`${paths.demoSignIn}?returnTo=${returnTo}`} replace />;
  }

  return children;
}
