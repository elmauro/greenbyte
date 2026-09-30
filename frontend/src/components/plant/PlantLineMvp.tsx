import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  PlantEventType,
  PlantExplanation,
  PlantQueueResponse,
  QueueRow,
} from '../../demo/plant/plantDemoTypes';
import {
  isPlanAcknowledged,
  mergeAckPlanVersion,
  readAckPlanVersion,
  writeAckPlanVersion,
} from '../../demo/plant/plantDemoAckStorage';
import { getPlantEventExplanation, PLANT_DEMO_LINE_ID } from '../../demo/plant/plantDemoServer';
import { useLocale } from '../../i18n';
import { paths } from '../../routes/paths';
import { getApiConnectionMode } from '../../services/apiConfig';
import { plantDemoApi } from '../../services/plantDemoApi';
import { PlantBaselineDashboard } from './PlantBaselineDashboard';

export function PlantLineMvp() {
  const { locale, messages: m } = useLocale();
  const copy = m.plantMvp;
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [eventType, setEventType] = useState<PlantEventType | null>(null);
  const [, setMoves] = useState<{ po: string; fromPosition: number; toPosition: number }[]>([]);
  const [explanation, setExplanation] = useState<PlantExplanation | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [planVersion, setPlanVersion] = useState(1);
  const [ackPlanVersion, setAckPlanVersion] = useState<number | null>(() => readAckPlanVersion());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const acceptedPlanVersionRef = useRef<number | null>(readAckPlanVersion());
  const acceptEpochRef = useRef(0);
  const connectionMode = getApiConnectionMode();
  const pollsRemoteQueue = connectionMode === 'bff' || connectionMode === 'msw';

  const syncAckPlanVersion = useCallback((version: number | null) => {
    acceptedPlanVersionRef.current = version;
    setAckPlanVersion(version);
    writeAckPlanVersion(PLANT_DEMO_LINE_ID, version);
  }, []);

  const applyQueueSnapshot = useCallback(
    (res: PlantQueueResponse) => {
      setQueue(res.queue);
      setPlanVersion(res.planVersion);

      const mergedAck = mergeAckPlanVersion(acceptedPlanVersionRef.current, res.acceptedPlanVersion);
      if (mergedAck !== acceptedPlanVersionRef.current) {
        syncAckPlanVersion(mergedAck);
      }

      if (res.planVersion <= 1 && !res.lastEvent) {
        syncAckPlanVersion(null);
        setEventType(null);
        setExplanation(null);
        setMoves([]);
        setAccepted(false);
        return;
      }

      if (isPlanAcknowledged(res.planVersion, mergedAck)) {
        setEventType(null);
        setExplanation(null);
        setAccepted(true);
        return;
      }

      if (res.lastEvent) {
        syncAckPlanVersion(null);
        setEventType(res.lastEvent);
        setExplanation(getPlantEventExplanation(res.lastEvent, locale));
        setAccepted(false);
      }
    },
    [locale, syncAckPlanVersion],
  );

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await plantDemoApi.getQueue();
      applyQueueSnapshot(res);
    } finally {
      setLoading(false);
    }
  }, [applyQueueSnapshot]);

  const pollQueue = useCallback(async () => {
    if (!pollsRemoteQueue || busy) return;
    const epochAtStart = acceptEpochRef.current;
    try {
      const res = await plantDemoApi.getQueue();
      if (epochAtStart !== acceptEpochRef.current) return;
      applyQueueSnapshot(res);
    } catch {
      /* ignore transient poll errors */
    }
  }, [applyQueueSnapshot, busy, pollsRemoteQueue]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!pollsRemoteQueue) return;
    const id = window.setInterval(() => void pollQueue(), 5_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void pollQueue();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pollQueue, pollsRemoteQueue]);

  async function acceptPlan() {
    setBusy(true);
    try {
      const res = await plantDemoApi.postAccept();
      acceptEpochRef.current += 1;
      syncAckPlanVersion(res.planVersion);
      setAccepted(true);
      setEventType(null);
      setExplanation(null);
      setMoves([]);
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

        <div className="rounded-lg border border-brand-blue/15 bg-brand-blue/[0.03] px-4 py-3 text-sm text-gray-700">
          <p className="font-semibold text-brand-blue">{copy.dataFeed.title}</p>
          <p className="mt-1 leading-relaxed">{copy.dataFeed.body}</p>
          <ul className="mt-2 list-inside list-disc space-y-1 font-mono text-xs text-gray-800">
            <li>{copy.dataFeed.sapPath}</li>
            <li>{copy.dataFeed.passFailPath}</li>
          </ul>
          <p className="mt-2 text-xs text-gray-600">{copy.dataFeed.operatorDoc}</p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">{copy.loading}</p>
        ) : (
          <>
            <PlantBaselineDashboard
              queue={queue}
              eventType={eventType}
              explanation={explanation}
              accepted={accepted}
              planAcknowledged={isPlanAcknowledged(planVersion, ackPlanVersion)}
              acceptDisabled={busy}
              onAccept={() => void acceptPlan()}
            />
          </>
        )}

        {accepted && (
          <p className="text-center text-sm font-medium text-brand-green-dark">{copy.acceptedNote}</p>
        )}
        <p className="text-xs text-gray-500">
          {plantDemoApi.connectionMode === 'bff'
            ? copy.apiNoteBff
            : plantDemoApi.connectionMode === 'msw'
              ? copy.apiNoteMsw
              : copy.apiNoteLocal}
        </p>
      </div>
    </div>
  );
}
