-- Append-only log of upstream signals that "land" after the extract (demo: operator ingest via BFF / Data API).
-- Lives in raw because it is source data: silver replays it on every build. Not touched by load_raw.py
-- (that loader only drops/recreates its registered CSV tables). Rows are never deleted: a demo reset voids them.

CREATE TABLE IF NOT EXISTS raw.ingest_event (
    ingest_event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_source    text        NOT NULL CHECK (event_source IN ('sap_priority_change', 'pass_fail_log')),
    line_id         text        NOT NULL,
    payload         jsonb       NOT NULL,
    idempotency_key text        UNIQUE,
    received_at     timestamptz NOT NULL DEFAULT clock_timestamp(),
    received_by     text        NOT NULL DEFAULT current_user,
    voided_at       timestamptz,
    void_reason     text
);

COMMENT ON TABLE raw.ingest_event IS
  'Upstream signals after the extract: SAP-style priority/finish change or a new LSV Pass_Fail Log row. Replayed into silver on every build; voided (not deleted) by gold.reset_demo';
COMMENT ON COLUMN raw.ingest_event.payload IS
  'Request body as received, e.g. {"po":"1002295402","priority":2,"scheduledFinish":"2026-10-03"} or {"po":"…","passFail":"Fail","failedFor":"Dent","equipmentId":"Line 1"}';
