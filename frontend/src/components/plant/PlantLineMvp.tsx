import { Link, useSearchParams } from 'react-router-dom';
import { DemoPageBody, DemoPageIntro } from '../layout/DemoPageIntro';
import { plantLineById } from '../../demo/plant/plantLines';
import { useLocale } from '../../i18n';
import { usePlantDemoQueue } from '../../hooks/usePlantDemoQueue';
import { paths } from '../../routes/paths';
import { PlantBaselineDashboard } from './PlantBaselineDashboard';

export function PlantLineMvp() {
  const { locale, messages: m } = useLocale();
  const copy = m.plantMvp;
  const [searchParams, setSearchParams] = useSearchParams();
  const line = plantLineById(searchParams.get('line'));

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

  return (
    <div className="pb-16">
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-brand-blue">
              {copy.lineScheduleHeading}
            </h2>
            <p className="text-sm text-gray-500">{copy.lineSubtitle}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              eventType ? 'bg-amber-100 text-amber-900' : 'bg-brand-green/10 text-brand-green-dark'
            }`}
          >
            {eventType ? copy.status.eventActive : copy.status.calm}
          </span>
        </div>

        <div className="rounded-lg border border-brand-blue/15 bg-brand-blue/[0.03] px-4 py-3 text-sm text-gray-700">
          <p className="font-semibold text-brand-blue">{copy.dataFeed.title}</p>
          <p className="mt-1 leading-relaxed">{copy.dataFeed.body}</p>
          <ul className="mt-2 list-inside list-disc space-y-1 font-mono text-xs text-gray-800">
            <li>{copy.dataFeed.sapPath}</li>
            <li>{copy.dataFeed.sapRefreshPath}</li>
            <li>{copy.dataFeed.passFailPath}</li>
          </ul>
          <p className="mt-2 text-xs text-gray-600">{copy.dataFeed.operatorDoc}</p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">{copy.loading}</p>
        ) : (
          <>
            {loadError && <p className="text-sm font-medium text-brand-red">{copy.lineLoadError}</p>}
          <PlantBaselineDashboard
            queue={queue}
            eventType={eventType}
            explanation={explanation}
            eventHighlightPo={eventHighlightPo}
            accepted={accepted}
            planAcknowledged={planAcknowledged}
            acceptNotice={acceptNotice}
            acceptDisabled={busy}
            selectedLineId={line.id}
            dataRefreshing={refreshing}
            onLineChange={(nextId) => {
              const params = new URLSearchParams(searchParams);
              params.set('line', nextId);
              setSearchParams(params, { replace: true });
            }}
            onAccept={() => void acceptPlan()}
            onManualOrder={setManualOrder}
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
