import { Link, useSearchParams } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { DemoPageBody, DemoPageIntro } from '../layout/DemoPageIntro';
import {
  appendPlantUxApprovalHistory,
  readPlantUxApprovalHistory,
} from '../../demo/plant/plantUxApprovalHistory';
import { plantLineById } from '../../demo/plant/plantLines';
import { useLocale } from '../../i18n';
import { usePlantDemoQueue } from '../../hooks/usePlantDemoQueue';
import { paths } from '../../routes/paths';
import type { PlantNavSection } from './PlantBaselineDashboard';
import { PlantBaselineDashboard } from './PlantBaselineDashboard';

const SECTIONS: PlantNavSection[] = ['dashboard', 'queue', 'scheduling', 'copilot'];

function parseSection(raw: string | null): PlantNavSection {
  if (raw === 'copilot') return 'scheduling';
  if (raw && SECTIONS.includes(raw as PlantNavSection)) return raw as PlantNavSection;
  return 'dashboard';
}

export function PlantLineMvp() {
  const { locale, messages: m } = useLocale();
  const copy = m.plantMvp;
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
    demoAction,
    demoActionError,
    acceptPlan,
    resetDemo,
    generatePlan,
    reloadQueue,
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

  const focusCopilot = useCallback(
    (po: string) => {
      const params = new URLSearchParams(searchParams);
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

  return (
    <div className="pb-24">
      <DemoPageIntro
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={copy.subtitle}
        note={copy.demoTargetBadge}
      >
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
            <Link
              to={paths.demoPlantTour}
              className="rounded-full bg-brand-green px-4 py-2 text-white hover:bg-brand-green-dark"
            >
              {copy.links.tourCta} →
            </Link>
            <Link to={paths.demoPlantUx} className="inline-flex items-center text-brand-blue hover:text-brand-blue/80">
              {copy.uxCompare.previewLink} →
            </Link>
            <Link to={paths.demoHowItWorks} className="inline-flex items-center text-brand-blue hover:text-brand-blue/80">
              {copy.links.architecture} →
            </Link>
            <Link to={`${paths.demoHowItWorks}?section=api`} className="inline-flex items-center text-brand-blue hover:text-brand-blue/80">
              {copy.links.flowSlides} →
            </Link>
          </div>
      </DemoPageIntro>

      <DemoPageBody>
        <div>
          <h2 className="text-xl font-semibold text-brand-blue">
            {copy.lineScheduleHeading}
          </h2>
          <p className="text-sm text-gray-500">{copy.lineSubtitle}</p>
        </div>

        <div className="rounded-lg border border-brand-blue/15 bg-brand-blue/[0.03] px-4 py-3 text-sm text-gray-700">
          <p className="font-semibold text-brand-blue">{copy.dataFeed.title}</p>
          <p className="mt-1 leading-relaxed">{copy.dataFeed.body}</p>
          <ul className="mt-2 list-inside list-disc space-y-1 font-mono text-xs text-gray-800">
            <li>{copy.dataFeed.sapPath}</li>
            <li>{copy.dataFeed.sapRefreshPath}</li>
            <li>{copy.dataFeed.passFailPath}</li>
          </ul>
          <p className="mt-2 text-xs text-gray-600">
            {copy.dataFeed.operatorDocLead}{' '}
            <Link
              to={`${paths.demoHowItWorks}?section=api`}
              className="font-semibold text-brand-blue hover:underline"
            >
              {m.howItWorks.navLabel} — {m.howItWorks.api}
            </Link>
          </p>
        </div>

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
            onResetDemo={() => void resetDemo()}
            onGeneratePlan={() => void generatePlan()}
            demoAction={demoAction}
            demoActionError={demoActionError}
            onManualOrder={setManualOrder}
            onQueueRefresh={reloadQueue}
            onSelectOrder={selectOrder}
            onCopilotPo={focusCopilot}
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
