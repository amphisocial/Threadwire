# AI Interaction Framework — Prompt Template Library

This folder is the seed template library for the AI Interaction Framework on Mendix. The framework is shipped as a Mendix module (`AIInteractionFramework`) and is consumed by the business-process applications in the Mendix Marketplace portfolio.

Wave 1 ships **Document-Extract** templates. Wave 2 introduces additional Document-Extract templates plus the first **Guided Copilot** stub. Wave 3 introduces the first **Decision Support & Triage** stub.

## Scope

### Wave 1 (Document-Extract)

| Code | Title | Consumer App | Sensitivity | Backend |
|---|---|---|---|---|
| `SCM-02-RFQ-Extractor` | RFQ / SOW Intake Extractor | SCM-02 RFQ Intake & Clause Triager | ITAR | Bedrock_Claude |
| `ENG-01-Requirements-Extractor` | Customer Specification Requirements Extractor | ENG-01 Requirements Extraction & Traceability | ITAR | Bedrock_Claude |
| `MFG-01-WI-Source-Extractor` | Work-Instruction Source Extractor | MFG-01 Guided Work-Instruction Author | ITAR | Bedrock_Claude |

### Wave 2 (Document-Extract + Guided Copilot stubs)

| Code | Primitive | Consumer App | Status |
|---|---|---|---|
| `SCM-05-PCN-EOL-LTB-Extractor` | DocumentExtract | SCM-05 Multi-Level Pegging Explorer | Draft v1.0.0 — full template |
| `SCM-05-Pegging-Copilot` | GuidedCopilot | SCM-05 Multi-Level Pegging Explorer | v0.1.0-stub — primitive not yet formalized |
| `ENG-06-ECO-Extractor` | DocumentExtract | ENG-06 ECO Impact Analyzer | Draft v1.0.0 — full template |
| `ENG-06-Impact-Copilot` | GuidedCopilot | ENG-06 ECO Impact Analyzer | v0.1.0-stub — primitive not yet formalized |

### Wave 3 (Decision Support & Triage stubs)

| Code | Primitive | Consumer App | Status |
|---|---|---|---|
| `SCM-05-Pegging-Risk-Scorer` | DecisionSupportAndTriage | SCM-05 Multi-Level Pegging Explorer | v0.1.0-stub — primitive not yet formalized |
| `ENG-06-Impact-Scorer` | DecisionSupportAndTriage | ENG-06 ECO Impact Analyzer | v0.1.0-stub — primitive not yet formalized |

All Document-Extract templates use `Temperature = 0.0`, `RequiresCitation = true`, and `DataSensitivityTier = ITAR`. The stub templates are illustrative — they will not be importable until the corresponding interaction primitive ships in the framework.

## Folder layout

```
primitives/
  templates/
    _entity-model.json                                       # Mendix entity model used by every template file
    README.md                                                # this file
    SCM-02-RFQ-Extractor.template.json                       # Wave 1: PromptTemplate record (+ variables, examples, guardrails)
    SCM-02-RFQ-Extractor.output-schema.json                  # Wave 1: Completion contract
    ENG-01-Requirements-Extractor.template.json              # Wave 1
    ENG-01-Requirements-Extractor.output-schema.json
    MFG-01-WI-Source-Extractor.template.json                 # Wave 1
    MFG-01-WI-Source-Extractor.output-schema.json
    SCM-05-PCN-EOL-LTB-Extractor.template.json               # Wave 2 (Document-Extract)
    SCM-05-PCN-EOL-LTB-Extractor.output-schema.json
    SCM-05-Pegging-Copilot.stub.json                         # Wave 2 (Guided Copilot — stub, not importable)
    SCM-05-Pegging-Risk-Scorer.stub.json                     # Wave 3 (Decision Support — stub, not importable)
```

Every template file is a single JSON document that maps one-to-one to a `PromptTemplate` row plus its composite children (`PromptVariable`, `FewShotExample`, `Guardrail`). The companion `*.output-schema.json` is the JSON Schema (draft 2020-12) stored on `PromptTemplate.OutputSchemaJson` and enforced by the runtime.

## Import process

Templates are imported into a Mendix app via the `ImportPromptTemplates` microflow exposed by the framework module. The expected flow is:

