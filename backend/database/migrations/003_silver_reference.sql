-- Silver reference (master) data. Key standard (uc1-data-model §5.2):
--   PK <table>_id bigint identity · business key UNIQUE · FKs named after the referenced PK.

CREATE TABLE silver.work_center (
    work_center_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_center_code  text    NOT NULL UNIQUE,
    work_center_name  text,
    department        text,
    line_type         text    NOT NULL CHECK (line_type IN
                        ('LINE', 'GRAVITY', 'COLORSORT', 'HANDPICK', 'REPAIR', 'SEED_HEALTH', 'TREATPACK', 'TREATING')),
    seed_size         text    CHECK (seed_size IN ('LSV', 'SSV')),
    is_in_scope       boolean NOT NULL,
    is_proposed       boolean NOT NULL DEFAULT false,
    demo_line_id      text    UNIQUE,
    source_csv        text,
    source_row_number int
);
COMMENT ON TABLE silver.work_center IS 'Work-center master from resource_info.csv (31) + proposed LSVHANDPICK (Q-6)';
COMMENT ON COLUMN silver.work_center.demo_line_id IS 'lineId used by the BFF contract (line-1 = LSVLN1)';
COMMENT ON COLUMN silver.work_center.is_in_scope IS 'Conditioning work centers (UC1 scope); treat/pack, seed health and treating are out of scope';

CREATE TABLE silver.equipment_alias (
    equipment_alias_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_csv         text    NOT NULL DEFAULT '*',
    alias              text    NOT NULL,
    work_center_id     bigint  NOT NULL REFERENCES silver.work_center,
    is_confirmed       boolean NOT NULL,
    UNIQUE (source_csv, alias)
);
COMMENT ON TABLE silver.equipment_alias IS
  'R-EQUIP: Equipment ID spelling (upper case) -> work center. source_csv ''*'' = any file; a file-specific row wins';

CREATE TABLE silver.species (
    species_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    species_code text NOT NULL UNIQUE CHECK (species_code ~ '^[A-Z]{4}$'),
    crop_code    text,
    seed_class   text,
    crop_name    text,
    seed_size    text CHECK (seed_size IN ('LSV', 'SSV'))
);
COMMENT ON TABLE silver.species IS 'Species codes seen in any Crop/Species column (upper case). seed_class = last 2 letters (CO commercial, BS basic/stock, …)';

CREATE TABLE silver.material (
    material_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    material_description text    NOT NULL UNIQUE,
    species_id           bigint  REFERENCES silver.species,
    variety_code         text,
    type_code            text,
    state_code           text,
    uom_code             text    CHECK (uom_code IN ('KG', 'KS')),
    material_note        text,
    is_parsed            boolean NOT NULL,
    dq_flags             text[]  NOT NULL DEFAULT '{}'
);
COMMENT ON TABLE silver.material IS
  'Material master. Business key = description upper-cased, trimmed, spaces collapsed. Parsed per observations §6.4; is_parsed=false -> DQ-12';
