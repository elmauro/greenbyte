import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { BreedingDemo } from '../pages/demo/BreedingDemo';
import { PlantCapacityDemo } from '../pages/demo/PlantCapacityDemo';
import { Home } from '../pages/Home/Home';
import { paths } from './paths';

const HackathonArchitecturePage = lazy(() =>
  import('../pages/demo/HackathonArchitecturePage').then((m) => ({ default: m.HackathonArchitecturePage })),
);

function RouteFallback() {
  return (
    <div className="site-container py-24 text-center text-sm text-gray-500" aria-live="polite">
      Loading…
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path={paths.home} element={<Home />} />
      <Route path={paths.demoPlant} element={<PlantCapacityDemo />} />
      <Route path={paths.demoBreeding} element={<BreedingDemo />} />
      <Route
        path={paths.demoArchitecture}
        element={
          <Suspense fallback={<RouteFallback />}>
            <HackathonArchitecturePage />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to={paths.home} replace />} />
    </Routes>
  );
}
