# Operations / Ontology / AI Studio → Delivery only

The floating workspace switcher (Operations · Ontology · AI Studio) and the
Ontology / AI Studio views lived in main.jsx and rendered for any signed-in user
on every build. They belong to Delivery. main.jsx now gates them behind
`buildTarget === "delivery"`, so:
- delivery.threadwire.ai → switcher + Ontology + AI Studio show (unchanged)
- workforce.threadwire.ai / requirements.threadwire.ai → never shown; always the product app

One changed file (`src/main.jsx`), identical across all four apps.
Deploy: `bash redeploy-multi.sh` (or per app). No backend/migration change.
