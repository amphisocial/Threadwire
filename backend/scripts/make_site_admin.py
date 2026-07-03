#!/usr/bin/env python3
"""Create or promote the ThreadWire *site admin* (role = 'superadmin').

The site admin is the platform owner: the one account that can upload and
manage Case Studies / whitepapers from the UI. This is NOT the same as a
customer's org_admin — those administer their own company only.

Two ways to use it (run from the backend/ directory on the server, with the
same environment as the API so DATABASE_URL is set — `set -a; . .env; set +a`
if you keep it in a .env file):

  1) Promote an account that already registered through the normal UI:

       python scripts/make_site_admin.py admin@threadwire.ai

  2) Create the account from scratch (an internal "ThreadWire" org is created
     if needed, since every user must belong to an organization):

       python scripts/make_site_admin.py admin@threadwire.ai \
           --create --name "Site Admin" --password 'a-strong-password-here'

Demote with:  python scripts/make_site_admin.py someone@x.com --demote
"""
import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

try:  # pick up backend/.env when present, same as local dev
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except Exception:
    pass

import asyncpg  # noqa: E402

from app.config import settings  # noqa: E402
from app.security import hash_password  # noqa: E402

INTERNAL_ORG = "ThreadWire (Platform)"


async def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("email")
    p.add_argument("--create", action="store_true", help="create the user if it does not exist")
    p.add_argument("--name", default="Site Admin")
    p.add_argument("--password", default=None, help="required with --create")
    p.add_argument("--demote", action="store_true", help="set role back to member")
    args = p.parse_args()
    email = args.email.strip().lower()

    con = await asyncpg.connect(settings.database_url)
    try:
        user = await con.fetchrow("SELECT id, role FROM users WHERE lower(email) = $1", email)

        if args.demote:
            if not user:
                print("No user with email %s" % email); return 1
            await con.execute("UPDATE users SET role = 'member' WHERE id = $1", user["id"])
            print("Demoted %s to member." % email); return 0

        if user:
            if user["role"] == "superadmin":
                print("%s is already the site admin." % email); return 0
            await con.execute("UPDATE users SET role = 'superadmin' WHERE id = $1", user["id"])
            print("Promoted %s to site admin (superadmin)." % email); return 0

        if not args.create:
            print("No user with email %s. Re-run with --create --password '...' to create it,"
                  "\nor register through the UI first and run this again." % email)
            return 1
        if not args.password or len(args.password) < 10:
            print("--password is required with --create (min 10 characters)."); return 1

        org_id = await con.fetchval(
            "SELECT id FROM organizations WHERE normalized_name = $1", INTERNAL_ORG.lower())
        if not org_id:
            org_id = await con.fetchval(
                "INSERT INTO organizations (legal_name, normalized_name, status) "
                "VALUES ($1, $2, 'active') RETURNING id", INTERNAL_ORG, INTERNAL_ORG.lower())
            print("Created internal organization %r." % INTERNAL_ORG)

        await con.execute(
            "INSERT INTO users (org_id, email, full_name, password_hash, role) "
            "VALUES ($1, $2, $3, $4, 'superadmin')",
            org_id, email, args.name, hash_password(args.password))
        print("Created site admin %s. They can now sign in and manage Case Studies." % email)
        return 0
    finally:
        await con.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
