import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DemoSessionGuard } from '../components/demo/DemoSessionGuard';
import { DemoSignInPage } from '../pages/demo/DemoSignInPage';
import { HackathonArchitecturePage } from '../pages/demo/HackathonArchitecturePage';
import { PlantCapacityDemo } from '../pages/demo/PlantCapacityDemo';
import { PlantCapacityUxDemo } from '../pages/demo/PlantCapacityUxDemo';
import { PlantCapacityTour } from '../pages/demo/PlantCapacityTour';
import { PlantUc1FlowGallery } from '../pages/demo/PlantUc1FlowGallery';
import { Home } from '../pages/Home/Home';
import { paths } from './paths';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route path={paths.home} element={<Home />} />
      <Route path={paths.demoSignIn} element={<DemoSignInPage />} />
      <Route
        path={paths.demoPlant}
        element={
          <DemoSessionGuard>
            <PlantCapacityDemo />
          </DemoSessionGuard>
        }
      />
      <Route
        path={paths.demoPlantUx}
        element={
          <DemoSessionGuard>
            <PlantCapacityUxDemo />
          </DemoSessionGuard>
        }
      />
      <Route
        path={paths.demoPlantTour}
        element={
          <DemoSessionGuard>
            <PlantCapacityTour />
          </DemoSessionGuard>
        }
      />
      <Route
        path={paths.demoPlantFlow}
        element={
          <DemoSessionGuard>
            <PlantUc1FlowGallery />
          </DemoSessionGuard>
        }
      />
      <Route
        path={paths.demoArchitecture}
        element={
          <DemoSessionGuard>
            <HackathonArchitecturePage />
          </DemoSessionGuard>
        }
      />
      <Route path="*" element={<Navigate to={paths.home} replace />} />
      </Routes>
    </>
  );
}
