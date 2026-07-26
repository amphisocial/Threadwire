# Threadwire Ontology Studio update

This update adds a signed-in **Ontology** workspace without replacing or migrating
Threadwire's current operational data model.

## How tenancy is maintained

Threadwire continues to keep all customers in the same physical operational tables
(`parts`, `boms`, `sales_orders`, `work_orders`, `lots`, and others). Every row is
segregated by `org_id`, and the existing API remains the authority for those rows.

The ontology is a semantic overlay:

- `ontology_entity_types` stores each organization's business-object definitions and 3D positions.
- `ontology_properties` maps business properties to existing PostgreSQL columns and records lineage.
- `ontology_relationship_types` describes business relationships.
- `ontology_custom_objects` holds only genuinely new object types that do not yet have a core table, such as ECO in the current repository.
- `ontology_action_types` and `ontology_action_runs` provide approval/audit workflows without silently changing operational records.

Every ontology table includes `org_id`. Every ontology API resolves the signed-in
user's organization and includes `WHERE org_id = ...`. No organization id is accepted
from the browser.

## Existing tables remain authoritative

Examples:

| Ontology object | Authoritative storage |
|---|---|
| Part | existing `parts` rows for the signed-in `org_id` |
| BOM Line | existing `boms` rows for the signed-in `org_id` |
| Sales Order Line | existing `sales_orders` rows for the signed-in `org_id` |
| Work Order | existing `work_orders` rows for the signed-in `org_id` |
| Lot, Inspection, NCR | existing quality/traceability tables |
| Engineering Change (ECO) | `ontology_custom_objects` until Threadwire gains a persistent core ECO table |

Moving a node in 3D changes only its ontology `position`. Renaming an ontology label
changes only semantic metadata. Neither operation edits a part, BOM, sales order, or
work order.

## Features included

1. Three.js 3D ontology canvas with orbit, zoom, selection, XYZ drag controls and saved positions.
2. Current PostgreSQL schema bootstrap and refresh, including newly discovered columns.
3. Operational object browser over existing org-scoped tables plus custom ontology objects.
4. Property lineage and direct impact analysis across parts, BOMs, orders, work orders, lots, quality, documents and blockers.
5. Governed action requests with approval/rejection and activity audit entries.
6. Ontology-aware AI grounded with the current tenant's model, selected object and impact graph; it reuses the existing `/api/ai/chat` provider and metering.

## Files

- `db/migrations/017_ontology.sql`
- `backend/app/ontology.py`
- `backend/app/workforce.py` (only adds the ontology child router; workforce endpoints are retained)
- `frontend/src/ontology/OntologyStudio.jsx`
- `frontend/src/main.jsx` (adds the signed-in Operations/Ontology workspace tabs)
- `frontend/package.json` (adds Three.js)
- `redeploy.sh` (copies package.json and installs changed frontend dependencies)

## Apply

From the Threadwire repository root, overlay the files from this archive, then:

```bash
git diff --check
python3 -m py_compile backend/app/ontology.py backend/app/workforce.py
bash -n redeploy.sh
git add backend/app/ontology.py backend/app/workforce.py db/migrations/017_ontology.sql \
  frontend/src/ontology/OntologyStudio.jsx frontend/src/main.jsx frontend/package.json \
  redeploy.sh ONTOLOGY_STUDIO.md
git commit -m "add tenant-scoped ontology studio"
git push
```

On EC2:

```bash
git pull
bash redeploy.sh
```

The migration is idempotent. The first signed-in visit to Ontology seeds semantic
mappings for that organization. Existing application routes and operational tables
are not renamed or deleted.

## Deployment validation

After deployment:

1. Confirm `/api/health` returns `{"ok":true}`.
2. Sign in and verify existing Delivery, Blockers, Digital Thread, Workforce and AI Workbench pages.
3. Open the new **Ontology** workspace tab.
4. Select Part and verify the count matches the signed-in organization.
5. Move Part in the 3D canvas, refresh, and confirm its position persists.
6. Open a Part object and run Impact Analysis.
7. Submit a governed action; org admins should be able to approve/reject it.
8. Ask Ontology AI a question and confirm it references only the selected organization's context.
