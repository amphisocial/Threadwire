# Contributing

This repository hosts a versioned, governed template library. The contribution rules exist to keep the audit trail useful: a reviewer in 2030 must be able to trace any production extraction back to the exact prompt and schema that produced it.

## Golden rules

1. **Never edit a Published template.** A `(Code, Version)` pair is immutable once `Status = Published`. To correct a bug or change behaviour, bump the version.
2. **Cite every fact.** Any new template must require a `citation` on every extracted fact and ship a `Verbatim preservation` guardrail.
3. **Schema first.** Write or update the `*.output-schema.json` before editing the template. The schema is the contract the runtime enforces; the system prompt should match it, not the other way around.
4. **One JSON object out.** The system prompt must end with a clear `<output_contract>` and instruct the model to emit exactly one JSON object beginning with `{` and ending with `}`. No prose. No markdown fences.

## Versioning

Semantic versioning, with these conventions specific to template artifacts:

| Bump | When to use |
|---|---|
| **PATCH** (1.0.0 \u2192 1.0.1) | Typo fixes, clarifications to invariants that don't change extraction behaviour or schema. |
| **MINOR** (1.0.0 \u2192 1.1.0) | Additive schema changes (new optional fields, new enum values, new few-shot examples). New guardrails that don't reject previously valid completions. |
| **MAJOR** (1.0.0 \u2192 2.0.0) | Breaking schema changes (removed required fields, narrowed enums, renamed keys). Any change downstream consumers must adapt to. |

## Adding a new template

1. Pick the closest existing template and copy both `*.template.json` and `*.output-schema.json`.
2. Rename to `<Code>.template.json` / `<Code>.output-schema.json`. The codes follow `<DOMAIN>-<NN>-<Purpose>` (e.g. `ENG-04-Test-Case-Generator`).
3. Update the `_entity-model.json` table at the top of `primitives/templates/README.md` if you're adding a new domain.
4. Keep the system prompt's standard sections: `<role>`, `<mandate>`, `<invariants>`, `<output_contract>`. Add `<field_guide>` only for domain-heavy extractions.
5. Number every invariant. Each invariant should be testable by either the schema or a guardrail.
6. Ship at most two few-shot examples. Examples are expensive context.
7. Add a Wave entry to `README.md` if the new template is part of an upcoming wave release.

## Editing a Draft template

`Draft` templates are editable. PRs that edit a `Draft` template are reviewed for:

- Schema validity (draft 2020-12).
- Output-schema's `additionalProperties: false` discipline.
- Citation requirement on every extracted record.
- Few-shot example outputs validate against the output schema.
- Invariants are numbered, testable, and consistent with the schema.

## Promoting Draft \u2192 Published

In the production framework, this is a Mendix-side state transition gated on the evaluation harness. In this repository, we mark the version as Published in the template JSON only after the evaluation gate runs in the consuming project and the metrics in section 8.1 of the design spec are met.

## PR checklist

- [ ] Schema validates as JSON Schema draft 2020-12.
- [ ] Every few-shot example output validates against the schema.
- [ ] No edits to a `Status = Published` template (use a new version instead).
- [ ] `MinConfidenceThreshold` chosen consistent with downstream consequence (see existing templates as anchors: 0.75 contracts review, 0.80 engineering / shop-floor).
- [ ] Sensitive defaults: `Temperature = 0.0`, `RequiresCitation = true`, `DataSensitivityTier` set explicitly.
- [ ] README and `_entity-model.json` updated if entity shape changed.

## Author identity for tracked changes

This repository is single-author by default. When opening a PR, please use your real name and an email tied to your GitHub account so the audit trail downstream resolves to a person.
