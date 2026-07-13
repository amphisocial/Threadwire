/* =========================================================================
   AI Workbench — curated prompt store
   -------------------------------------------------------------------------
   Each agent runs an admin-owned "curated prompt". Admins edit these in the
   Admin ▸ AI Workbench tab; engineers may fine-tune a copy for a single run
   inside each agent, but the saved baseline lives here.

   Persistence: saved edits are held in localStorage under WB_PROMPT_KEY so an
   admin's changes are picked up by every agent on the same browser. In
   production this is the seam to a backend endpoint (GET/PUT curated prompts
   per org) — swap loadPrompts()/savePrompt() for API calls without touching
   the UI.
   ========================================================================= */

export const AGENT_META = {
  extractor: {
    name: "Requirements Extractor", v: "v3.2",
    vars: ["{document}", "{section}", "{page/line}", "{project_context}"],
  },
  derivation: {
    name: "Derivation Assistant", v: "v2.1",
    vars: ["{parent_id}", "{parent_text}", "{project_context}", "{applicable_standards}"],
  },
  testgen: {
    name: "Test Case Generator", v: "v1.4",
    vars: ["{requirement_id}", "{requirement_text}", "{verification_method}", "{project_context}"],
  },
  cdrl: {
    name: "CDRL Drafter", v: "v1.1",
    vars: ["{did_number}", "{cdrl_title}", "{format_template}", "{project_data}"],
  },
};

export const DEFAULT_PROMPTS = {
  extractor: `ROLE: You are a systems engineering requirements analyst.

TASK: Review the source document(s) and identify every candidate requirement. A candidate is any statement that imposes a binding condition, capability, constraint, or interface on the system.

RULES:
- Normalize each candidate to a single "shall" statement.
- Classify as: Functional | Performance | Interface | Environmental | Safety | Design Constraint.
- Flag non-binding language ("should", "will", "may") for engineer confirmation.
- Capture ORIGIN for every candidate: {document}, {section}, {page/line}.
- If a Figure or Table is referenced near the requirement, attach it.
- Do NOT invent requirements not grounded in the source text.`,

  derivation: `ROLE: You are a systems engineer performing requirements decomposition.

TASK: For each selected PARENT requirement, propose the child (derived) requirements necessary and sufficient to satisfy it.

RULES:
- Every derived requirement MUST trace to exactly one parent {parent_id}.
- Provide a one-sentence RATIONALE grounded in engineering analysis (budgets, apportionment, standards).
- If essential context is missing (RCS, LRU count, MTTR, timing reserve), REQUEST it before deriving.
- Use apportionment where a parent budget must be split across subsystems.
- Maintain "shall" phrasing and testability.`,

  testgen: `ROLE: You are a verification & validation engineer authoring test cases.

TASK: For each selected requirement {requirement_id}, generate the test case(s) and step-by-step procedure needed to verify it.

RULES:
- Select the appropriate verification method: Test | Analysis | Inspection | Demonstration.
- Each test case MUST trace to exactly one requirement.
- Provide: objective, preconditions, numbered procedure steps, expected result, and explicit pass/fail criteria.
- Make every step observable and unambiguous; quantify tolerances where the requirement is quantitative.
- Prefer Test for performance/functional requirements; Inspection for design constraints; Analysis where test is impractical.
- Do NOT assert verification of anything the requirement does not state.`,

  cdrl: `ROLE: You are a technical documentation specialist drafting a Contract Data Requirements List (CDRL) deliverable.

TASK: Using the PROVIDED FORMAT (a Data Item Description or a completed CDRL example), produce a draft that follows that format exactly and is populated with the relevant PROJECT DATA supplied.

RULES:
- Mirror the section structure, numbering, headings and ordering of the provided format template {format_template}.
- Populate each section only with facts grounded in the supplied project technical data {project_data}; mark any gap as "[TBD — data not provided]".
- Preserve required boilerplate, distribution statements and formatting conventions from the template.
- Retain any company logos / letterhead from the template for the exported document.
- Do NOT invent program facts, part numbers, or test results.`,
};

const WB_PROMPT_KEY = "tw_wb_prompts_v1";

function readStore() {
  try {
    const raw = typeof localStorage !== "undefined" && localStorage.getItem(WB_PROMPT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

/** Return the effective curated prompt for an agent (admin override or default). */
export function getPrompt(agentKey) {
  const store = readStore();
  return (store && typeof store[agentKey] === "string") ? store[agentKey] : DEFAULT_PROMPTS[agentKey];
}

/** Return all effective prompts keyed by agent. */
export function loadPrompts() {
  const store = readStore();
  const out = {};
  Object.keys(DEFAULT_PROMPTS).forEach((k) => {
    out[k] = (store && typeof store[k] === "string") ? store[k] : DEFAULT_PROMPTS[k];
  });
  return out;
}

/** Persist an admin edit for one agent. Pass null/undefined to reset to default. */
export function savePrompt(agentKey, text) {
  try {
    const store = readStore();
    if (text == null || text === DEFAULT_PROMPTS[agentKey]) delete store[agentKey];
    else store[agentKey] = text;
    localStorage.setItem(WB_PROMPT_KEY, JSON.stringify(store));
  } catch (e) { /* non-fatal */ }
}

/** True when an agent's saved prompt differs from the shipped default. */
export function isCustomized(agentKey) {
  const store = readStore();
  return !!(store && typeof store[agentKey] === "string" && store[agentKey] !== DEFAULT_PROMPTS[agentKey]);
}
