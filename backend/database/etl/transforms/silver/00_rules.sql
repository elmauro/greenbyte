-- Standardization rules (observations.md §5.3, §6) as reusable SQL functions.
-- raw never changes a value; every interpretation happens here, visibly and testably.

-- Date the Pasco extract reflects: "open" POs finishing before it are overdue (DQ-15, the at-risk signal).
CREATE FUNCTION silver.extract_as_of() RETURNS date
LANGUAGE sql IMMUTABLE AS $$ SELECT date '2026-09-28' $$;

-- R-DATE-SHIFT (GREENBYTE-017 data tweak, observations.md §6.1): the demo runs live on demo day, after the extract date.
-- The demo clock (gold.config as_of_date / plan_start_at) starts at demo_as_of(), and the forward-looking commitment
-- dates (schedule finish, original finish, SAP finish) move demo_date_shift_days() forward in silver, so a few
-- orders stay tight against the new clock. raw keeps the source values. History dates (run_date, test_date) are not
-- shifted, and DQ-15 keeps measuring the source SAP finish against extract_as_of().
CREATE FUNCTION silver.demo_as_of() RETURNS date
LANGUAGE sql IMMUTABLE AS $$ SELECT date '2026-10-02' $$;

CREATE FUNCTION silver.demo_date_shift_days() RETURNS int
LANGUAGE sql IMMUTABLE AS $$ SELECT 7 $$;

