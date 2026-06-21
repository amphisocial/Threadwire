-- ThreadWire data import: core digital-thread entities (org-scoped, idempotent).
-- Load order matters: parts must exist before boms / vendor_parts reference them.

CREATE TABLE IF NOT EXISTS customers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_code text NOT NULL,
  name          text NOT NULL,
  email         text DEFAULT '',
  region        text DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_org_code ON customers (org_id, customer_code);

CREATE TABLE IF NOT EXISTS vendors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_code text NOT NULL,
  name        text NOT NULL,
  email       text DEFAULT '',
  region      text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS vendors_org_code ON vendors (org_id, vendor_code);

CREATE TABLE IF NOT EXISTS operators (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  operator_code  text NOT NULL,
  name           text NOT NULL,
  site           text DEFAULT '',
  shift          text DEFAULT '',
  certifications text DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS operators_org_code ON operators (org_id, operator_code);

CREATE TABLE IF NOT EXISTS parts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  part_number text NOT NULL,
  description text DEFAULT '',
  unit_cost   numeric(14,2),
  uom         text DEFAULT '',
  commodity   text DEFAULT '',
  revision    text DEFAULT '',
  lifecycle   text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS parts_org_pn ON parts (org_id, part_number);

-- one part can be supplied by several vendors; (vendor, vendor_part_number) is unique
CREATE TABLE IF NOT EXISTS vendor_parts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  part_number        text NOT NULL,
  vendor             text NOT NULL,
  vendor_part_number text NOT NULL,
  unit_cost          numeric(14,2),
  lead_time_days     integer,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS vendor_parts_org_vendor_vpn ON vendor_parts (org_id, vendor, vendor_part_number);

-- single-level BOM; deeper levels are imported as their own parent rows
CREATE TABLE IF NOT EXISTS boms (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_part_number text NOT NULL,
  child_part_number  text NOT NULL,
  quantity           numeric(14,4) NOT NULL DEFAULT 1,
  find_number        text NOT NULL DEFAULT '',
  ref_designators    text DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS boms_org_parent_child_find ON boms (org_id, parent_part_number, child_part_number, find_number);

CREATE TABLE IF NOT EXISTS work_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  wo_number    text NOT NULL,
  part_number  text DEFAULT '',
  description  text DEFAULT '',
  quantity     numeric(14,4),
  site         text DEFAULT '',
  status       text DEFAULT '',
  due_date     date,
  operator     text DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS work_orders_org_wo ON work_orders (org_id, wo_number);

CREATE TABLE IF NOT EXISTS sales_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  so_number    text NOT NULL,
  customer     text NOT NULL DEFAULT '',
  site         text DEFAULT '',
  promise_date date,
  part_number  text DEFAULT '',
  quantity     numeric(14,4),
  value        numeric(16,2),
  status       text DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sales_orders_org_so ON sales_orders (org_id, so_number);

-- import audit (feeds the assistant's recent-changes awareness)
CREATE TABLE IF NOT EXISTS import_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity     text NOT NULL,
  inserted   integer NOT NULL DEFAULT 0,
  updated    integer NOT NULL DEFAULT 0,
  errors     integer NOT NULL DEFAULT 0,
  filename   text DEFAULT '',
  by_user    uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS import_events_org_created ON import_events (org_id, created_at DESC);
