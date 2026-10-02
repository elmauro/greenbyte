import { useEffect, useRef, useState } from 'react';
import type { PlantExplanation, QueueRow } from '../../demo/plant/plantDemoTypes';
import { useLocale } from '../../i18n';
import { PlantCopilotThread } from './PlantCopilotThread';
import { PlantCopilotWowPanel } from './PlantCopilotWowPanel';

const OPEN_KEY = 'greenbyte-schedule-copilot-open-v1';

type PlantScheduleCopilotProps = {
  explanation: PlantExplanation | null;
};

const CHAT_OPEN_KEY = 'greenbyte-schedule-copilot-chat-open-v1';

type PlantCopilotChatDockProps = {
  queue: QueueRow[];
  lineId?: string;
  focusPo?: string;
  onFocusPo?: (po: string) => void;
  onQueueRefresh?: () => void | Promise<void>;
  /** Increments when a queue note asks the dock to open on focusPo. */
  openToken?: number;
  /** Lift the dock above the mobile accept bar. Desktop stays in the viewport corner. */
  raised?: boolean;
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

/** What changed, beside the program timeline. Questions live in the corner chat. */
export function PlantScheduleCopilot({ explanation }: PlantScheduleCopilotProps) {
  const { messages: m } = useLocale();
  const copy = m.plantMvp;
  const shell = copy.scheduleShell;
  const [open, setOpen] = useState(readOpen);
  const pendingRef = useRef(Boolean(explanation));

  function persist(next: boolean) {
    setOpen(next);
    storeOpen(next);
  }

  useEffect(() => {
    const pending = Boolean(explanation);
    if (pending && !pendingRef.current) persist(true);
    pendingRef.current = pending;
  }, [explanation]);

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
      className="flex max-h-[min(40rem,72vh)] w-full min-h-0 shrink-0 flex-col overflow-hidden border-t border-gray-200 bg-gray-50/50 lg:w-80 lg:border-l lg:border-t-0"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PlantCopilotWowPanel
          explanation={explanation}
          bare
          idleText={copy.copilotIdleHere}
          headerAction={
            <button
              type="button"
              aria-expanded
              aria-label={shell.hideCopilot}
              title={shell.hideCopilot}
              onClick={() => persist(false)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-white hover:text-gray-900"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1.75" />
                <path strokeWidth="1.75" d="M15 4v16" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M8 9.5 11.5 12 8 14.5" />
              </svg>
            </button>
          }
        />
      </div>
    </aside>
  );
}

function readChatOpen(): boolean {
  try {
    return sessionStorage.getItem(CHAT_OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

function storeChatOpen(open: boolean) {
  try {
    sessionStorage.setItem(CHAT_OPEN_KEY, open ? '1' : '0');
  } catch {
    /* session storage can be blocked; the control still works for this view */
  }
}

/** Question chat for the selected order, docked at the bottom-right of the page. */
export function PlantCopilotChatDock({
  queue,
  lineId,
  focusPo,
  onFocusPo,
  onQueueRefresh,
  openToken = 0,
  raised = false,
}: PlantCopilotChatDockProps) {
  const { messages: m } = useLocale();
  const copy = m.plantMvp.salesChat;
  const shell = m.plantMvp.scheduleShell;
  const [open, setOpen] = useState(readChatOpen);
  const dockRef = useRef<HTMLDivElement>(null);

  function persist(next: boolean) {
    setOpen(next);
    storeChatOpen(next);
  }

  useEffect(() => {
    if (openToken > 0) persist(true);
  }, [openToken]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-copilot-launcher]')) return;
      if (!dockRef.current?.contains(target as Node)) persist(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const dock = raised
    ? 'bottom-36 right-4 lg:bottom-6 lg:right-6'
    : 'bottom-20 right-4 lg:bottom-6 lg:right-6';

  return (
    <div ref={dockRef} className={`fixed z-[45] flex flex-col items-end ${dock}`}>
      {open && (
        <section
          data-copilot-chat="open"
          className="mb-3 flex h-[min(28rem,calc(100dvh-11rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        >
          <div className="shrink-0 border-b border-gray-100 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <span className="text-brand-green" aria-hidden>
                ✦
              </span>
              {copy.copilotLabel}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              {focusPo ?? shell.selectRowHint}
            </p>
          </div>
          <PlantCopilotThread
            queue={queue}
            lineId={lineId}
            focusPo={focusPo}
            onPoChange={onFocusPo}
            onQueueRefresh={onQueueRefresh}
            focusToken={openToken}
          />
        </section>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? shell.hideCopilot : copy.inputPlaceholder}
        onClick={() => persist(!open)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-green text-xl text-white shadow-lg hover:bg-brand-green-dark"
      >
        <span aria-hidden>{open ? '×' : '✦'}</span>
      </button>
    </div>
  );
}
