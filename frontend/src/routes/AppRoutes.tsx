import { Navigate, Route, Routes } from 'react-router-dom';
import { BreedingDemo } from '../pages/demo/BreedingDemo';
import { HackathonArchitecturePage } from '../pages/demo/HackathonArchitecturePage';
import { PlantCapacityDemo } from '../pages/demo/PlantCapacityDemo';
import { PlantCapacityTour } from '../pages/demo/PlantCapacityTour';
import { PlantUc1FlowGallery } from '../pages/demo/PlantUc1FlowGallery';
import { Home } from '../pages/Home/Home';
import { paths } from './paths';

export function AppRoutes() {
  return (
    <Routes>
      <Route path={paths.home} element={<Home />} />
      <Route path={paths.demoPlant} element={<PlantCapacityDemo />} />
      <Route path={paths.demoPlantTour} element={<PlantCapacityTour />} />
      <Route path={paths.demoPlantFlow} element={<PlantUc1FlowGallery />} />
      <Route path={paths.demoBreeding} element={<BreedingDemo />} />
      <Route path={paths.demoArchitecture} element={<HackathonArchitecturePage />} />
      <Route path="*" element={<Navigate to={paths.home} replace />} />
    </Routes>
  );
}
