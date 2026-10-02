-- Durable curation input for the gold semantic engine (gold model v4, etl/gold-model/gold-data-model.md §3.2, D-01).
-- Lives in raw because silver and gold are dropped on every build: these rows are what a reader (rules, Bedrock)
-- or a person said about a free-text note, so they must survive the rebuild and be replayed into gold.
-- Append-only. Keyed by stable values only (note_hash, po_number): never a silver or gold surrogate id.
-- Not touched by load_raw.py (that loader only drops/recreates its registered CSV tables).

CREATE TABLE IF NOT EXISTS raw.note_reading (
    note_reading_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    note_hash       char(64)    NOT NULL,
    note_text       text        NOT NULL,
    reader          text        NOT NULL CHECK (reader IN ('RULE', 'BEDROCK', 'HUMAN')),
    model_id        text        NOT NULL,
    prompt_version  text        NOT NULL,
    facts           jsonb       NOT NULL CHECK (jsonb_typeof(facts) = 'array'),
    read_at         timestamptz NOT NULL DEFAULT clock_timestamp(),
    read_by         text        NOT NULL DEFAULT current_user,
    UNIQUE (note_hash, reader, model_id, prompt_version)
);
COMMENT ON TABLE raw.note_reading IS
  'One reading of one distinct free-text note by one reader version (RULE rules-v1, BEDROCK, HUMAN). facts = typed facts as returned ([] = read, nothing found). A second reading with the same key is a no-op';
COMMENT ON COLUMN raw.note_reading.note_hash IS
  'sha256 hex of upper(btrim(collapsed spaces(note_text))) — gold.note_hash(); joins every occurrence of the same text';

CREATE TABLE IF NOT EXISTS raw.note_review (
    note_review_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    note_hash      char(64)    NOT NULL,
    po_number      text,
    fact_type      text        NOT NULL CHECK (fact_type IN ('NOT_READY', 'HOLD', 'RELEASE', 'RUSH', 'DEADLINE', 'INFO')),
    decision       text        NOT NULL CHECK (decision IN ('CONFIRMED', 'REJECTED')),
    comment        text,
    reviewed_by    text        NOT NULL DEFAULT current_user,
    reviewed_at    timestamptz NOT NULL DEFAULT clock_timestamp(),
    voided_at      timestamptz,
    void_reason    text
);
CREATE INDEX IF NOT EXISTS note_review_hash_ix ON raw.note_review (note_hash, fact_type);
COMMENT ON TABLE raw.note_review IS
  'Human confirm/reject of a fact read from a note. Append-only: the latest non-voided row per (note_hash, po_number, fact_type) wins; po_number NULL = every occurrence of the text. Voided (not deleted) by gold.reset_demo';
