import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { PlantDemoLoginGate } from '../../components/plant/PlantDemoLoginGate';
import { SiteLayout } from '../../components/layout/SiteLayout';
import { readPlantUxSession } from '../../demo/plant/plantDemoSessionAuth';
import { paths } from '../../routes/paths';

function safeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith('/')) return paths.demoPlant;
  if (raw.startsWith('//')) return paths.demoPlant;
  return raw;
}

export function DemoSignInPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));
  const existing = readPlantUxSession();

  if (existing) {
    return <Navigate to={returnTo} replace />;
  }

  return (
    <SiteLayout>
      <PlantDemoLoginGate onSignedIn={() => navigate(returnTo, { replace: true })} />
    </SiteLayout>
  );
}
