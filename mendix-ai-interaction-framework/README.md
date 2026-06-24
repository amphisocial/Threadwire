# Mendix AI Interaction Framework

Reusable scaffolding for embedding governed, audited LLM calls into Mendix business-process applications. The framework is shipped as a Mendix module (`AIInteractionFramework`) and is consumed by industry-specific applications on the Mendix Marketplace.

This repository hosts the **template library** and the canonical **entity model** the framework module uses. It does not yet contain the Mendix module sources themselves — those are built from these specifications in a separate Mendix project and published to the Marketplace as a reusable module.

## What's in this repo (Wave 1)

```
primitives/
  templates/
    _entity-model.json                                     # Mendix entity model (PromptTemplate + children)
    README.md                                              # Library guide
    SCM-02-RFQ-Extractor.template.json                     # RFQ / SOW intake extractor
    SCM-02-RFQ-Extractor.output-schema.json
    ENG-01-Requirements-Extractor.template.json            # Customer-spec shall-statement extractor
    ENG-01-Requirements-Extractor.output-schema.json
    MFG-01-WI-Source-Extractor.template.json               # Drawing / ECO / spec extractor
    MFG-01-WI-Source-Extractor.output-schema.json
```

Wave 1 covers the **Document-Extract** interaction primitive only. Three templates ship in this wave, one per Wave 1 application:

| Code | Title | Consumer App | Sensitivity | Backend |
|---|---|---|---|---|
| `SCM-02-RFQ-Extractor` | RFQ / SOW Intake Extractor | SCM-02 RFQ Intake & Clause Triager | ITAR | Bedrock_Claude |
| `ENG-01-Requirements-Extractor` | Customer Spec Requirements Extractor | ENG-01 Requirements Extraction & Traceability | ITAR | Bedrock_Claude |
| `MFG-01-WI-Source-Extractor` | Work-Instruction Source Extractor | MFG-01 Guided Work-Instruction Author | ITAR | Bedrock_Claude |

All three are `Primitive = DocumentExtract`, `Temperature = 0.0`, `RequiresCitation = true`, and routed only to Bedrock Claude (GovCloud) or an on-prem gateway.

## Design principles

Every template in the library inherits these:

1. **Extract, don't author.** Templates extract structured facts; authoring belongs to the Drafting & Generation primitive.
2. **Cite every fact.** Every extracted value carries a citation back to a page + section / zone / note.
3. **Verbatim preservation.** Every extracted span is a character-for-character source excerpt; checked by a guardrail.
4. **Deterministic.** Temperature 0.0; output is exactly one JSON object validated against `OutputSchemaJson`.
5. **Confidence floor.** Outputs below the per-template `MinConfidenceThreshold` are routed to a reviewer queue.
6. **Prompt-injection defense.** Document-body directives aimed at the model are stripped or rejected.
7. **Tier-aware routing.** `DataSensitivityTier` (Public / Internal / ITAR / Classified) restricts the backend allowlist.
8. **Immutable after publish.** A `Published` `(Code, Version)` record cannot be edited; corrections require a new version.

A more detailed design specification (entity model, lifecycle, governance, microflow pattern, evaluation strategy, per-template reference) is maintained as a Word document outside this repo.

## How a consumer app calls a template

Every application calls a single Mendix microflow:

```text
IF_DocumentExtract_Invoke(
    template_code           : String,    // e.g. 'SCM-02-RFQ-Extractor'
    template_version_or_null: String,    // null = latest Published
    input_object            : AIInteractionFramework.DocumentExtractInput,
    invoked_by              : String
) -> ExtractionInvocation
```

The runtime: validates inputs against `PromptVariable`s, applies tier-aware routing, renders the prompt, invokes the backend, validates the completion against the schema (with one auto-retry), runs guardrails, persists the audit row, and routes low-confidence completions to a reviewer queue.

See [`primitives/templates/README.md`](primitives/templates/README.md) for full library detail.

## Versioning

Templates use semantic versioning. A `(Code, Version)` pair is unique and immutable once `Status = Published`.

- **PATCH** — typo / clarification fixes that don't change the schema.
- **MINOR** — additive schema changes (new optional fields, new enum values).
- **MAJOR** — breaking schema changes.

## Roadmap

- **Wave 1 (current)** — Document-Extract primitive: 3 templates above.
- **Wave 2** — Guided Copilot primitive (needed by MFG-01 authoring step), plus 5 more apps.
- **Wave 3** — Drafting & Generation, Decision Support & Triage primitives, plus the remaining apps.

## License

See [LICENSE](LICENSE).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version: never edit a Published template — bump the version.
