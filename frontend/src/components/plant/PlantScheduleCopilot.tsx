import { useEffect, useRef, useState } from 'react';
import type { PlantExplanation, QueueRow } from '../../demo/plant/plantDemoTypes';
import { useLocale } from '../../i18n';
import { PlantCopilotThread } from './PlantCopilotThread';
import { PlantCopilotWowPanel } from './PlantCopilotWowPanel';

const OPEN_KEY = 'greenbyte-schedule-copilot-open-v1';

type PlantScheduleCopilotProps = {
  explanation: PlantExplanation | null;
  queue: QueueRow[];
  focusPo?: string;
  onFocusPo?: (po: string) => void;
  /** Increments when the scheduler picks an order, including the one already shown. */
  openRequest?: number;
};

function readOpen(): boolean {
  try {
    return sessionStorage.getItem(OPEN_KEY) !== '0';
  } catch {
    return true;
  }
}

function storeOpen(open: boolean) {
  try {
    sessionStorage.setItem(OPEN_KEY, open ? '1' : '0');
  } catch {
    /* session storage can be blocked; the control still works for this view */
  }
}

/** Copilot beside the program timeline: plan change on top, one selected order below. */
export function PlantScheduleCopilot({
  explanation,
  queue,
  focusPo,
  onFocusPo,
  openRequest = 0,
}: PlantScheduleCopilotProps) {
  const { messages: m } = useLocale();
  const copy = m.plantMvp;
  const shell = copy.scheduleShell;
  const [open, setOpen] = useState(readOpen);
  const pendingRef = useRef(Boolean(explanation));
  const requestRef = useRef(openRequest);

  function persist(next: boolean) {
    setOpen(next);
    storeOpen(next);
  }

  useEffect(() => {
    const pending = Boolean(explanation);
    if (pending && !pendingRef.current) persist(true);
    pendingRef.current = pending;
  }, [explanation]);

  useEffect(() => {
    if (openRequest === requestRef.current) return;
    requestRef.current = openRequest;
    if (openRequest > 0) persist(true);
  }, [openRequest]);

  if (!open) {
    return (
      <aside
        data-copilot-open="false"
        className="flex w-full shrink-0 border-t border-gray-200 bg-gray-50/50 lg:w-11 lg:flex-col lg:border-l lg:border-t-0"
      >
        <button
          type="button"
          aria-expanded={false}
          aria-label={shell.showCopilot}
          title={shell.showCopilot}
          onClick={() => persist(true)}
          className="flex w-full items-center justify-center gap-2 px-3 py-3 text-brand-green hover:bg-white lg:flex-1 lg:flex-col lg:gap-3 lg:px-0 lg:py-4"
        >
          <span aria-hidden>✦</span>
          {explanation && <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />}
          <span className="text-xs font-semibold text-gray-700 lg:sr-only">{shell.showCopilot}</span>
          <span className="text-gray-400" aria-hidden>
            ‹
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      data-copilot-open="true"
      className="flex h-[min(32rem,70vh)] w-full min-h-0 shrink-0 flex-col overflow-hidden border-t border-gray-200 bg-gray-50/50 lg:h-[min(40rem,72vh)] lg:w-80 lg:border-l lg:border-t-0"
    >
      <div className="shrink-0">
        <PlantCopilotWowPanel
          explanation={explanation}
          bare
          dense
          idleText={copy.copilotIdleHere}
          headerAction={
            <button
              type="button"
              aria-expanded
              aria-label={shell.hideCopilot}
              title={shell.hideCopilot}
              onClick={() => persist(false)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-base text-gray-400 hover:bg-white hover:text-gray-700"
            >
              ›
            </button>
          }
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col border-t border-gray-200 bg-white">
        {focusPo ? (
          <PlantCopilotThread queue={queue} focusPo={focusPo} onPoChange={onFocusPo} />
        ) : (
          <div className="px-4 py-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{shell.thisOrder}</h4>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{shell.selectRowHint}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
