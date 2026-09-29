export type PlantEventType = 'rush' | 'qa_fail';

export type QueueRow = {
  po: string;
  species: string;
  kg: number;
  finish: string;
  status: 'PLANNED' | 'COMPLETE' | 'HOLD';
  atRisk?: boolean;
  reasonShort?: string;
  previousPosition?: number;
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

export type PlantQueueResponse = {
  lineId: string;
  queue: QueueRow[];
  planVersion: number;
};

export type PlantEventResponse = {
  lineId: string;
  eventType: PlantEventType;
  queue: QueueRow[];
  planVersion: number;
  diff: { moves: QueueMove[]; reasons: string[] };
  explanation: PlantExplanation;
};

export type PlantAcceptResponse = {
  acceptedAt: string;
  lineId: string;
  planVersion: number;
};