-- R-TEXT for codes: trim, collapse inner whitespace, upper case. Empty -> NULL.
CREATE FUNCTION silver.norm_code(v text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT nullif(upper(regexp_replace(btrim(v), '\s+', ' ', 'g')), '')
$$;

-- R-NUM: numeric or NULL. Error text, NA/None/-, malformed numbers (14..5, ..42) -> NULL. Never guess.
CREATE FUNCTION silver.to_num(v text) RETURNS numeric
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE WHEN btrim(v) ~ '^-?([0-9]+(\.[0-9]+)?|\.[0-9]+)([eE][-+]?[0-9]+)?$' THEN btrim(v)::numeric END
$$;

-- True when a non-empty value is not a number (feeds DQ-02 / DQ-10).
CREATE FUNCTION silver.is_bad_num(v text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
    SELECT nullif(btrim(v), '') IS NOT NULL AND silver.to_num(v) IS NULL
$$;

-- R-DATE: source dates are YYYY-MM-DD with no time part.
CREATE FUNCTION silver.to_date(v text) RETURNS date
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE WHEN btrim(v) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN btrim(v)::date END
$$;

-- R-DATE-SHIFT: a commitment date (finish / SAP finish) as the demo sees it = source date + demo_date_shift_days().
CREATE FUNCTION silver.to_commit_date(v text) RETURNS date
LANGUAGE sql IMMUTABLE AS $$ SELECT silver.to_date(v) + silver.demo_date_shift_days() $$;

-- R-PO ------------------------------------------------------------------------------------------
-- Valid patterns: 100/240 + 7 digits (10), 300/120 + 6 digits (9), 10002 + 4 digits (9-digit Seed Health).
CREATE FUNCTION silver.is_po_pattern(v text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
    SELECT v ~ '^(100|240)[0-9]{7}$' OR v ~ '^(300|120)[0-9]{6}$' OR v ~ '^10002[0-9]{4}$'
$$;

CREATE TYPE silver.po_parse AS (po_number text, po_number_status text, lot_number text);

-- VALID | NORMALIZED (leading zero stripped) | NOT_A_PO (150/151 lot number) | PLACEHOLDER | SUSPECT | MISSING
CREATE FUNCTION silver.norm_po(v text) RETURNS silver.po_parse
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    t text := btrim(v);
    s text;
BEGIN
    IF t IS NULL OR t = '' THEN
        RETURN ROW(NULL, 'MISSING', NULL)::silver.po_parse;
    END IF;
    IF upper(t) ~ '^OFF[ -]?SYSTEM$' OR upper(t) ~ '^BAYER ?[0-9]+$' THEN
        RETURN ROW(NULL, 'PLACEHOLDER', NULL)::silver.po_parse;
    END IF;
    s := CASE WHEN t ~ '^0[0-9]+$' THEN ltrim(t, '0') ELSE t END;
    IF silver.is_po_pattern(s) THEN
        RETURN ROW(s, CASE WHEN s = t THEN 'VALID' ELSE 'NORMALIZED' END, NULL)::silver.po_parse;
    END IF;
    IF s ~ '^15[01][0-9]{6}$' THEN
        RETURN ROW(NULL, 'NOT_A_PO', s)::silver.po_parse;
    END IF;
    RETURN ROW(NULL, 'SUSPECT', NULL)::silver.po_parse;
END
$$;

CREATE FUNCTION silver.po_type(po text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN po ~ '^100[0-9]{7}$' THEN 'PRODUCTION'
        WHEN po ~ '^240' THEN 'REWORK'
        WHEN po ~ '^300' THEN 'REPAIR'
        WHEN po ~ '^10002[0-9]{4}$' THEN 'SEED_HEALTH'
        ELSE 'OTHER'
    END
$$;

-- DQ codes implied by a PO outcome.
CREATE FUNCTION silver.po_dq(status text) RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE status
        WHEN 'SUSPECT'     THEN ARRAY['DQ-03']
        WHEN 'PLACEHOLDER' THEN ARRAY['DQ-04']
        WHEN 'NORMALIZED'  THEN ARRAY['DQ-07']
        WHEN 'NOT_A_PO'    THEN ARRAY['DQ-08']
        ELSE '{}'::text[]
    END
$$;

-- R-STATUS ---------------------------------------------------------------------------------------
CREATE FUNCTION silver.status_code(v text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN silver.norm_code(v) IN ('NEW', 'RELEASED', 'STAGED', 'LAB', 'COMPLETE') THEN silver.norm_code(v)
        WHEN silver.norm_code(v) LIKE 'ONLINE%' THEN 'ONLINE'
        WHEN silver.norm_code(v) IN ('HOLD', 'ON HOLD') THEN 'ON_HOLD'
    END
$$;

CREATE FUNCTION silver.status_note(v text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN silver.norm_code(v) LIKE 'ONLINE%' AND silver.norm_code(v) <> 'ONLINE'
            THEN nullif(btrim(regexp_replace(silver.norm_code(v), '^ONLINE[ -]*', '')), '')
    END
$$;

-- R-PRIORITY / run order: integers -> rank, any text -> note verbatim.
CREATE FUNCTION silver.to_rank(v text) RETURNS smallint
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE WHEN btrim(v) ~ '^[0-9]{1,4}$' THEN btrim(v)::smallint END
$$;

CREATE FUNCTION silver.rank_note(v text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE WHEN nullif(btrim(v), '') IS NOT NULL AND silver.to_rank(v) IS NULL THEN btrim(v) END
$$;

-- R-TRAIT
CREATE FUNCTION silver.trait_code(v text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE silver.norm_code(v)
        WHEN 'EXCELIS' THEN 'EXCELIS' WHEN 'GMO' THEN 'GMO' WHEN 'FRESH' THEN 'FRESH' ELSE 'NONE'
    END
$$;

-- R-SIZE: upper case, hyphen removed; anything outside the code list -> NULL (DQ-11, raw value kept).
CREATE FUNCTION silver.size_code(v text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE WHEN replace(silver.norm_code(v), '-', '') IN
        ('LR', 'LF', 'MR', 'MF', 'L', 'M', 'R', 'F', 'S', 'U', 'UN', 'US',
         'LRH', 'LRL', 'LFH', 'LFL', 'MRH', 'MRL', 'MFH', 'MFL', 'RH', 'RL', 'UH', 'UL')
        THEN replace(silver.norm_code(v), '-', '') END
$$;

-- R-FAIL
CREATE FUNCTION silver.fail_code(v text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE replace(silver.norm_code(v), '-', '')
        WHEN 'COB' THEN 'COB' WHEN 'DENT' THEN 'DENT' WHEN 'DISCOLORED' THEN 'DISCOLORED'
        WHEN 'OFFTYPE' THEN 'OFF_TYPE' WHEN 'BROKEN' THEN 'BROKEN' WHEN 'SMUT' THEN 'SMUT'
        WHEN 'WEED' THEN 'WEED' WHEN 'INERT' THEN 'INERT' WHEN 'TARE' THEN 'TARE'
    END
$$;

-- R-RESULT
CREATE FUNCTION silver.result_code(v text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE silver.norm_code(v) WHEN 'PASS' THEN 'PASS' WHEN 'FAIL' THEN 'FAIL' ELSE 'PENDING' END
$$;

-- R-CROPYEAR: 2023 / 2023CL
CREATE FUNCTION silver.crop_year(v text) RETURNS smallint
LANGUAGE sql IMMUTABLE AS $$
    SELECT (substring(btrim(v) FROM '^([0-9]{4})([A-Za-z]{2})?$'))::smallint
$$;

CREATE FUNCTION silver.crop_year_suffix(v text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT upper(substring(btrim(v) FROM '^[0-9]{4}([A-Za-z]{2})$'))
$$;

-- R-LOT: trim, keep case.
CREATE FUNCTION silver.norm_lot(v text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT nullif(btrim(v), '')
$$;

-- Material description parsing (observations §6.4) -------------------------------------------------
-- Grammar read from the right: <SPECIES> <VARIETY…> [<TYPE>] <STATE> ZZZ BK <UOM>
CREATE FUNCTION silver.material_key(v text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT silver.norm_code(v)
$$;

CREATE TYPE silver.material_parse AS (
    species_code text, variety_code text, type_code text, state_code text,
    uom_code text, material_note text, is_parsed boolean
);

CREATE FUNCTION silver.parse_material(v text) RETURNS silver.material_parse
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    d    text := silver.material_key(v);
    note text;
    t    text[];
    n    int;
    k    int;
    typ  text;
BEGIN
    IF d IS NULL THEN
        RETURN ROW(NULL, NULL, NULL, NULL, NULL, NULL, false)::silver.material_parse;
    END IF;
    note := substring(d FROM '\s*(\(.*\))\s*$');
    IF note IS NOT NULL THEN
        d := btrim(regexp_replace(d, '\s*\(.*\)\s*$', ''));
    END IF;
    t := string_to_array(d, ' ');
    n := coalesce(array_length(t, 1), 0);
    IF n < 6 OR t[1] !~ '^[A-Z]{4}$' OR t[n] NOT IN ('KG', 'KS') OR t[n-1] <> 'BK' OR t[n-2] <> 'ZZZ'
       OR t[n-3] NOT IN ('RDY', 'CLX', 'RDX', 'CLD', 'RDF', 'RAW', 'RDH', 'PMD') THEN
        RETURN ROW(NULL, NULL, NULL, NULL, NULL, note, false)::silver.material_parse;
    END IF;
    k := n - 4;  -- last token before the state
    IF k >= 3 AND t[k] IN ('CRS', 'SDD', 'CRN', 'PEA', 'SDL', 'SNP', 'SWE', 'LNG', 'CRT', 'DET', 'SHT', 'HOT', 'PRC') THEN
        typ := t[k];
        k := k - 1;
    END IF;
    IF k < 2 THEN
        RETURN ROW(NULL, NULL, NULL, NULL, NULL, note, false)::silver.material_parse;
    END IF;
    RETURN ROW(t[1], array_to_string(t[2:k], ' '), typ, t[n-3], t[n], note, true)::silver.material_parse;
END
$$;
