import { Navigate, Route, Routes } from 'react-router-dom';
import { Home } from '../pages/Home/Home';
import { paths } from './paths';

export function AppRoutes() {
  return (
    <Routes>
      <Route path={paths.home} element={<Home />} />
      <Route path="*" element={<Navigate to={paths.home} replace />} />
    </Routes>
  );
}
