# Threadwire Delivery/Sales Order Edit Fix

This package applies fixes over the latest `main` branch of `amphisocial/Threadwire`.

## What it fixes

1. **Promise Date and Ship Date date pickers**
   - Adds native dark-mode date picker styling for the Sales Order edit form.
   - Shows the current effective Promise Date in the edit form instead of a blank revised-promise field.

2. **Promise Date audit trail**
   - Fixes the backend PATCH SQL parameter numbering bug that prevented revised promise changes from saving correctly.
   - Shows `changed by <user> · <timestamp>` in the Sales Order modal and on the Delivery card.

3. **Card strikethrough and move behavior**
   - Delivery cards now treat direct `revised_promise_date` the same way as blocker-driven revised dates.
   - Original promise date is struck through and the revised date is shown in amber.
   - After saving a revised Promise Date, the Delivery page jumps to the week containing the new effective promise date.

4. **Safe DB migration**
   - Adds an idempotent migration to ensure the revised promise / ship tracking / audit columns exist.

## Apply locally

From your local repository root:

```bash
unzip threadwire.zip -d /tmp/threadwire_fix
cp /tmp/threadwire_fix/apply_threadwire_fix.py .
python3 apply_threadwire_fix.py
git diff
npm --prefix frontend install
npm --prefix frontend run build
git add frontend/src/ThreadWire.jsx backend/app/main.py db/migrations/999_so_edit_audit_idempotent.sql
git commit -m "Fix sales order promise date editing"
git push
```

## Deploy on server

After `git pull` on the EC2/server:

```bash
bash redeploy.sh
```

`redeploy.sh` already applies `db/migrations/*.sql`, restarts the API, rebuilds the frontend, and copies the Vite `dist` output into `/var/www/threadwire/dist/`.
