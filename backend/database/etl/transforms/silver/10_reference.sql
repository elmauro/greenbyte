-- Silver reference: work_center -> equipment_alias -> species -> material (observations §9.3 steps 3).

-- work_center: resource_info.csv (31) + proposed LSVHANDPICK (Q-6)
INSERT INTO silver.work_center
    (work_center_code, work_center_name, department, line_type, seed_size, is_in_scope, source_csv, source_row_number)
SELECT silver.norm_code(work_center),
       btrim(pack_line),
       btrim(department),
       CASE
           WHEN department ~* 'treatpack' THEN 'TREATPACK'
           WHEN department ~* 'seed health' THEN 'SEED_HEALTH'
           WHEN department ~* 'treating' THEN 'TREATING'
           WHEN work_center ~* 'RPR' THEN 'REPAIR'
           WHEN work_center ~* 'GRVTY' THEN 'GRAVITY'
           WHEN work_center ~* 'CLSRT' THEN 'COLORSORT'
           ELSE 'LINE'
       END,
       CASE WHEN department ~* '^LSV' THEN 'LSV' WHEN department ~* '^SSV' THEN 'SSV' END,
       department ~* 'conditioning',
       'resource_info.csv',
       _source_row_number
FROM raw.resource_info
ORDER BY _source_row_number;

INSERT INTO silver.work_center
    (work_center_code, work_center_name, department, line_type, seed_size, is_in_scope, is_proposed)
VALUES ('LSVHANDPICK', 'LSV Handpick', 'LSV Conditioning', 'HANDPICK', 'LSV', true, true);

UPDATE silver.work_center SET demo_line_id = 'line-1' WHERE work_center_code = 'LSVLN1';
UPDATE silver.work_center SET demo_line_id = 'line-2' WHERE work_center_code = 'LSVLN2';

-- equipment_alias (R-EQUIP, observations §6.2). Aliases are stored upper case.
INSERT INTO silver.equipment_alias (source_csv, alias, work_center_id, is_confirmed)
SELECT a.source_csv, a.alias, wc.work_center_id, a.is_confirmed
FROM (VALUES
    ('*', 'LINE 1', 'LSVLN1', true),
    ('*', 'LINE 2', 'LSVLN2', true),
    ('*', 'GRAVITY', 'LSVGRVTY', true),
    ('*', 'LINE 1 GRAVITY', 'LSVGRVTY', true),
    ('*', 'LINE 2 GRAVITY', 'LSVGRVTY', true),
    ('*', 'COLORSORTER', 'LSVCLSRT', true),
    ('*', 'COLORSORTER LINE 1', 'LSVCLSRT', true),
    ('*', 'COLORSORTER LINE 2', 'LSVCLSRT', true),
    ('*', 'COLORSORTER(VMEK)', 'LSVCLSRT', false),
    ('*', 'VMEK', 'LSVCLSRT', false),
    ('*', 'HANDPICK', 'LSVHANDPICK', false),
    ('*', 'LINE 3(NORTH STAR)', 'SSVLN3', false),
    ('colorsort_schedule.csv', 'LINE 1', 'LSVCLSRT', true),
    ('colorsort_schedule.csv', 'LINE 2', 'LSVCLSRT', true),
    ('colorsort_schedule.csv', 'VMEK', 'LSVCLSRT', false),
    ('ssv_conditioning_logs.csv', 'LINE 3', 'SSVLN3', true),
    ('ssv_conditioning_logs.csv', 'LINE 5', 'SSVLN5', true),
    ('ssv_conditioning_logs.csv', 'LINE 6', 'SSVLN6', true),
    ('ssv_conditioning_logs.csv', 'LINE 7', 'SSVLN7', true)
) AS a (source_csv, alias, work_center_code, is_confirmed)
JOIN silver.work_center wc USING (work_center_code);

