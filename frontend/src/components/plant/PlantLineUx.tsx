import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DemoPageBody, DemoPageIntro } from '../layout/DemoPageIntro';
import {
  appendPlantUxApprovalHistory,
  readPlantUxApprovalHistory,
} from '../../demo/plant/plantUxApprovalHistory';
import { plantLineById } from '../../demo/plant/plantLines';
import { useDemoSession } from '../../hooks/useDemoSession';
import { useLocale } from '../../i18n';
import { usePlantDemoQueue } from '../../hooks/usePlantDemoQueue';
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
    setManualOrder,
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
      <DemoPageIntro eyebrow={uxPage.badge} title={uxPage.title} subtitle={uxPage.subtitle} />

      <DemoPageBody>
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
            onManualOrder={setManualOrder}
          />
          </>
        )}
        {accepted && (
          <p className="text-center text-sm font-medium text-brand-green-dark">{copy.acceptedNote}</p>
        )}
        <details className="rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-600">
          <summary className="cursor-pointer font-semibold text-brand-blue">
            {copy.ux.operatorsTitle}
          </summary>
          <p className="mt-2 leading-relaxed">{copy.ux.operatorsBody}</p>
        </details>
      </DemoPageBody>
    </div>
  );
}
