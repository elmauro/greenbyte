-- UC1 medallion layers.
--   raw    = bronze: verbatim CSV copies (etl/load_raw.py) + raw.ingest_event (upstream signals). Never rebuilt here.
--   silver = typed, conformed entities built from raw. Fully derived: dropped and rebuilt on every build.
--   gold   = use-case serving layer (views, plans, reasons, API functions). Fully derived: rebuilt on every build,
--            then the plans are regenerated (baseline + replay of raw.ingest_event).
-- See backend/data-model/uc1-data-model.md §5.

CREATE SCHEMA IF NOT EXISTS raw;

DROP SCHEMA IF EXISTS gold CASCADE;
DROP SCHEMA IF EXISTS silver CASCADE;

CREATE SCHEMA silver;
COMMENT ON SCHEMA silver IS 'UC1 silver: typed, conformed Pasco entities built from raw (rebuilt by etl/build_model.py)';

CREATE SCHEMA gold;
COMMENT ON SCHEMA gold IS 'UC1 gold: serving layer for the Data API — queue, capacity, risk, versioned plans, reasons (rebuilt by etl/build_model.py)';
