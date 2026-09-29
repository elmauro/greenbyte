import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PlantEventType, PlantExplanation, QueueRow } from '../../demo/plant/plantDemoTypes';
import { useLocale } from '../../i18n';
import { paths } from '../../routes/paths';
import { plantDemoApi } from '../../services/plantDemoApi';
import { PlantBatchExplainChat } from './PlantBatchExplainChat';
import { PlantBaselineDashboard } from './PlantBaselineDashboard';
import { PlantScheduleWorkspace } from './PlantScheduleWorkspace';

export function PlantLineMvp() {
  const { locale, messages: m } = useLocale();
  const copy = m.plantMvp;
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [eventType, setEventType] = useState<PlantEventType | null>(null);
  const [, setMoves] = useState<{ po: string; fromPosition: number; toPosition: number }[]>([]);
  const [explanation, setExplanation] = useState<PlantExplanation | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await plantDemoApi.getQueue();
      setQueue(res.queue);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  async function inject(type: PlantEventType) {
    setBusy(true);
    try {
      const res = await plantDemoApi.postEvent(type, locale);
      setQueue(res.queue);
      setMoves(res.diff.moves);
      setEventType(type);
      setExplanation(res.explanation);
      setAccepted(false);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    try {
      const res = await plantDemoApi.resetDemo();
      setQueue(res.queue);
      setEventType(null);
      setMoves([]);
      setExplanation(null);
      setAccepted(false);
    } finally {
      setBusy(false);
    }
  }

  async function acceptPlan() {
    setBusy(true);
    try {
      await plantDemoApi.postAccept();
      setAccepted(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-16">
      <section className="border-b border-gray-100 bg-gradient-to-br from-brand-green/10 via-white to-brand-blue/5 py-10">
        <div className="site-container max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-green">{copy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-blue">{copy.title}</h1>
          <p className="mt-3 max-w-3xl text-gray-600">{copy.subtitle}</p>
          <p className="mt-2 text-sm font-medium text-brand-blue/80">{copy.demoTargetBadge}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
            <Link
              to={paths.demoPlantTour}
              className="rounded-full bg-brand-green px-4 py-2 text-white hover:bg-brand-green-dark"
            >
              {copy.links.tourCta} →
            </Link>
            <Link to={paths.demoArchitecture} className="inline-flex items-center text-brand-blue hover:text-brand-blue/80">
              {copy.links.architecture} →
            </Link>
            <Link to={paths.demoPlantFlow} className="inline-flex items-center text-brand-blue hover:text-brand-blue/80">
              {copy.links.flowSlides} →
            </Link>
          </div>
        </div>
      </section>

      <div className="site-container mt-8 max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-brand-blue">{copy.lineTitle}</h2>
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

        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy || loading}
              title={copy.actions.rushTooltip}
              onClick={() => void inject('rush')}
              className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50"
            >
              {copy.actions.rush}
            </button>
            <button
              type="button"
              disabled={busy || loading}
              title={copy.actions.qaFailTooltip}
              onClick={() => void inject('qa_fail')}
              className="rounded-lg border border-brand-blue/30 px-4 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5 disabled:opacity-50"
            >
              {copy.actions.qaFail}
            </button>
            <button
              type="button"
              disabled={busy || loading}
              title={copy.actions.resetTooltip}
              onClick={() => void reset()}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              {copy.actions.reset}
            </button>
          </div>
          <details className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <summary className="cursor-pointer font-semibold text-gray-900">{copy.eventHelp.title}</summary>
            <ul className="mt-2 space-y-2">
              <li>
                <span className="font-medium text-brand-green-dark">{copy.eventHelp.rushLabel} —</span>{' '}
                {copy.eventHelp.rushBody}
              </li>
              <li>
                <span className="font-medium text-brand-blue">{copy.eventHelp.qaLabel} —</span>{' '}
                {copy.eventHelp.qaBody}
              </li>
              <li>
                <span className="font-medium text-gray-800">{copy.eventHelp.resetLabel} —</span>{' '}
                {copy.eventHelp.resetBody}
              </li>
            </ul>
          </details>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">{copy.loading}</p>
        ) : eventType && explanation ? (
          <>
            <PlantScheduleWorkspace
              queue={queue}
              eventType={eventType}
              explanation={explanation}
              accepted={accepted}
              acceptDisabled={busy}
              onAccept={() => void acceptPlan()}
            />
            <PlantBatchExplainChat queue={queue} />
          </>
        ) : (
          <>
            <PlantBaselineDashboard queue={queue} />
            <PlantBatchExplainChat queue={queue} />
          </>
        )}

        {accepted && (
          <p className="text-center text-sm font-medium text-brand-green-dark">{copy.acceptedNote}</p>
        )}
        <p className="text-xs text-gray-500">
          {plantDemoApi.useRemoteBff ? copy.apiNoteBff : copy.apiNoteLocal}
        </p>
      </div>
    </div>
  );
}
