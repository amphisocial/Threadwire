-- Migration 001: full name + TOTP MFA. Safe to run on an existing database.
ALTER TABLE users    ADD COLUMN IF NOT EXISTS full_name   text;
ALTER TABLE users    ADD COLUMN IF NOT EXISTS mfa_secret  bytea;
ALTER TABLE users    ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mfa_passed  boolean NOT NULL DEFAULT true;
