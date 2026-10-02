import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DemoPageBody } from '../layout/DemoPageIntro';
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
  if (raw === 'copilot') return 'scheduling';
  if (raw && SECTIONS.includes(raw as PlantNavSection)) return raw as PlantNavSection;
  return 'dashboard';
}

export function PlantLineUx() {
  const { locale, messages: m } = useLocale();
  const copy = m.plantMvp;
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

  const selectOrder = useCallback(
    (po: string) => {
      const params = new URLSearchParams(searchParams);
      params.set('section', 'scheduling');
      params.set('po', po);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleAccept = useCallback(async () => {
    if (eventType === 'rush' || eventType === 'qa_fail') {
      appendPlantUxApprovalHistory({
        kind: eventType === 'rush' ? 'priority' : 'quality',
        po: eventHighlightPo,
        lineId: line.id,
      });
    }
    await acceptPlan();
    setApprovalHistory(readPlantUxApprovalHistory());
  }, [acceptPlan, eventHighlightPo, eventType, line.id]);

  if (!session) {
    return null;
  }

  return (
    <div className="pb-24">
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
              params.delete('po');
              setSearchParams(params, { replace: true });
            }}
            onAccept={() => void handleAccept()}
            onManualOrder={setManualOrder}
            onSelectOrder={selectOrder}
            explainPo={searchParams.get('po') ?? undefined}
            onOpenLine={(lineId) => {
              setSearchParams((prev) => {
                const params = new URLSearchParams(prev);
                params.set('line', lineId);
                params.set('section', 'scheduling');
                params.delete('po');
                return params;
              }, { replace: true });
            }}
          />
          </>
        )}
        {accepted && (
          <p className="text-center text-sm font-medium text-brand-green-dark">{copy.acceptedNote}</p>
        )}
      </DemoPageBody>
    </div>
  );
}
