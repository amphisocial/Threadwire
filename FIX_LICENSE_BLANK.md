# Fix: License tab went blank / bounced to threadwire.ai

Cause: the rewritten LicenseTab used `useMemo`, but Admin.jsx imported only
`useEffect, useState, useCallback`. `useMemo` was undefined → LicenseTab threw on
render → the Admin tree unmounted (blank), and the fallback landed on the
marketing root.

Fix: `Admin.jsx` now imports `useMemo`. One changed file, identical across all
four apps.

Deploy: drop in, then `bash redeploy-multi.sh` (or per app:
`bash redeploy-multi.sh <app>`), or just rebuild — no backend/migration change.
