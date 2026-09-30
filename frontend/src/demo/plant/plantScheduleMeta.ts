/** Demo-only display fields for Gantt rows (Pasco POs). */
export type PlantScheduleMeta = {
  client: string;
  productCode: string;
  priority: 2 | 3 | 4;
};

export const PLANT_SCHEDULE_META: Record<string, PlantScheduleMeta> = {
  '1001759341': { client: 'Pacific Seeds', productCode: 'SWCO GSS2259P', priority: 3 },
  '1001884747': { client: 'Inland Grain', productCode: 'SWCO GH6055', priority: 3 },
  '1002307551': { client: 'Valley Co-op', productCode: 'SWCO OVERLAND CLX', priority: 2 },
  '1001887703': { client: 'Legacy contract', productCode: 'SWCO GSS2190', priority: 3 },
  '1002266913': { client: 'Columbia Pea', productCode: 'PECO IDALGO PEA', priority: 4 },
  '1002267630': { client: 'Columbia Pea', productCode: 'PECO IDALGO PEA', priority: 2 },
  '1002174855': { client: 'Northwest Hybrids', productCode: 'SWCO GSS3951 CLX', priority: 2 },
  '1002181889': { client: 'Northwest Hybrids', productCode: 'SWCO GH6055 CLX', priority: 4 },
  '1002307552': { client: 'Valley Co-op', productCode: 'SWCO GH4927-C', priority: 3 },
  '1002295415': { client: 'Horizon Ag', productCode: 'SWCO P&C EARLY', priority: 3 },
};