1. Drop the `.template.json` file on the `AIInteractionFramework.TemplateImport` upload page (or drop the whole `primitives/templates/` folder — the microflow iterates).
2. The microflow loads the matching `*.output-schema.json` from the same folder by filename convention (`<Code>.output-schema.json`), attaches it to `OutputSchemaJson`, and validates that the schema is well-formed draft 2020-12.
3. The microflow creates `PromptTemplate` with `Status = Draft` and associates `PromptVariable`, `FewShotExample`, and `Guardrail` children inline.
4. A developer or template owner moves the record through `Draft -> InReview -> Published`. On publish, `(Code, Version)` becomes immutable. All subsequent corrections require a new `Version`.

## Versioning conventions

- `Version` uses semantic versioning: `MAJOR.MINOR.PATCH`.
- **PATCH**: typo fixes, clarifications to the system prompt that do not change the output contract.
- **MINOR**: new optional fields in the output schema, new classification enum values that are additive, new guardrails that do not reject previously valid outputs.
- **MAJOR**: breaking changes to the output schema (removed fields, narrowed enums, renamed keys) or a change that alters downstream consumer expectations.
- Deprecated versions remain importable for audit replay. `SupersededByCode` on the old record points to the replacement.

## Design principles baked into every template

1. **Extract, do not author.** The system prompt explicitly states what the template does NOT do. Authoring, decomposition, and test-case generation belong to the copilot / drafting / generation primitives.
2. **Verbatim preservation.** Every extracted span carries a `verbatim_source_text` (or `quote`) that must be a character-for-character excerpt. A `Verbatim preservation` guardrail cross-checks this against the source.
3. **Cite every fact.** Every extracted object carries a `citation` pointing back to page + section / zone / note. Missing citations cause the completion to be marked `SchemaInvalid`.
4. **Deterministic output.** `Temperature = 0.0`. Output must be a single JSON object beginning with `{` and ending with `}` \u2014 no prose, no markdown fences.
5. **Self-assessed confidence.** Every template carries a `MinConfidenceThreshold`. Completions whose `overall_confidence` falls below the floor are routed to a reviewer queue rather than accepted silently.
6. **Prompt-injection defense.** The system prompt tells the model to ignore instructions coming from the document body. A declarative `PromptInjectionDefense` guardrail also strips / flags obvious override directives at the framework layer before invocation.
7. **ITAR-safe routing.** `DataSensitivityTier = ITAR` on all Wave 1 templates. The `DataClassificationRoute` guardrail restricts execution to `Bedrock_Claude` (in a GovCloud deployment) or `OnPremGateway`. Public-cloud OpenAI and Vertex backends are blocked.

## Input contract

Each template exposes a typed `PromptVariable` list. The runtime validates inputs against these before rendering the user prompt. The most important shared convention is the **document text variable**:

- It has `DataType = DocumentText`.
- The framework is responsible for normalizing uploaded PDFs / DOCX / XLSX into text **with page markers injected as `<page n="<int>">` tags**. Drawings carry an extended form: `<page n="<int>" doc="<id>" kind="Drawing">`.
- The framework truncates at `MaxLength` and records the truncation in `ExtractionInvocation.InputPayloadJson` so the auditor knows the extraction saw only a prefix.
- GD&T symbols in drawing text are normalized to bracketed pseudo-text, e.g. `[POSITION 0.005 M A B M C M]`, so the model does not see unrepresentable glyphs.

## Output contract

Every template's output is a single JSON object with, at minimum:

- `schema_id`, `schema_version` \u2014 identify the contract the completion claims to satisfy.
- The business payload (the extracted facts).
- `unresolved_ambiguities` \u2014 explicit list of things the model could not confidently fill. Each ambiguity MUST be cited. This is the primary signal to reviewers.
- `refusal_reason` \u2014 non-null only when the model refuses (prompt-injection detected, out-of-scope document, etc.).
- `overall_confidence` \u2014 aggregate self-assessed confidence in [0,1].

The runtime validates the completion against `OutputSchemaJson`. A failure marks the invocation `SchemaInvalid`, triggers one automatic retry with the schema validation error appended to the user prompt as a corrective message, and if the retry also fails, surfaces the invocation to the reviewer queue.

## Per-template notes

### SCM-02-RFQ-Extractor

