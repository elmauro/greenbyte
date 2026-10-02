import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { DemoSessionGuard } from '../components/demo/DemoSessionGuard';
import { DemoSignInPage } from '../pages/demo/DemoSignInPage';
import { HowItWorksPage } from '../pages/demo/HowItWorksPage';
import { PlantCapacityDemo } from '../pages/demo/PlantCapacityDemo';
import { PlantCapacityUxDemo } from '../pages/demo/PlantCapacityUxDemo';
import { PlantCapacityTour } from '../pages/demo/PlantCapacityTour';
import { Home } from '../pages/Home/Home';
import { paths } from './paths';

function RedirectFlowToHowItWorks() {
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  next.set('section', 'api');
  return <Navigate to={`${paths.demoHowItWorks}?${next.toString()}`} replace />;
}

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
        path={paths.demoHowItWorks}
        element={
          <DemoSessionGuard>
            <HowItWorksPage />
          </DemoSessionGuard>
        }
      />
      <Route
        path={paths.demoPlantFlow}
        element={
          <DemoSessionGuard>
            <RedirectFlowToHowItWorks />
          </DemoSessionGuard>
        }
      />
      <Route
        path={paths.demoArchitecture}
        element={
          <DemoSessionGuard>
            <Navigate to={paths.demoHowItWorks} replace />
          </DemoSessionGuard>
        }
      />
      <Route path="*" element={<Navigate to={paths.home} replace />} />
      </Routes>
    </>
  );
}