-- Resolve an Equipment ID for a given file: the file-specific alias wins over the generic one.
CREATE FUNCTION silver.resolve_work_center(p_source_csv text, p_equipment text) RETURNS bigint
LANGUAGE sql STABLE AS $$
    SELECT ea.work_center_id
    FROM silver.equipment_alias ea
    WHERE ea.alias = silver.norm_code(p_equipment) AND ea.source_csv IN (p_source_csv, '*')
    ORDER BY (ea.source_csv = '*')
    LIMIT 1
$$;

-- species: every Crop / Species / Specie / SWCO-SWBS value (R-SPECIES)
WITH seen AS (
    SELECT silver.norm_code(crop) AS code, 'LSV' AS hint FROM raw.excel_sap_data WHERE workcenter ~ '^LSV'
    UNION ALL SELECT silver.norm_code(crop), 'SSV' FROM raw.excel_sap_data WHERE workcenter !~ '^LSV'
    UNION ALL SELECT silver.norm_code(species), CASE WHEN work_center_code ~ '^LSV' THEN 'LSV' ELSE 'SSV' END FROM _stg_schedule
    UNION ALL SELECT silver.norm_code(species), CASE WHEN source_csv ~ '^lsv' THEN 'LSV' ELSE 'SSV' END FROM _stg_log
    UNION ALL SELECT silver.norm_code(specie), 'LSV' FROM raw.lsv_pass_fail_log
)
INSERT INTO silver.species (species_code, crop_code, seed_class, crop_name, seed_size)
SELECT code,
       CASE WHEN code = 'CAME' THEN 'CAME' ELSE left(code, 2) END,
       CASE WHEN code = 'CAME' THEN NULL ELSE right(code, 2) END,
       CASE WHEN code = 'CAME' THEN 'Camelina' ELSE
       CASE left(code, 2)
           WHEN 'SW' THEN 'Sweet corn' WHEN 'PE' THEN 'Pea' WHEN 'BE' THEN 'Bean' WHEN 'WA' THEN 'Watermelon'
           WHEN 'SQ' THEN 'Squash' WHEN 'CA' THEN 'Capsicum' WHEN 'TO' THEN 'Tomato' WHEN 'CU' THEN 'Cucumber'
           WHEN 'ME' THEN 'Melon' WHEN 'BR' THEN 'Broccoli' WHEN 'CF' THEN 'Cauliflower' WHEN 'WC' THEN 'Chinese cabbage'
       END END,
       CASE WHEN bool_or(hint = 'LSV') THEN 'LSV' ELSE 'SSV' END
FROM seen
WHERE code ~ '^[A-Z]{4}$'
GROUP BY code
ORDER BY code;

-- material: every Material Description (SAP + 7 schedules), keyed upper/trimmed/collapsed
WITH src AS (
    SELECT silver.material_key(material_description) AS mkey, silver.norm_code(crop) AS species_hint FROM raw.excel_sap_data
    UNION ALL
    SELECT silver.material_key(material_description), silver.norm_code(species) FROM _stg_schedule
), agg AS (
    SELECT mkey, mode() WITHIN GROUP (ORDER BY species_hint) AS species_hint
    FROM src WHERE mkey IS NOT NULL GROUP BY mkey
)
INSERT INTO silver.material
    (material_description, species_id, variety_code, type_code, state_code, uom_code, material_note, is_parsed, dq_flags)
SELECT a.mkey,
       coalesce(sp_parsed.species_id, sp_hint.species_id),
       p.variety_code, p.type_code, p.state_code, p.uom_code, p.material_note, p.is_parsed,
       CASE WHEN p.is_parsed THEN '{}'::text[] ELSE ARRAY['DQ-12'] END
FROM agg a
CROSS JOIN LATERAL silver.parse_material(a.mkey) p
LEFT JOIN silver.species sp_parsed ON sp_parsed.species_code = p.species_code
LEFT JOIN silver.species sp_hint ON sp_hint.species_code = a.species_hint
ORDER BY a.mkey;
