-- Multi-line sales orders + SOEI part classification.

-- 1) line numbers (existing rows all become line 10; new lines go 10,20,30,…)
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS line_number integer NOT NULL DEFAULT 10;

-- 2) uniqueness moves from (org, so_number) to (org, so_number, line_number)
DROP INDEX IF EXISTS sales_orders_org_so;
CREATE UNIQUE INDEX IF NOT EXISTS sales_orders_org_so_line
  ON sales_orders (org_id, so_number, line_number);

-- 3) parts get a classification; SO end items are tagged 'SOEI'
ALTER TABLE parts ADD COLUMN IF NOT EXISTS classification text NOT NULL DEFAULT '';

-- 4) backfill any blank part on a sales-order line with a random existing part
--    (keeps every card showing an end item; no-op once filled)
UPDATE sales_orders s
   SET part_number = COALESCE(
         (SELECT p.part_number FROM parts p
           WHERE p.org_id = s.org_id ORDER BY random() LIMIT 1),
         'PN-UNASSIGNED')
 WHERE s.part_number IS NULL OR s.part_number = '';

-- 5) tag every part used as a sales-order end item
UPDATE parts p
   SET classification = 'SOEI'
  FROM sales_orders s
 WHERE s.org_id = p.org_id
   AND s.part_number = p.part_number
   AND (p.classification IS NULL OR p.classification = '');
