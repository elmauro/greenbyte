/**
 * Conditioning lines the scheduler can open.
 * Only rows with a valid demo_line_id in gold.v_open_queue.
 * Sheet names are the Pasco workbook tabs (line_1_schedule.csv, line_2_schedule.csv).
 */
export const PLANT_LINES = [
  { id: 'line-1', workCenter: 'LSVLN1', sheet: 'Line 1 Schedule' },
  { id: 'line-2', workCenter: 'LSVLN2', sheet: 'Line 2 Schedule' },
] as const;

export type PlantLineId = (typeof PLANT_LINES)[number]['id'];

export function plantLineById(lineId: string | null | undefined) {
  return PLANT_LINES.find((line) => line.id === lineId) ?? PLANT_LINES[0];
}
