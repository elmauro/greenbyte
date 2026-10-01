import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  appendPlantUxApprovalHistory,
  readPlantUxApprovalHistory,
} from '../../demo/plant/plantUxApprovalHistory';
import { plantLineById } from '../../demo/plant/plantLines';
import { signOutPlantUx } from '../../demo/plant/plantDemoSessionAuth';
import { useDemoSession } from '../../hooks/useDemoSession';
import { useLocale } from '../../i18n';
import { usePlantDemoQueue } from '../../hooks/usePlantDemoQueue';
import { paths } from '../../routes/paths';
import type { PlantNavSection } from './PlantBaselineDashboard';
import { PlantBaselineDashboard } from './PlantBaselineDashboard';

const SECTIONS: PlantNavSection[] = ['dashboard', 'queue', 'scheduling', 'copilot'];

function parseSection(raw: string | null): PlantNavSection {
  if (raw && SECTIONS.includes(raw as PlantNavSection)) return raw as PlantNavSection;
  return 'dashboard';
}

export function PlantLineUx() {
  const { locale, messages: m } = useLocale();
  const copy = m.plantMvp;
  const uxPage = copy.uxCompare;
  const navigate = useNavigate();
  const session = useDemoSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = parseSection(searchParams.get('section'));
  const line = plantLineById(searchParams.get('line'));
  const [approvalHistory, setApprovalHistory] = useState(() => readPlantUxApprovalHistory());

  const {
    queue,
    eventType,
    explanation,
    eventHighlightPo,
    accepted,
    acceptNotice,
    planAcknowledged,
    loading,
    refreshing,
    busy,
    acceptPlan,
    connectionMode,
    loadError,
  } = usePlantDemoQueue(locale, line.id);

  const onSectionChange = useCallback(
    (next: PlantNavSection) => {
      const params = new URLSearchParams(searchParams);
      params.set('section', next);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleAccept = useCallback(async () => {
    if (eventType === 'rush') appendPlantUxApprovalHistory('priority');
    else if (eventType === 'qa_fail') appendPlantUxApprovalHistory('quality');
    await acceptPlan();
    setApprovalHistory(readPlantUxApprovalHistory());
  }, [acceptPlan, eventType]);

  if (!session) {
    return null;
  }

  return (
    <div className="pb-24">
      <section className="border-b border-gray-100 bg-gradient-to-br from-brand-blue/5 via-white to-brand-green/10 py-8">
        <div className="site-container max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-blue">{uxPage.badge}</p>
              <h1 className="mt-2 text-2xl font-bold text-brand-blue">{uxPage.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600">{uxPage.subtitle}</p>
            </div>
            <div className="flex flex-col items-end gap-2 text-sm">
              <p className="text-gray-600">{uxPage.signedInAs.replace('{user}', session.username)}</p>
              <div className="flex flex-wrap gap-3 font-semibold">
                <Link to={paths.demoPlant} className="text-brand-green hover:text-brand-green-dark">
                  {uxPage.classicLink} →
                </Link>
                <button
                  type="button"
                  className="text-gray-600 hover:text-gray-900"
                  onClick={() => {
                    signOutPlantUx();
                    navigate(paths.home);
                  }}
                >
                  {uxPage.signOut}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="site-container mt-8 max-w-7xl space-y-6">
        {loading ? (
          <p className="text-sm text-gray-500">{copy.loading}</p>
        ) : (
          <>
            {loadError && <p className="text-sm font-medium text-brand-red">{copy.lineLoadError}</p>}
          <PlantBaselineDashboard
            experience="ux"
            section={section}
            onSectionChange={onSectionChange}
            queue={queue}
            eventType={eventType}
            explanation={explanation}
            eventHighlightPo={eventHighlightPo}
            accepted={accepted}
            planAcknowledged={planAcknowledged}
            acceptNotice={acceptNotice}
            acceptDisabled={busy}
            uxApprovalHistory={approvalHistory}
            selectedLineId={line.id}
            dataRefreshing={refreshing}
            onLineChange={(nextId) => {
              const params = new URLSearchParams(searchParams);
              params.set('line', nextId);
              setSearchParams(params, { replace: true });
            }}
            onAccept={() => void handleAccept()}
          />
          </>
        )}
        {accepted && (
          <p className="text-center text-sm font-medium text-brand-green-dark">{copy.acceptedNote}</p>
        )}
        <p className="text-xs text-gray-500">
          {connectionMode === 'bff'
            ? copy.apiNoteBff
            : connectionMode === 'msw'
              ? copy.apiNoteMsw
              : copy.apiNoteLocal}
        </p>
        <details className="rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-600">
          <summary className="cursor-pointer font-semibold text-brand-blue">
            {copy.ux.operatorsTitle}
          </summary>
          <p className="mt-2 leading-relaxed">{copy.ux.operatorsBody}</p>
        </details>
      </div>
    </div>
  );
}
