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
import {
  explainPoFromQueue,
  orderPoFromExplanation,
  primaryPoFromPending,
  scrubPlaceholderOrder,
  shouldSurfacePendingNotice,
} from '../demo/plant/plantEventUtils';
import { PLANT_DEMO_LINE_ID } from '../demo/plant/plantDemoServer';
import type { PlantPlanDiff } from '../demo/plant/plantDemoTypes';
import type { Locale } from '../i18n/LocaleContext';
import { getApiConnectionMode } from '../services/apiConfig';
import { applyManualOrder, readManualOrder, rememberManualOrder } from '../demo/plant/plantManualOrder';
import { plantDemoApi } from '../services/plantDemoApi';

function explanationFromQueue(value: PlantExplanation | null | undefined): PlantExplanation | null {
  if (!value) return null;
  const lines = [value.alertBanner, value.summary, ...(value.bullets ?? [])];
  const hasText = lines.some((line) => typeof line === 'string' && line.trim().length > 0);
  return hasText ? value : null;
}

export function usePlantDemoQueue(locale: Locale, lineId: string = PLANT_DEMO_LINE_ID) {
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [eventType, setEventType] = useState<PlantEventType | null>(null);
  const [explanation, setExplanation] = useState<PlantExplanation | null>(null);
  const [pendingDiff, setPendingDiff] = useState<PlantPlanDiff | null>(null);
  const [eventHighlightPo, setEventHighlightPo] = useState<string | undefined>(undefined);
  const [accepted, setAccepted] = useState(false);
  const [acceptNoticeLine, setAcceptNoticeLine] = useState<string | null>(null);
  const [planVersion, setPlanVersion] = useState(1);
  const [ackPlanVersion, setAckPlanVersion] = useState<number | null>(() => readAckPlanVersion(lineId));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const acceptedPlanVersionRef = useRef<number | null>(readAckPlanVersion(lineId));
  const acceptEpochRef = useRef(0);
  const shellReadyRef = useRef(false);
  const lineIdRef = useRef(lineId);
  lineIdRef.current = lineId;
  const connectionMode = getApiConnectionMode();
  const pollsRemoteQueue = connectionMode === 'bff' || connectionMode === 'msw';

  const syncAckPlanVersion = useCallback((version: number | null) => {
    acceptedPlanVersionRef.current = version;
    setAckPlanVersion(version);
    writeAckPlanVersion(lineId, version);
  }, [lineId]);

  const planVersionRef = useRef(1);

  const queueForSnapshot = useCallback(
    (res: PlantQueueResponse) => {
      const manual = readManualOrder(lineIdRef.current, res.planVersion);
      return manual ? applyManualOrder(res.queue, manual, locale) : res.queue;
    },
    [locale],
  );

  const applyQueueSnapshot = useCallback(
    (res: PlantQueueResponse) => {
      planVersionRef.current = res.planVersion;
      setQueue(queueForSnapshot(res));
      setPlanVersion(res.planVersion);

      if (res.lastEvent) {
        const diff = res.pendingDiff ?? null;
        const pendingExplanation = explanationFromQueue(res.pendingExplanation);
        if (shouldSurfacePendingNotice(pendingExplanation, diff, res.queue)) {
          syncAckPlanVersion(null);
          setEventType(res.lastEvent);
          setPendingDiff(diff);
          const orderPo = explainPoFromQueue(diff, res.queue) ?? orderPoFromExplanation(pendingExplanation);
          setExplanation(
            pendingExplanation ? scrubPlaceholderOrder(pendingExplanation, orderPo, locale) : null,
          );
          setEventHighlightPo(primaryPoFromPending(res.lastEvent, diff, res.queue));
          setAccepted(false);
          return;
        }
      }

      setEventType(null);
      setExplanation(null);
      setPendingDiff(null);
      setEventHighlightPo(undefined);

      const mergedAck = mergeAckPlanVersion(acceptedPlanVersionRef.current, res.acceptedPlanVersion);
      if (mergedAck !== acceptedPlanVersionRef.current) {
        syncAckPlanVersion(mergedAck);
      }

      if (res.planVersion <= 1 && res.acceptedPlanVersion == null) {
        syncAckPlanVersion(null);
        setEventType(null);
        setExplanation(null);
        setPendingDiff(null);
        setEventHighlightPo(undefined);
        setAccepted(false);
        return;
      }

      if (isPlanAcknowledged(res.planVersion, mergedAck) || res.acceptedPlanVersion != null) {
        setEventType(null);
        setExplanation(null);
        setPendingDiff(null);
        setEventHighlightPo(undefined);
        setAccepted(true);
      }
    },
    [locale, queueForSnapshot, syncAckPlanVersion],
  );

  const setManualOrder = useCallback(
    (order: string[]) => {
      const version = planVersionRef.current;
      const requestedLineId = lineIdRef.current;
      setQueue((current) => {
        const record = rememberManualOrder(requestedLineId, version, current, order);
        return applyManualOrder(current, record, locale);
      });
    },
    [locale],
  );

  const loadQueue = useCallback(async () => {
    const requestedLineId = lineId;
    setLoadError(false);
    const storedAck = readAckPlanVersion(requestedLineId);
    acceptedPlanVersionRef.current = storedAck;
    setAckPlanVersion(storedAck);
    if (shellReadyRef.current) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await plantDemoApi.getQueue(requestedLineId, locale);
      if (lineIdRef.current !== requestedLineId) return;
      applyQueueSnapshot(res);
      shellReadyRef.current = true;
    } catch {
      if (lineIdRef.current !== requestedLineId) return;
      setQueue([]);
      setLoadError(true);
    } finally {
      if (lineIdRef.current === requestedLineId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [applyQueueSnapshot, lineId, locale]);

  const pollQueue = useCallback(async () => {
    if (!pollsRemoteQueue || busy) return;
    const epochAtStart = acceptEpochRef.current;
    const requestedLineId = lineId;
    try {
      const res = await plantDemoApi.getQueue(requestedLineId, locale);
      if (epochAtStart !== acceptEpochRef.current) return;
      if (lineIdRef.current !== requestedLineId) return;
      applyQueueSnapshot(res);
    } catch {
      /* ignore transient poll errors */
    }
  }, [applyQueueSnapshot, busy, lineId, locale, pollsRemoteQueue]);

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
      const res = await plantDemoApi.postAccept(lineId);
      acceptEpochRef.current += 1;
      syncAckPlanVersion(res.planVersion);
      setAccepted(true);
      setAcceptNoticeLine(lineId);
      setEventType(null);
      setExplanation(null);
      setPendingDiff(null);
      setEventHighlightPo(undefined);
      return res;
    } finally {
      setBusy(false);
    }
  }, [lineId, syncAckPlanVersion]);

  const planAcknowledged = isPlanAcknowledged(planVersion, ackPlanVersion);

  return {
    queue,
    eventType,
    explanation,
    pendingDiff,
    eventHighlightPo,
    accepted,
    acceptNotice: acceptNoticeLine === lineId,
    planVersion,
    ackPlanVersion,
    planAcknowledged,
    loading,
    refreshing,
    loadError,
    busy,
    acceptPlan,
    setManualOrder,
    connectionMode: plantDemoApi.connectionMode,
  };
}
