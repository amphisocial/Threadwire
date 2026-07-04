-- Threadwire Digital Thread analysis APIs
-- Idempotent support tables for supply-chain pegging and ECO impact analysis.

CREATE TABLE IF NOT EXISTS inventory_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  part_number text NOT NULL,
  site text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  lot_number text NOT NULL DEFAULT '',
  on_hand numeric(14,4) NOT NULL DEFAULT 0,
  allocated numeric(14,4) NOT NULL DEFAULT 0,
  available numeric(14,4) NOT NULL DEFAULT 0,
  safety_stock numeric(14,4) NOT NULL DEFAULT 0,
  inspection_hold numeric(14,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_balances_org_part ON inventory_balances(org_id, part_number);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  line_number integer NOT NULL DEFAULT 10,
  supplier text NOT NULL DEFAULT '',
  part_number text NOT NULL DEFAULT '',
  quantity numeric(14,4) NOT NULL DEFAULT 0,
  open_quantity numeric(14,4) NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS purchase_order_lines_org_po_line ON purchase_order_lines(org_id, po_number, line_number);
CREATE INDEX IF NOT EXISTS purchase_order_lines_org_part ON purchase_order_lines(org_id, part_number);

CREATE TABLE IF NOT EXISTS eco_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  eco_number text NOT NULL,
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '',
  owner text NOT NULL DEFAULT '',
  effective_date date,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, eco_number)
);

CREATE TABLE IF NOT EXISTS eco_affected_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  eco_number text NOT NULL,
  part_number text NOT NULL,
  old_revision text NOT NULL DEFAULT '',
  new_revision text NOT NULL DEFAULT '',
  disposition text NOT NULL DEFAULT '',
  impact text NOT NULL DEFAULT '',
  UNIQUE(org_id, eco_number, part_number)
);
CREATE INDEX IF NOT EXISTS eco_affected_items_org_eco ON eco_affected_items(org_id, eco_number);
CREATE INDEX IF NOT EXISTS eco_affected_items_org_part ON eco_affected_items(org_id, part_number);

CREATE TABLE IF NOT EXISTS eco_affected_drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  eco_number text NOT NULL,
  drawing_number text NOT NULL,
  old_revision text NOT NULL DEFAULT '',
  new_revision text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '',
  UNIQUE(org_id, eco_number, drawing_number)
);

CREATE TABLE IF NOT EXISTS eco_ims_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  eco_number text NOT NULL,
  task_number text NOT NULL,
  task_name text NOT NULL DEFAULT '',
  owner text NOT NULL DEFAULT '',
  due_date date,
  status text NOT NULL DEFAULT '',
  blocker text NOT NULL DEFAULT '',
  UNIQUE(org_id, eco_number, task_number)
);

CREATE TABLE IF NOT EXISTS eco_orphan_exposure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  eco_number text NOT NULL,
  part_number text NOT NULL,
  quantity numeric(14,4) NOT NULL DEFAULT 0,
  exposure_value numeric(16,2) NOT NULL DEFAULT 0,
  recommended_action text NOT NULL DEFAULT '',
  UNIQUE(org_id, eco_number, part_number)
);
