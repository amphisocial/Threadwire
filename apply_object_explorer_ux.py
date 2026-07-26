#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count == 0 and new in text:
        return text
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exactly one original block, found {count}. No files changed."
        )
    return text.replace(old, new, 1)


OBJECT_EXPLORER_COMPONENT = r'''
function displayObjectValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function ObjectExplorerModal({
  entity, objects, selectedObject, onSelect, onClose, onTraceImpact,
  onOpenObjects, relationships, actions, onRunAction, loading,
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("overview");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return objects;
    return objects.filter((object) =>
      `${object.objectKey} ${JSON.stringify(object.properties || {})}`.toLowerCase().includes(q)
    );
  }, [objects, query]);

  const currentIndex = selectedObject
    ? filtered.findIndex((object) => object.objectKey === selectedObject.objectKey)
    : -1;
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;
  const activeObject = currentIndex >= 0 ? selectedObject : filtered[0] || null;
  const entityRelationships = (relationships || []).filter(
    (relationship) =>
      relationship.fromEntityKey === entity?.entityKey ||
      relationship.toEntityKey === entity?.entityKey
  );
  const entityActions = (actions || []).filter(
    (action) => action.entityKey === "*" || action.entityKey === entity?.entityKey
  );

  const propertyDefinitions = entity?.properties || [];
  const knownKeys = new Set(propertyDefinitions.map((property) => property.propertyKey));
  const unknownProperties = Object.keys(activeObject?.properties || {})
    .filter((key) => !knownKeys.has(key))
    .map((key, index) => ({
      propertyKey: key,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()),
      dataType: typeof activeObject?.properties?.[key],
      sourceSystem: entity?.sourceSystem || "Threadwire",
      sourceColumn: key,
      sortOrder: 1000 + index,
    }));
  const allProperties = [...propertyDefinitions, ...unknownProperties].sort(
    (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
  );

  const navigate = (delta) => {
    if (!filtered.length) return;
    const nextIndex = Math.max(0, Math.min(filtered.length - 1, activeIndex + delta));
    onSelect(filtered[nextIndex]);
  };

  useEffect(() => {
    if (filtered.length && (!selectedObject || currentIndex < 0)) onSelect(filtered[0]);
  }, [filtered, selectedObject, currentIndex, onSelect]);

  useEffect(() => {
    setTab("overview");
  }, [entity?.entityKey]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const keyHandler = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") navigate(-1);
      if (event.key === "ArrowRight") navigate(1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", keyHandler);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", keyHandler);
    };
  });

  if (!entity) return null;

  const loadedLabel =
    entity.count > objects.length
      ? `${objects.length} of ${entity.count} loaded`
      : `${entity.count} object${entity.count === 1 ? "" : "s"}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ontology-object-explorer-title"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 135, padding: 18,
        background: "rgba(21,34,45,.62)", backdropFilter: "blur(6px)",
        display: "grid", placeItems: "center",
      }}
    >
      <style>{`
        .ont-object-explorer-body{display:grid;grid-template-columns:310px minmax(0,1fr);min-height:0;flex:1}
        .ont-object-properties{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        @media(max-width:900px){
          .ont-object-explorer-body{grid-template-columns:1fr;overflow:auto}
          .ont-object-list{max-height:260px!important;border-right:0!important;border-bottom:1px solid #DCE3EC}
          .ont-object-properties{grid-template-columns:1fr}
        }
      `}</style>
      <div style={{
        width: "min(1280px,100%)", height: "min(880px,calc(100vh - 36px))",
        background: "#fff", border: "1px solid #C6D2E0", borderRadius: 18,
        boxShadow: "0 34px 100px rgba(21,34,45,.38)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          padding: "15px 18px", borderBottom: "1px solid #DCE3EC",
          display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap",
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center",
            color: "#fff", background: entity.color || "#2A46C4",
          }}><Database size={19} /></div>
          <div>
            <div id="ontology-object-explorer-title" style={{ font: "800 20px 'Bricolage Grotesque',sans-serif" }}>
              {entity.label} Object Explorer
            </div>
            <div style={{ color: "#687F8E", font: "10px monospace" }}>
              {loadedLabel} · {entity.sourceKind === "core_table" ? entity.sourceTable : "custom ontology store"} · tenant scoped
            </div>
          </div>
          <button type="button" onClick={onOpenObjects} style={{ ...button(), marginLeft: "auto" }}>
            <Database size={14} />Open full Objects workspace
          </button>
          <button type="button" onClick={onClose} aria-label="Close object explorer"
            style={{ border: 0, background: "transparent", color: "#47606F", cursor: "pointer", padding: 7 }}>
            <X size={20} />
          </button>
        </div>

        <div className="ont-object-explorer-body">
          <aside className="ont-object-list" style={{
            borderRight: "1px solid #DCE3EC", background: "#F7F9FC",
            display: "flex", flexDirection: "column", minHeight: 0,
          }}>
            <div style={{ padding: 12, borderBottom: "1px solid #DCE3EC" }}>
              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: 10, top: 11, color: "#687F8E" }} />
                <input
                  autoFocus value={query} onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Search ${entity.label.toLowerCase()} objects`}
                  style={{ ...input, paddingLeft: 33 }}
                />
              </div>
              <div style={{ marginTop: 7, color: "#687F8E", font: "10px monospace" }}>
                {filtered.length} matching · use ↑/↓ list or ←/→ object navigation
              </div>
            </div>
            <div style={{ overflow: "auto", padding: 8, display: "grid", gap: 5 }}>
              {loading && <div style={{ padding: 24, textAlign: "center", color: "#687F8E" }}><Loader2 size={18} className="spin" /> Loading objects…</div>}
              {!loading && filtered.map((object, index) => {
                const selected = activeObject?.objectKey === object.objectKey;
                const preview = Object.entries(object.properties || {})
                  .filter(([, value]) => value !== null && value !== undefined && value !== "")
                  .slice(0, 2)
                  .map(([key, value]) => `${key.replace(/_/g, " ")}: ${displayObjectValue(value)}`)
                  .join(" · ");
                return (
                  <button key={object.objectKey} type="button" onClick={() => onSelect(object)}
                    style={{
                      border: selected ? `1px solid ${entity.color || "#2A46C4"}` : "1px solid transparent",
                      background: selected ? "#EEF2FF" : "#fff", borderRadius: 10,
                      padding: "10px 11px", textAlign: "left", cursor: "pointer", color: "#15222D",
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: entity.color || "#2A46C4" }} />
                      <b style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis" }}>{object.objectKey}</b>
                      <span style={{ marginLeft: "auto", color: "#8093A0", font: "9px monospace" }}>{index + 1}</span>
                    </div>
                    <div style={{
                      marginTop: 5, color: "#687F8E", font: "9px monospace",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{preview || "No populated properties"}</div>
                  </button>
                );
              })}
              {!loading && !filtered.length && <div style={{ padding: 24, textAlign: "center", color: "#687F8E" }}>No matching objects.</div>}
            </div>
          </aside>

          <section style={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {!activeObject ? (
              <div style={{ flex: 1, display: "grid", placeItems: "center", color: "#687F8E" }}>
                {loading ? "Loading objects…" : "No objects are available for this organization."}
              </div>
            ) : (
              <>
                <div style={{
                  padding: "14px 17px", borderBottom: "1px solid #DCE3EC",
                  display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#687F8E", font: "10px monospace" }}>{entity.label} / object</div>
                    <div style={{
                      font: "800 19px 'Bricolage Grotesque',sans-serif",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{activeObject.objectKey}</div>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color: "#687F8E", font: "10px monospace" }}>
                      {activeIndex + 1} of {filtered.length}
                    </span>
                    <button type="button" onClick={() => navigate(-1)} disabled={activeIndex <= 0}
                      aria-label="Previous object" style={{ ...button(), padding: "7px 9px" }}>
                      <ChevronRight size={15} style={{ transform: "rotate(180deg)" }} />Prev
                    </button>
                    <button type="button" onClick={() => navigate(1)} disabled={activeIndex >= filtered.length - 1}
                      aria-label="Next object" style={{ ...button(), padding: "7px 9px" }}>
                      Next<ChevronRight size={15} />
                    </button>
                  </div>
                </div>

                <div style={{
                  padding: "9px 16px", borderBottom: "1px solid #DCE3EC",
                  display: "flex", gap: 6, flexWrap: "wrap", background: "#FAFBFD",
                }}>
                  {[["overview", "Overview"], ["lineage", "Property lineage"], ["related", "Relationships"], ["actions", "Actions"]].map(([key, label]) =>
                    <button key={key} type="button" onClick={() => setTab(key)}
                      style={{ ...button(tab === key), padding: "7px 10px" }}>{label}</button>
                  )}
                  <button type="button" onClick={() => onTraceImpact(activeObject)}
                    style={{ ...button(), marginLeft: "auto", padding: "7px 10px" }}>
                    <Network size={14} />Trace live impact
                  </button>
                </div>

                <div style={{ padding: 17, overflow: "auto", minHeight: 0, flex: 1 }}>
                  {tab === "overview" && <>
                    <div style={{
                      display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))",
                      gap: 8, marginBottom: 14,
                    }}>
                      {[
                        ["Object key", activeObject.objectKey],
                        ["Authority", entity.sourceKind === "core_table" ? entity.sourceTable : "ontology_custom_objects"],
                        ["Source", entity.sourceSystem],
                        ["Tenant isolation", "org_id enforced"],
                      ].map(([label, value]) => <div key={label} style={{ padding: 11, borderRadius: 10, background: "#F5F8FC", border: "1px solid #E3E9F0" }}>
                        <div style={{ color: "#687F8E", font: "9px monospace", textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</div>
                        <div style={{ marginTop: 4, fontWeight: 700, fontSize: 12, overflowWrap: "anywhere" }}>{value}</div>
                      </div>)}
                    </div>
                    <div className="ont-object-properties">
                      {allProperties.map((property) => {
                        const value = activeObject.properties?.[property.propertyKey];
                        return <div key={property.propertyKey} style={{
                          padding: 12, border: "1px solid #DCE3EC", borderRadius: 11,
                          minWidth: 0, background: "#fff",
                        }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <b style={{ fontSize: 12 }}>{property.label}</b>
                            {property.isKey && <span style={{ marginLeft: "auto", padding: "2px 6px", borderRadius: 999, background: "#EEF2FF", color: "#2A46C4", font: "9px monospace" }}>KEY</span>}
                          </div>
                          <div style={{
                            marginTop: 7, color: value === null || value === undefined || value === "" ? "#91A0AA" : "#15222D",
                            whiteSpace: typeof value === "object" ? "pre-wrap" : "normal",
                            font: "12px 'IBM Plex Mono',monospace", overflowWrap: "anywhere",
                          }}>{displayObjectValue(value)}</div>
                          <div style={{ marginTop: 8, color: "#8093A0", font: "9px monospace" }}>
                            {property.dataType || "text"} · {property.sourceSystem || entity.sourceSystem}:{property.sourceColumn || property.propertyKey}
                          </div>
                        </div>;
                      })}
                    </div>
                    {(activeObject.createdAt || activeObject.updatedAt) && <div style={{ marginTop: 14, color: "#687F8E", font: "10px monospace" }}>
                      Created {activeObject.createdAt || "—"} · Updated {activeObject.updatedAt || "—"}
                    </div>}
                  </>}

                  {tab === "lineage" && <div style={{ border: "1px solid #DCE3EC", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: 13, background: "#F5F8FC", borderBottom: "1px solid #DCE3EC" }}>
                      <b>Property-level lineage</b>
                      <div style={{ color: "#687F8E", fontSize: 12, marginTop: 3 }}>
                        Values remain in their authoritative Threadwire tables; the ontology supplies semantic meaning.
                      </div>
                    </div>
                    {allProperties.map((property) => <div key={property.propertyKey} style={{
                      display: "grid", gridTemplateColumns: "minmax(160px,1fr) minmax(180px,1fr) auto",
                      gap: 12, padding: "11px 13px", borderBottom: "1px solid #EEF2F7", alignItems: "center",
                    }}>
                      <div><b style={{ fontSize: 12 }}>{property.label}</b><div style={{ color: "#8093A0", font: "10px monospace" }}>{property.propertyKey}</div></div>
                      <div style={{ color: "#47606F", font: "10px monospace" }}>{property.sourceSystem || entity.sourceSystem}<br />{entity.sourceTable || "ontology_custom_objects"}.{property.sourceColumn || property.propertyKey}</div>
                      <div style={{ textAlign: "right", color: "#687F8E", font: "10px monospace" }}>{property.dataType}{property.isKey ? " · key" : ""}</div>
                    </div>)}
                  </div>}

                  {tab === "related" && <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ ...card, padding: 14 }}>
                      <b>Ontology relationships for {entity.label}</b>
                      <div style={{ color: "#687F8E", fontSize: 12, marginTop: 4 }}>
                        These are schema-level links. Trace live impact to retrieve linked operational objects for this record.
                      </div>
                    </div>
                    {entityRelationships.map((relationship) => {
                      const outbound = relationship.fromEntityKey === entity.entityKey;
                      return <div key={relationship.relationshipKey} style={{ ...card, padding: 13, display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                        <div><b>{outbound ? entity.label : relationship.fromEntityKey} {relationship.label} {outbound ? relationship.toEntityKey : entity.label}</b>
                          <div style={{ color: "#687F8E", font: "10px monospace", marginTop: 4 }}>{relationship.relationshipKey} · {relationship.sourceKind}{relationship.sourceTable ? `:${relationship.sourceTable}` : ""}</div>
                        </div>
                        <span style={{ color: "#47606F", font: "10px monospace" }}>{relationship.cardinality}</span>
                      </div>;
                    })}
                    {!entityRelationships.length && <div style={{ ...card, padding: 24, textAlign: "center", color: "#687F8E" }}>No relationship types are configured for this object type.</div>}
                    <button type="button" onClick={() => onTraceImpact(activeObject)} style={{ ...button(true), justifySelf: "start" }}><Network size={14} />Load linked objects and impact</button>
                  </div>}

                  {tab === "actions" && <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ ...card, padding: 14 }}>
                      <b>Governed actions for {activeObject.objectKey}</b>
                      <div style={{ color: "#687F8E", fontSize: 12, marginTop: 4 }}>
                        Actions create an auditable request. They do not silently edit operational tables.
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {entityActions.map((action) => <button key={action.actionKey} type="button"
                        onClick={() => onRunAction(action, activeObject)} style={button(true)}>
                        <ShieldCheck size={14} />{action.label}{action.requiresApproval ? " · approval" : ""}
                      </button>)}
                    </div>
                    {!entityActions.length && <div style={{ ...card, padding: 24, textAlign: "center", color: "#687F8E" }}>No actions are configured for this object type.</div>}
                  </div>}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
'''


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    path = Path("frontend/src/ontology/OntologyStudio.jsx")
    if not path.is_file():
        raise SystemExit("Run this script from the Threadwire repository root.")

    original = path.read_text(encoding="utf-8")
    updated = original

    component_marker = "\nexport default function OntologyStudio({ user, onBack }) {"
    if "function ObjectExplorerModal({" not in updated:
        if component_marker not in updated:
            raise RuntimeError("Object Explorer component insertion point was not found.")
        updated = updated.replace(component_marker, "\n" + OBJECT_EXPLORER_COMPONENT + component_marker, 1)

    updated = replace_once(
        updated,
        '''  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [impact, setImpact] = useState(null);
''',
        '''  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [objectExplorerOpen, setObjectExplorerOpen] = useState(false);
  const [objectExplorerLoading, setObjectExplorerLoading] = useState(false);
  const [impact, setImpact] = useState(null);
''',
        "Object Explorer state",
    )

    updated = replace_once(
        updated,
        '''  useEffect(() => { loadModel(); }, [loadModel]);
  const selectedEntity = model?.entities?.find((e) => e.entityKey === selectedKey) || null;

  const loadObjects = useCallback(async () => {
''',
        '''  useEffect(() => { loadModel(); }, [loadModel]);
  const selectedEntity = model?.entities?.find((e) => e.entityKey === selectedKey) || null;

  const openObjectExplorer = async (entity) => {
    if (!entity) return;
    setSelectedKey(entity.entityKey);
    setSelectedObject(null);
    setObjectExplorerOpen(true);
    setObjectExplorerLoading(true);
    setError("");
    try {
      const data = await api(`/api/workforce/ontology/objects/${encodeURIComponent(entity.entityKey)}?limit=300`);
      const rows = data.objects || [];
      setObjects(rows);
      setSelectedObject(rows[0] || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setObjectExplorerLoading(false);
    }
  };

  const loadObjects = useCallback(async () => {
''',
        "open Object Explorer handler",
    )

    updated = replace_once(
        updated,
        '''  const runAction = async (action) => {
    if (!selectedObject) return setError("Select an object first");
    try {
      await api("/api/workforce/ontology/actions/runs", { method: "POST", body: JSON.stringify({ action_key: action.actionKey, entity_key: selectedKey, object_key: selectedObject.objectKey, input: { source: "Ontology Studio" } }) });
''',
        '''  const runAction = async (action, object = selectedObject) => {
    if (!object) return setError("Select an object first");
    try {
      await api("/api/workforce/ontology/actions/runs", { method: "POST", body: JSON.stringify({ action_key: action.actionKey, entity_key: selectedKey, object_key: object.objectKey, input: { source: "Ontology Studio" } }) });
''',
        "run actions from Object Explorer",
    )

    updated = replace_once(
        updated,
        '''<span style={{ marginLeft: "auto", font: "10px monospace", color: "#687F8E" }}>{e.count}</span>''',
        '''<span role="button" tabIndex={0} title={`Browse ${e.count} ${e.label} objects`}
                  onClick={(event) => { event.stopPropagation(); openObjectExplorer(e); }}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); openObjectExplorer(e); } }}
                  style={{ marginLeft: "auto", font: "10px monospace", color: "#2A46C4", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}>{e.count}</span>''',
        "sidebar object count interaction",
    )

    updated = replace_once(
        updated,
        '''<span style={{ marginLeft: "auto", color: "#687F8E", font: "10px monospace" }}>{selectedEntity.count} objects</span>''',
        '''<button type="button" onClick={() => openObjectExplorer(selectedEntity)}
                    title={`Browse all ${selectedEntity.count} ${selectedEntity.label} objects`}
                    style={{ marginLeft: "auto", border: 0, background: "transparent", color: "#2A46C4", font: "600 10px 'IBM Plex Mono',monospace", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
                    {selectedEntity.count} objects
                  </button>''',
        "detail card object count interaction",
    )

    updated = replace_once(
        updated,
        '''      </main>
      {showCreate && <div role="dialog"''',
        '''      </main>
      {objectExplorerOpen && <ObjectExplorerModal
        entity={selectedEntity}
        objects={objects}
        selectedObject={selectedObject}
        onSelect={setSelectedObject}
        onClose={() => setObjectExplorerOpen(false)}
        loading={objectExplorerLoading}
        relationships={model?.relationships || []}
        actions={model?.actions || []}
        onOpenObjects={() => { setObjectExplorerOpen(false); setSearch(""); setMode("objects"); }}
        onTraceImpact={(object) => { setObjectExplorerOpen(false); setSelectedObject(object); runImpact(object); }}
        onRunAction={runAction}
      />}
      {showCreate && <div role="dialog"''',
        "Object Explorer modal rendering",
    )

    if updated == original:
        print("Object Explorer UX is already applied. No files changed.")
        return 0

    print("All expected source blocks matched.")
    print(f"  {path}: ready ({len(updated) - len(original):+d} bytes)")
    if args.check:
        print("Check only: no files changed.")
        return 0

    backup = path.with_name(path.name + ".bak-before-object-explorer")
    if not backup.exists():
        shutil.copy2(path, backup)
    path.write_text(updated, encoding="utf-8")
    print("Threadwire Object Explorer UX applied.")
    print("Next: git diff --check && cd frontend && npm run build")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
