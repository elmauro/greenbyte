import { useEffect, useState } from 'react';
import type { PlantEventType } from '../demo/plant/plantDemoTypes';
import { PLANT_LINES } from '../demo/plant/plantLines';
import type { Locale } from '../i18n/LocaleContext';
import { plantDemoApi } from '../services/plantDemoApi';

export type LineScheduleNotice = {
  lineId: string;
  eventType: PlantEventType;
  summary?: string;
};

/** Pending schedule changes on every conditioning line, not only the one on screen. */
export function usePlantLineNotices(enabled: boolean, locale: Locale): LineScheduleNotice[] {
  const [notices, setNotices] = useState<LineScheduleNotice[]>([]);

  useEffect(() => {
    if (!enabled) {
      setNotices([]);
      return;
    }
    let cancelled = false;

    async function load() {
      const rows = await Promise.all(
        PLANT_LINES.map(async (line) => {
          try {
            const res = await plantDemoApi.getQueue(line.id, locale);
            if (!res.lastEvent) return null;
            const notice: LineScheduleNotice = {
              lineId: line.id,
              eventType: res.lastEvent,
              summary: res.pendingExplanation?.summary,
            };
            return notice;
          } catch {
            return null;
          }
        }),
      );
      if (!cancelled) {
        setNotices(rows.filter((row): row is LineScheduleNotice => row != null));
      }
    }

    void load();
    const id = window.setInterval(() => void load(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, locale]);

  return notices;
}
