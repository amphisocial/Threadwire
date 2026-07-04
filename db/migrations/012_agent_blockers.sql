-- Delivery-Risk Agent: blockers the agent auto-creates start as 'under_review'
-- (amber, needs a human to Confirm/Dismiss). Human-created blockers are 'confirmed'.
ALTER TABLE blockers ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'confirmed';
CREATE INDEX IF NOT EXISTS blockers_org_review ON blockers (org_id, review_status);
