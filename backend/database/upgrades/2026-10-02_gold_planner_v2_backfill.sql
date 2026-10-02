-- planner v2 backfill (Q6): entries written before due_date_basis existed get the basis their due_date matches, with the
-- same precedence as gold.v_open_queue.due_date_basis (need-by wins a tie). The schedule finish may have been changed
-- by an ingest event after the plan was made, so every finish the row ever had counts (schedule row, any
-- process_order_change). Runs last in --upgrade-gold-planner-v2.
UPDATE gold.schedule_entry se
SET due_date_basis = CASE
        WHEN EXISTS (SELECT 1 FROM silver.order_allocation oa JOIN silver.customer_order co USING (customer_order_id)
                     WHERE oa.process_order_id = se.process_order_id AND co.need_by_date = se.due_date) THEN 'NEED_BY'
        WHEN li.scheduled_finish_date = se.due_date
          OR EXISTS (SELECT 1 FROM silver.process_order_change c
                     WHERE c.process_order_id = se.process_order_id AND c.scheduled_finish_date = se.due_date)
        THEN 'SCHEDULE_FINISH'
        WHEN po.sap_finish_date = se.due_date THEN 'SAP_FINISH' END
FROM silver.line_schedule_item li, silver.process_order po
WHERE li.line_schedule_item_id = se.line_schedule_item_id AND po.process_order_id = se.process_order_id
  AND se.due_date_basis IS NULL AND se.due_date IS NOT NULL;
