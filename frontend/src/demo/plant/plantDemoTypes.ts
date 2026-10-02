export type PlantEventType = 'rush' | 'qa_fail';

export type QueueRow = {
  po: string;
  species: string;
  kg: number;
  finish: string;
  /** Planned start from the schedule entry, when the plan has one. */
  start?: string;
  status: 'PLANNED' | 'COMPLETE' | 'HOLD' | 'PENDING';
  atRisk?: boolean;
  reasonShort?: string;
  /** Bedrock comment for this order from the planner run (planner-v2 plans only). */
  aiNote?: string;
  /** Set when the plan tagged this order as a rush. Priority wins over a note. */
  rush?: 'priority' | 'note';
  previousPosition?: number;
  /** Demo proxy for Syngenta open customer orders (ETL later). */
  customerOrderId?: string;
};

export type QueueMove = {
  po: string;
  fromPosition: number;
  toPosition: number;
};

export type PlantExplanation = {
  alertBanner: string;
  summary: string;
  bullets: string[];
  impact?: string;
};

export type PlantPlanDiff = {
  moves: QueueMove[];
  reasons: string[];
  /** POs newly placed on HOLD by this plan. */
  held?: string[];
  /** POs that were not on the previous plan. */
  added?: string[];
  removed?: string[];
};

export type PlantQueueResponse = {
  lineId: string;
  queue: QueueRow[];
  planVersion: number;
  /** Set when plan was changed by rush/QA (BFF reads from Dynamo). */
  lastEvent?: PlantEventType | null;
  /** Plan version the planner accepted (BFF); pending events are hidden when planVersion matches. */
  acceptedPlanVersion?: number | null;
  /** Agent explanation for pending replan (GET queue while lastEvent is set). */
  pendingExplanation?: PlantExplanation | null;
  /** Data/Agent plan diff for pending replan — drives Gantt highlight and queue badges. */
  pendingDiff?: PlantPlanDiff | null;
};

export type PlantEventResponse = {
  lineId: string;
  eventType: PlantEventType;
  queue: QueueRow[];
  planVersion: number;
  diff: PlantPlanDiff;
  explanation: PlantExplanation;
  /** Where the replan was triggered (ingest routes set this). */
  source?: string;
};

export type PlantAcceptResponse = {
  acceptedAt: string;
  lineId: string;
  planVersion: number;
};

/** Operator / Data API — SAP-style priority signal (demo primary trigger for rush). */
export type PlantIngestSapPriorityRequest = {
  lineId?: string;
  locale?: 'en' | 'es';
  po?: string;
  priority?: number;
  scheduledFinish?: string;
  /** Copilot instruction. Marks the change as rush even when the rank does not drop. */
  rush?: boolean;
};

/** Operator / Data API — LSV pass/fail log row (demo primary trigger for QA fail). */
/** SAP COISPI refresh — new or promoted active PO (Syngenta surprise rush). */
export type PlantIngestSapQueueRefreshRequest = {
  lineId?: string;
  locale?: 'en' | 'es';
  po: string;
  species?: string;
  kg?: number;
  finish?: string;
  scheduledFinish?: string;
  priority?: number;
  customerOrderId?: string;
};

export type PlantIngestPassFailRequest = {
  lineId?: string;
  locale?: 'en' | 'es';
  po?: string;
  passFail: 'Fail';
  failedFor?: string;
  equipmentId?: string;
};

/** Legacy — prefer ingest routes; not used from scheduler UI. */
export type PlantLegacyEventRequest = {
  type: PlantEventType;
  lineId?: string;
  locale?: 'en' | 'es';
};

/** Syngenta UC1 nice-to-have: sales / CS “explain my batch” (grounded in queue facts). */
export type PlantBatchExplainResponse = {
  po: string;
  answer: string;
  citations: string[];
  suggestedFollowUps?: string[];
  /** rush posts a priority change. qa_fail posts the pass/fail log. ask_fail_reason only asks which reason. */
  action?: 'rush' | 'qa_fail' | 'ask_fail_reason';
  failedFor?: string;
};
