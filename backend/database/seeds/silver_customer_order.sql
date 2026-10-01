-- SYNTHETIC open customer orders (the brief requires them; the Pasco extracts have none).
-- Deterministic: one order per open LSVLN1 PO (two when input >= 30,000 kg), qty ≈ 80 % of input (median scrap ~19 %),
-- need_by = scheduled finish + a fixed offset pattern so some orders are tight. Customer names are generic placeholders.
CREATE TEMP TABLE _syn_order ON COMMIT DROP AS
WITH q AS (
    SELECT li.process_order_id, coalesce(li.material_id, po.material_id) AS material_id, li.input_kg,
           li.scheduled_finish_date,
           row_number() OVER (ORDER BY li.scheduled_finish_date, po.po_number) AS rn
    FROM silver.line_schedule_item li
    JOIN silver.process_order po USING (process_order_id)
    JOIN silver.work_center wc ON wc.work_center_id = li.work_center_id
    WHERE wc.work_center_code = 'LSVLN1' AND li.status_code <> 'COMPLETE' AND NOT li.is_duplicate
      AND li.input_kg > 0 AND coalesce(li.material_id, po.material_id) IS NOT NULL
), s AS (
    SELECT q.*, g.split, CASE WHEN q.input_kg >= 30000 THEN 2 ELSE 1 END AS n_split
    FROM q CROSS JOIN LATERAL generate_series(1, CASE WHEN q.input_kg >= 30000 THEN 2 ELSE 1 END) g(split)
)
SELECT 'SYN-CO-' || lpad((row_number() OVER (ORDER BY rn, split))::text, 3, '0') AS order_number,
       process_order_id, material_id,
       round(input_kg * 0.8 / n_split, 0) AS qty,
       scheduled_finish_date + (ARRAY[-2, 0, 1, 3, 5])[1 + ((rn + split) % 5)::int] AS need_by_date,
       (ARRAY['Customer A (synthetic)', 'Customer B (synthetic)', 'Customer C (synthetic)'])[1 + ((rn + split) % 3)::int]
           AS customer_name
FROM s;

INSERT INTO silver.customer_order (order_number, customer_name, material_id, qty, uom_code, need_by_date, priority_tier, is_synthetic)
SELECT order_number, customer_name, material_id, qty, 'KG', need_by_date,
       CASE WHEN customer_name LIKE 'Customer A%' THEN 'KEY' ELSE 'STANDARD' END, true
FROM _syn_order
ORDER BY order_number;

INSERT INTO silver.order_allocation (customer_order_id, process_order_id, allocated_qty)
SELECT co.customer_order_id, s.process_order_id, s.qty
FROM _syn_order s
JOIN silver.customer_order co USING (order_number)
ORDER BY co.order_number;
