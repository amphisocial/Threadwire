# Workforce Intelligence — import templates

Drop-in examples for the **Data & Admin** tab of the Workforce Intelligence module.

- `people.csv` — one row per person. Columns: `name, discipline, location, seniority`.
  Discipline accepts a code (SW, FW, EE, ME, SE, TE, PM) or a name (Software, Firmware…).
  Seniority accepts 1/2/3 or Junior/Mid/Senior.
- `projects.csv` — one row per project. Columns: `code, name, manager, lead, phase, customer`.
- `aurora-baseline.xml` — a Microsoft Project (MSPDI) export. In MS Project use
  **File → Save As → XML (*.xml)**. Task `Work` is rolled up into a monthly plan that
  becomes the budget track on each project's demand bar. The plan is matched to a
  project by name (a new project is created if none matches).

Headers are matched case-insensitively and common synonyms are accepted
(e.g. `team`/`department` for discipline, `site`/`office` for location).
