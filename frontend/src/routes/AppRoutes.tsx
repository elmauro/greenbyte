import { Navigate, Route, Routes } from 'react-router-dom';
import { BreedingDemo } from '../pages/demo/BreedingDemo';
import { PlantCapacityDemo } from '../pages/demo/PlantCapacityDemo';
import { Home } from '../pages/Home/Home';
import { paths } from './paths';

export function AppRoutes() {
  return (
    <Routes>
      <Route path={paths.home} element={<Home />} />
      <Route path={paths.demoPlant} element={<PlantCapacityDemo />} />
      <Route path={paths.demoBreeding} element={<BreedingDemo />} />
      <Route path="*" element={<Navigate to={paths.home} replace />} />
    </Routes>
  );
}
