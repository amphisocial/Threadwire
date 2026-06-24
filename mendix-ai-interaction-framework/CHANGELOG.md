# Changelog

All notable changes to this repository will be documented in this file.
The format is based on Keep a Changelog and adheres to Semantic Versioning.

## [v0.3.0-wave2-preview] — 2026-04-29
### Added
- **ENG-06 ECO Impact Analyzer template stack:**
  - `ENG-06-ECO-Extractor v1.0.0` — full Document-Extract template + JSON Schema
    for parsing Engineering Change Order packages (PLM export, data-lake export,
    or PDF/DOCX). Captures eco_metadata, reason_for_change, affected_items
    (Add/Remove/Revise/Substitute with from/to revisions), effectivity (Date,
    Serial, Block, NextAssembly, Lot, ImmediateOnApproval), affected_documents,
    ims_schedule_references (Cobra/MSProject/P6/OpenPlan), qualification_summary,
    approval_state.
  - `ENG-06-Impact-Copilot v0.1.0-stub` — Guided Copilot stub. Tool surface:
    `load_eco`, `joined_orphans`, `joined_schedule_impact`, `where_used`,
    `explode_bom`, `ims_task_dependencies`, `milestone_status`.
  - `ENG-06-Impact-Scorer v0.1.0-stub` — Decision Support & Triage stub.
    Two-pass output (orphan_findings + schedule_findings + program_rollups).
    Orphan rubric distinguishes Full / Partial / NotOrphaned / InsufficientData
    and computes exposure_usd. Schedule rubric weighted 30/25/20/15/10 across
    critical-path proximity, qualification burden, long-lead in new config,
    approval-path latency, and build-up inventory. Safety-of-flight floor of
    RouteToReview.

### Notes
- ENG-06 reuses SCM-05's BOM-closure + supply/demand entities; only ECO content
  and impact-finding entities are new.

## [v0.2.0-wave2-preview] — 2026-04-29
### Added
- **SCM-05 Multi-Level Pegging Explorer template stack:**
  - `SCM-05-PCN-EOL-LTB-Extractor v1.0.0` — full Document-Extract template + JSON Schema
    for ingesting Product Change / Discontinuance / End-of-Life / Last-Time-Buy notices.
    Captures notice metadata, affected MPNs with replacement equivalence, qualification
    impact, milestones, change drivers, distributors, and continuing-supply authority.
  - `SCM-05-Pegging-Copilot v0.1.0-stub` — Guided Copilot stub. Defines the typed
    tool surface (`where_used`, `explode_bom`, `pegs_for_part`, `what_if_supply_slip`,
    `open_pcn_impact`) the Wave 2 Guided Copilot primitive must support.
  - `SCM-05-Pegging-Risk-Scorer v0.1.0-stub` — Decision Support & Triage stub.
    Defines a 25/20/20/25/10 weighted rubric across obsolescence pressure, supplier
    risk, lead-time exposure, schedule criticality, and soft-peg volatility.
- README updated with Wave 1 / Wave 2 / Wave 3 scope tables and per-template notes.

### Notes
- The two `*.stub.json` files are not importable until their respective primitives
  ship (Guided Copilot in Wave 2; Decision Support & Triage in Wave 3). They are
  versioned anchors for the primitive design.

## [v0.1.0-wave1] — 2026-04-19
### Added
- Initial Document-Extract primitive template library:
  - `SCM-02-RFQ-Extractor v1.0.0`
  - `ENG-01-Requirements-Extractor v1.0.0`
  - `MFG-01-WI-Source-Extractor v1.0.0`
- Mendix entity model (`_entity-model.json`).
- Library README, top-level repo README, LICENSE, CONTRIBUTING, .gitignore.