- Audience: capture / contracts teams.
- Captures: program metadata, deliverables, parts, milestones, FAR/DFARS clauses (with incorporation mode, risk level, and suggested routing), data rights, cybersecurity requirements (CMMC + DFARS -7012/7019/7020/7021 + NIST 800-171), export-control markings, small-business set-asides, evaluation criteria.
- `MinConfidenceThreshold`: 0.75 \u2014 contracts review is manual anyway.
- Routing hint (`clauses[*].routing`) is the main downstream hook into SCM-02's triage workflow.

### ENG-01-Requirements-Extractor

- Audience: systems engineers, requirements managers.
- Captures: shall-statements, split into atomic requirements, with classification, verification method, and requirement-quality flags.
- `MinConfidenceThreshold`: 0.80 \u2014 bad extractions corrupt the baseline and are expensive to repair downstream.
- Pairs with ENG-05 (Stakeholder-to-System Decomposition) and ENG-04 (Test Case Generator) downstream.

### MFG-01-WI-Source-Extractor

- Audience: manufacturing engineers, planners.
- Captures: critical features (KC/KPC/CSI), tolerances, fasteners, torque specs, process specs (AMS/MIL/Nadcap), tooling, consumables, PPE, environmental controls, inspection/buyoff points, traceability, and ECO deltas.
- `MinConfidenceThreshold`: 0.80 \u2014 shop-floor errors are safety-of-flight issues.
- `RefuseIfUngrounded` guardrail is turned on for `torque_specs`, `tolerances`, `process_specs`, and `fasteners` \u2014 the model must not invent values the drawing did not state.

### SCM-05-PCN-EOL-LTB-Extractor

- Audience: component engineers, materials managers.
- Captures: notice metadata (id, type, manufacturer, issue date), affected manufacturer parts with replacement cross-references and qualification impact, milestones (last order / last ship / change-effective / sample-available dates), change drivers (wafer-fab relocation, fab closure, RoHS, etc.), affected distributors, and continuing-supply authority (e.g. Rochester Electronics LTB).
- `MinConfidenceThreshold`: 0.80 \u2014 a wrong replacement-MPN classification can drive an incorrect requalification scope.
- Citation shape: per-record `{page, section_or_anchor}` so a reviewer can jump to the section / table / heading the fact came from.
- Verbatim guardrail enforces that every `verbatim_quote` is a substring of the source notice text.

### SCM-05-Pegging-Copilot (stub \u2014 not yet importable)

- Audience: master schedulers, materials managers.
- Primitive: GuidedCopilot. Will become importable when the Wave 2 Guided Copilot primitive ships.
- Tool surface: `where_used`, `explode_bom`, `pegs_for_part`, `what_if_supply_slip`, `open_pcn_impact`. Every answer cites the entity IDs returned by these tools.
- The `RefuseIfUngrounded` posture is strict: any answer fact not traceable to a tool invocation is rejected.

### SCM-05-Pegging-Risk-Scorer (stub \u2014 not yet importable)

- Audience: master schedulers (overnight batch).
- Primitive: DecisionSupportAndTriage. Will become importable when the Wave 3 primitive ships.
- Scoring rubric: weighted 25/20/20/25/10 across obsolescence pressure, supplier risk, lead-time exposure, schedule criticality, and soft-peg volatility.
- Recommended actions: Harden, Expedite, AltMPN, AltSource, BookLastTimeBuy, NoAction, RouteToReview. Floor of RouteToReview for safety-of-flight items.

### ENG-06-ECO-Extractor

- Audience: CRB chairs, program managers, materials managers, component engineers.
- Captures: ECO header, reason for change, affected items (Add/Remove/Revise/Substitute with from/to part_number + revision, FFF/qual impact), effectivity (Date/Serial/Block/NextAssembly/Lot), affected drawings + revs, IMS task references (Cobra activity IDs, MS Project task IDs), qualification summary, approval state.
- `MinConfidenceThreshold`: 0.80 \u2014 wrong action classifications (e.g. Substitute mis-read as Revise) corrupt the downstream orphan analysis.
- Citation shape: per-record `{page, section_or_anchor, field_label}` so the model can cite either a section or a form-field label (PLM ECOs typically use field labels rather than section numbers).
- Few-shot example: ECO-2026-0418 substitution (MAX14001AAP+ \u2192 ADAQ7980BCPZ-RL7) with Cobra and MS Project task references.

### ENG-06-Impact-Copilot (stub \u2014 not yet importable)

- Audience: CRB chair, program manager.
- Primitive: GuidedCopilot. Will become importable when the Wave 2 Guided Copilot pr