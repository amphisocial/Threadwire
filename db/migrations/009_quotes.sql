-- Delivery Desk: quotes and the quote -> order thread.
-- A quote is the front of the "quote-to-shipment" tracker in the AMTEC/FTI offers.

CREATE TABLE IF NOT EXISTS quotes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_number       text NOT NULL,
  customer           text DEFAULT '',
  product_family     text DEFAULT '',
  custom_attributes  text DEFAULT '',
  quantity           numeric,
  value              numeric,                 -- quoted amount
  required_date      date,
  promised_date      date,
  expected_ship_date date,
  owner              text DEFAULT '',
  status             text DEFAULT 'open',     -- open | quoted | won | lost | converted
  blocker            text DEFAULT '',
  blocker_category   text DEFAULT '',         -- material | qa | engineering | customer | supplier_docs | none
  next_action        text DEFAULT '',
  site               text DEFAULT '',
  company_ref        text DEFAULT '',
  notes              text DEFAULT '',
  converted_so       text DEFAULT '',         -- so_number once converted to an order
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS quotes_org_num ON quotes (org_id, quote_number);
CREATE INDEX IF NOT EXISTS quotes_org_status ON quotes (org_id, status);
