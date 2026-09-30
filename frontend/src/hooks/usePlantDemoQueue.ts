import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PlantEventType,
  PlantExplanation,
  PlantQueueResponse,
  QueueRow,
} from '../demo/plant/plantDemoTypes';
import {
  isPlanAcknowledged,
  mergeAckPlanVersion,
  readAckPlanVersion,
  writeAckPlanVersion,
} from '../demo/plant/plantDemoAckStorage';
import { getPlantEventExplanation, PLANT_DEMO_LINE_ID } from '../demo/plant/plantDemoServer';
import type { Locale } from '../i18n/LocaleContext';
import { getApiConnectionMode } from '../services/apiConfig';
import { plantDemoApi } from '../services/plantDemoApi';

export function usePlantDemoQueue(locale: Locale) {
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [eventType, setEventType] = useState<PlantEventType | null>(null);
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

  const acceptPlan = useCallback(async () => {
    setBusy(true);
    try {
      const res = await plantDemoApi.postAccept();
      acceptEpochRef.current += 1;
      syncAckPlanVersion(res.planVersion);
      setAccepted(true);
      setEventType(null);
      setExplanation(null);
      return res;
    } finally {
      setBusy(false);
    }
  }, [syncAckPlanVersion]);

  const planAcknowledged = isPlanAcknowledged(planVersion, ackPlanVersion);

  return {
    queue,
    eventType,
    explanation,
    accepted,
    planVersion,
    ackPlanVersion,
    planAcknowledged,
    loading,
    busy,
    acceptPlan,
    connectionMode: plantDemoApi.connectionMode,
  };
}
