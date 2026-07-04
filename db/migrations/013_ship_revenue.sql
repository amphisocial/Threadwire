-- Ship tracking + partial shipments + revenue recognition + change tracking on SO lines.

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS ship_date date;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS qty_shipped numeric(14,4) NOT NULL DEFAULT 0;
-- last-changed tracking (who/when) for the auditable fields
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS promise_changed_by text;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS promise_changed_at timestamptz;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS status_changed_by text;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;

-- Shipment ledger: one row per (partial) shipment. Revenue is recognized here,
-- on the ship_date, proportional to qty shipped — so weekly/monthly/quarterly
-- rollups are accurate even when a line ships across multiple dates.
CREATE TABLE IF NOT EXISTS so_shipments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  so_number        text NOT NULL,
  line_number      integer NOT NULL DEFAULT 10,
  qty              numeric(14,4) NOT NULL,
  ship_date        date NOT NULL,
  value_recognized numeric(16,2) NOT NULL DEFAULT 0,
  created_by       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS so_shipments_org_date ON so_shipments (org_id, ship_date);
CREATE INDEX IF NOT EXISTS so_shipments_org_line ON so_shipments (org_id, so_number, line_number);
