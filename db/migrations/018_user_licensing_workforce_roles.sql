-- User access, license seats, and Workforce functional roles.
--
-- `users` contains login accounts. `wf_people` contains workforce roster records.
-- Loading 1,000 workforce people therefore does not create 1,000 licensed users.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS license_assigned boolean NOT NULL DEFAULT true;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS workforce_role text NOT NULL DEFAULT 'viewer';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS workforce_discipline text;

UPDATE users
   SET is_active = true
 WHERE is_active IS NULL;

UPDATE users
   SET license_assigned = true
 WHERE license_assigned IS NULL
    OR role IN ('org_admin', 'superadmin');

UPDATE users
   SET workforce_role = 'viewer'
 WHERE workforce_role IS NULL OR workforce_role = '';

DO $$
BEGIN
  ALTER TABLE users
    ADD CONSTRAINT users_workforce_role_check
    CHECK (workforce_role IN (
      'viewer',
      'discipline_manager',
      'engineering_project_lead',
      'program_manager'
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS users_org_license_idx
  ON users (org_id, license_assigned, is_active);

COMMENT ON COLUMN users.license_assigned IS
  'Consumes one Threadwire application seat. Workforce roster rows in wf_people do not consume seats.';

COMMENT ON COLUMN users.workforce_role IS
  'Functional Workforce role, separate from the authentication role in users.role.';

COMMENT ON COLUMN users.workforce_discipline IS
  'Optional discipline scope for a Discipline Manager, e.g. SW, EE, or ME.';
