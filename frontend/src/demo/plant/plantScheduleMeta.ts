/** Demo-only display fields for Gantt rows (Pasco POs). */
export type PlantScheduleMeta = {
  client: string;
  productCode: string;
  priority: 2 | 3 | 4;
};

export const PLANT_SCHEDULE_META: Record<string, PlantScheduleMeta> = {
  '1001759341': { client: 'Pacific Seeds', productCode: 'SWCO GSS2259P', priority: 3 },
  '1001884747': { client: 'Inland Grain', productCode: 'SWCO GH6055', priority: 3 },
  '1002307551': { client: 'Valley Co-op', productCode: 'SWCO GSS2259P', priority: 2 },
  '1001984402': { client: 'Horizon Ag', productCode: 'CORN G2H8821', priority: 4 },
  '1002011199': { client: 'Columbia Farms', productCode: 'SWCO GSS2281', priority: 3 },
  '1001887703': { client: 'Legacy contract', productCode: 'SWCO GSS2190', priority: 3 },
};
