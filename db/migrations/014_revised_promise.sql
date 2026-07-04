-- Keep the original promise_date immutable for the record; edits set a revised date.
-- Effective promise = COALESCE(revised_promise_date, promise_date).
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS revised_promise_date date;
