import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check, CheckSquare, ChevronLeft, ChevronRight, Columns3, Database,
  Filter, FolderOpen, LayoutGrid, Link2, ListChecks, Loader2, Network,
  Pencil, Plus, Save, Search, ShieldCheck, Square, Table2, Trash2, X,
} from "lucide-react";

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : `Request failed (${response.status})`);
  }
  return data;
};

const input = {
  width: "100%", border: "1px solid #C6D2E0", borderRadius: 9,
  padding: "9px 11px", background: "#fff", color: "#15222D",
  font: "12px 'IBM Plex Mono',monospace", outline: "none",
};
const button = (primary = false) => ({
  border: primary ? "none" : "1px solid #C6D2E0", borderRadius: 9,
  padding: "8px 11px",
  background: primary ? "linear-gradient(180deg,#2A46C4,#1B2E8C)" : "#fff",
  color: primary ? "#fff" : "#29404E", cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  gap: 7, font: "600 11px 'IBM Plex Mono',monospace",
});
const card = {
  background: "#fff", border: "1px solid #DCE3EC", borderRadius: 12,
  boxShadow: "0 1px 2px rgba(21,34,45,.04)",
};

const OPERATORS = [
  ["contains", "contains"], ["equals", "equals"], ["not_equals", "does not equal"],
  ["starts_with", "starts with"], ["ends_with", "ends with"],
  ["gt", ">"], ["gte", "≥"], ["lt", "<"], ["lte", "≤"],
  ["is_empty", "is empty"], ["is_not_empty", "is not empty"],
];

const labelize = (value) =>
  String(value || "").replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

const displayValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

const objectValue = (object, property) =>
  property === "objectKey" ? object?.objectKey : object?.properties?.[property];

function ArtifactPanel({ saved, onLoadExploration, onLoadList, onDelete, onClose }) {
  return (
    <div style={{
      position: "absolute", right: 52, top: 58, zIndex: 8, width: 380,
      maxHeight: 520, overflow: "auto", padding: 12, ...card,
      boxShadow: "0 18px 55px rgba(21,34,45,.22)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FolderOpen size={16} color="#2A46C4" /><b>Saved explorations and lists</b>
        <button onClick={onClose} style={{ marginLeft: "auto", border: 0, background: "none", cursor: "pointer" }}><X size={15} /></button>
      </div>
      <div style={{ marginTop: 12, color: "#687F8E", font: "10px monospace" }}>EXPLORATIONS</div>
      <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
        {(saved.explorations || []).map((item) => (
          <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, padding: 9, border: "1px solid #E3E9F0", borderRadius: 9 }}>
            <button onClick={() => onLoadExploration(item)} style={{ border: 0, background: "none", textAlign: "left", cursor: "pointer", color: "#15222D" }}>
              <b>{item.name}</b><div style={{ color: "#7B8E9A", font: "9px monospace" }}>{item.entity_key} · {item.is_shared ? "shared" : "private"}</div>
            </button>
            <button onClick={() => onDelete("explorations", item.id)} style={{ border: 0, background: "none", cursor: "pointer", color: "#AC3247" }}><Trash2 size={14} /></button>
          </div>
        ))}
        {!saved.explorations?.length && <div style={{ color: "#91A0AA", fontSize: 12 }}>No saved explorations.</div>}
      </div>
      <div style={{ marginTop: 14, color: "#687F8E", font: "10px monospace" }}>OBJECT LISTS</div>
      <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
        {(saved.lists || []).map((item) => (
          <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, padding: 9, border: "1px solid #E3E9F0", borderRadius: 9 }}>
            <button onClick={() => onLoadList(item)} style={{ border: 0, background: "none", textAlign: "left", cursor: "pointer", color: "#15222D" }}>
              <b>{item.name}</b><div style={{ color: "#7B8E9A", font: "9px monospace" }}>{item.entity_key} · {(item.object_keys || []).length} objects · {item.is_shared ? "shared" : "private"}</div>
            </button>
            <button onClick={() => onDelete("lists", item.id)} style={{ border: 0, background: "none", cursor: "pointer", color: "#AC3247" }}><Trash2 size={14} /></button>
          </div>
        ))}
        {!saved.lists?.length && <div style={{ color: "#91A0AA", fontSize: 12 }}>No saved lists.</div>}
      </div>
    </div>
  );
}

export default function AdvancedObjectExplorer({
  entity, entities = [], objects = [], selectedObject, onSelect, onNavigateEntity, onClose,
  onOpenObjects, relationships = [], actions = [], loading = false,
}) {
  const [activeEntity, setActiveEntity] = useState(entity);
  const [rows, setRows] = useState(objects);
  const [activeObject, setActiveObject] = useState(selectedObject || objects[0] || null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState([]);
  const [match, setMatch] = useState("all");
  const [sorts, setSorts] = useState([{ property: "objectKey", direction: "asc" }]);
  const [viewMode, setViewMode] = useState("list");
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState(loading);
  const [meta, setMeta] = useState({ matched: objects.length, total: entity?.count || objects.length });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [saved, setSaved] = useState({ explorations: [], lists: [] });
  const [saveDialog, setSaveDialog] = useState(null);
  const [saveName, setSaveName] = useState("");
  const [saveShared, setSaveShared] = useState(false);
  const [linked, setLinked] = useState(null);
  const [linkedBusy, setLinkedBusy] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editJson, setEditJson] = useState("{}");
  const [actionKey, setActionKey] = useState("");

  useEffect(() => {
    setActiveEntity(entity);
    setRows(objects);
    setActiveObject(selectedObject || objects[0] || null);
    setMeta({ matched: objects.length, total: entity?.count || objects.length });
    setVisibleColumns((entity?.properties || []).slice(0, 6).map((property) => property.propertyKey));
  }, [entity, objects, selectedObject]);

  const propertyDefinitions = useMemo(() => {
    const definitions = activeEntity?.properties || [];
    const known = new Set(definitions.map((item) => item.propertyKey));
    const extras = Object.keys(activeObject?.properties || {})
      .filter((key) => !known.has(key))
      .map((key, index) => ({
        propertyKey: key, label: labelize(key), dataType: typeof activeObject?.properties?.[key],
        sourceSystem: activeEntity?.sourceSystem || "Threadwire", sourceColumn: key,
        sortOrder: 1000 + index,
      }));
    return [...definitions, ...extras].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  }, [activeEntity, activeObject]);

  const entityActions = actions.filter((action) => action.entityKey === "*" || action.entityKey === activeEntity?.entityKey);
  const currentIndex = activeObject ? rows.findIndex((row) => row.objectKey === activeObject.objectKey) : -1;

  const loadSaved = useCallback(async () => {
    try { setSaved(await api("/api/workforce/ontology/explorer/saved")); }
    catch (event) { setError(event.message); }
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  const runQuery = useCallback(async (overrides = {}) => {
    const targetEntity = overrides.entity || activeEntity;
    if (!targetEntity) return;
    const payload = {
      entity_key: targetEntity.entityKey,
      search: overrides.search ?? query,
      filters: overrides.filters ?? filters,
      match: overrides.match ?? match,
      sorts: overrides.sorts ?? sorts,
      limit: 500,
    };
    setBusy(true); setError("");
    try {
      const result = await api("/api/workforce/ontology/explorer/query", {
        method: "POST", body: JSON.stringify(payload),
      });
      const nextRows = result.objects || [];
      setActiveEntity(targetEntity);
      setRows(nextRows);
      setMeta(result);
      setActiveObject((current) =>
        nextRows.find((row) => row.objectKey === current?.objectKey) || nextRows[0] || null
      );
      setSelectedKeys(new Set());
      setLinked(null);
      return nextRows;
    } catch (event) {
      setError(event.message);
      return [];
    } finally { setBusy(false); }
  }, [activeEntity, query, filters, match, sorts]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (activeEntity) runQuery();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handler = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && currentIndex > 0) selectObject(rows[currentIndex - 1]);
      if (event.key === "ArrowRight" && currentIndex >= 0 && currentIndex < rows.length - 1) selectObject(rows[currentIndex + 1]);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handler);
    };
  });

  const selectObject = (object) => {
    setActiveObject(object);
    setLinked(null);
    setEditMode(false);
    onSelect?.(object);
  };

  const navigate = (delta) => {
    if (currentIndex < 0) return;
    const index = Math.max(0, Math.min(rows.length - 1, currentIndex + delta));
    selectObject(rows[index]);
  };

  const toggleSelected = (key) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedKeys((current) =>
      current.size === rows.length && rows.length ? new Set() : new Set(rows.map((row) => row.objectKey))
    );
  };

  const addFilter = () => {
    const property = propertyDefinitions[0]?.propertyKey || "objectKey";
    setFilters((current) => [...current, { property, operator: "contains", value: "" }]);
    setShowFilters(true);
  };

  const updateFilter = (index, patch) =>
    setFilters((current) => current.map((filter, itemIndex) => itemIndex === index ? { ...filter, ...patch } : filter));

  const removeFilter = (index) =>
    setFilters((current) => current.filter((_, itemIndex) => itemIndex !== index));

  const saveArtifact = async () => {
    if (!saveName.trim()) return;
    try {
      if (saveDialog === "exploration") {
        await api("/api/workforce/ontology/explorer/saved/explorations", {
          method: "POST",
          body: JSON.stringify({
            name: saveName.trim(), entity_key: activeEntity.entityKey, is_shared: saveShared,
            definition: {
              search: query, filters, match,
              sorts,
              columns: visibleColumns, viewMode,
            },
          }),
        });
      } else {
        const keys = selectedKeys.size ? [...selectedKeys] : rows.map((row) => row.objectKey);
        await api("/api/workforce/ontology/explorer/saved/lists", {
          method: "POST",
          body: JSON.stringify({
            name: saveName.trim(), entity_key: activeEntity.entityKey,
            object_keys: keys, is_shared: saveShared,
          }),
        });
      }
      setSaveDialog(null); setSaveName(""); setSaveShared(false);
      setNotice(saveDialog === "exploration" ? "Exploration saved" : "Object list saved");
      await loadSaved();
    } catch (event) { setError(event.message); }
  };

  const loadExploration = async (artifact) => {
    const nextEntity = entities.find((item) => item.entityKey === artifact.entity_key);
    if (!nextEntity) return setError("The saved exploration's entity type is unavailable");
    const definition = artifact.definition || {};
    setQuery(definition.search || "");
    setFilters(definition.filters || []);
    setMatch(definition.match || "all");
    setSorts(definition.sorts?.length ? definition.sorts : [{ property: "objectKey", direction: "asc" }]);
    setVisibleColumns(definition.columns || nextEntity.properties?.slice(0, 6).map((item) => item.propertyKey) || []);
    setViewMode(definition.viewMode || "list");
    setShowSaved(false);
    onNavigateEntity?.(nextEntity.entityKey, null);
    await runQuery({
      entity: nextEntity, search: definition.search || "", filters: definition.filters || [],
      match: definition.match || "all", sorts: definition.sorts || [{ property: "objectKey", direction: "asc" }],
    });
  };

  const loadList = async (artifact) => {
    const nextEntity = entities.find((item) => item.entityKey === artifact.entity_key);
    if (!nextEntity) return setError("The saved list's entity type is unavailable");
    setQuery(""); setFilters([]); setShowSaved(false);
    onNavigateEntity?.(nextEntity.entityKey, null);
    await runQuery({
      entity: nextEntity, search: "",
      filters: [{ property: "objectKey", operator: "in", value: artifact.object_keys || [] }],
      match: "all", sorts: [{ property: "objectKey", direction: "asc" }],
    });
  };

  const deleteArtifact = async (type, id) => {
    try {
      await api(`/api/workforce/ontology/explorer/saved/${type}/${id}`, { method: "DELETE" });
      await loadSaved();
    } catch (event) { setError(event.message); }
  };

  const loadLinked = async () => {
    if (!activeObject || !activeEntity) return;
    setLinkedBusy(true); setError("");
    try {
      setLinked(await api(
        `/api/workforce/ontology/explorer/linked/${encodeURIComponent(activeEntity.entityKey)}/${encodeURIComponent(activeObject.objectKey)}`
      ));
    } catch (event) { setError(event.message); }
    finally { setLinkedBusy(false); }
  };

  useEffect(() => {
    if (tab === "linked" && !linked) loadLinked();
  }, [tab, activeObject?.objectKey, activeEntity?.entityKey]);

  const openLinkedObject = async (entityKey, node) => {
    const nextEntity = entities.find((item) => item.entityKey === entityKey);
    if (!nextEntity) return setError(`Entity ${entityKey} is not available in this ontology`);
    const nextRows = await runQuery({
      entity: nextEntity, search: node.objectKey, filters: [], match: "all",
      sorts: [{ property: "objectKey", direction: "asc" }],
    });
    const exact = nextRows.find((row) => row.objectKey === node.objectKey) || {
      objectKey: node.objectKey, properties: node.properties || {},
    };
    setActiveObject(exact);
    onNavigateEntity?.(entityKey, exact);
    setTab("overview");
  };

  const runBulkAction = async (keys = [...selectedKeys], requestedActionKey = actionKey) => {
    if (!requestedActionKey || !keys.length) return;
    setBusy(true); setError("");
    try {
      const result = await api("/api/workforce/ontology/explorer/bulk-actions", {
        method: "POST",
        body: JSON.stringify({
          action_key: requestedActionKey, entity_key: activeEntity.entityKey,
          object_keys: keys, input: { selectedFrom: viewMode },
        }),
      });
      setNotice(`${result.created} action request${result.created === 1 ? "" : "s"} created · ${result.status}`);
      setSelectedKeys(new Set());
    } catch (event) { setError(event.message); }
    finally { setBusy(false); }
  };

  const startEdit = () => {
    setEditJson(JSON.stringify(activeObject?.properties || {}, null, 2));
    setEditMode(true);
  };

  const saveCustomObject = async () => {
    try {
      const properties = JSON.parse(editJson);
      const updated = await api(
        `/api/workforce/ontology/explorer/custom/${encodeURIComponent(activeEntity.entityKey)}/${encodeURIComponent(activeObject.objectKey)}`,
        { method: "PATCH", body: JSON.stringify({ properties, merge: false }) }
      );
      setRows((current) => current.map((row) => row.objectKey === updated.objectKey ? updated : row));
      setActiveObject(updated); setEditMode(false); setNotice("Custom object updated");
    } catch (event) { setError(event.message); }
  };

  const relationshipRows = relationships.filter(
    (relationship) =>
      relationship.fromEntityKey === activeEntity?.entityKey ||
      relationship.toEntityKey === activeEntity?.entityKey
  );

  const activeColumns = visibleColumns.length
    ? visibleColumns
    : propertyDefinitions.slice(0, 6).map((property) => property.propertyKey);

  if (!activeEntity) return null;

  return (
    <div role="dialog" aria-modal="true" style={{
      position: "fixed", inset: 0, zIndex: 140, padding: 14,
      background: "rgba(21,34,45,.64)", backdropFilter: "blur(6px)",
      display: "grid", placeItems: "center",
    }}>
      <style>{`
        .oe-body{display:grid;min-height:0;flex:1}
        .oe-props{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
        @media(max-width:980px){.oe-body{grid-template-columns:1fr!important;overflow:auto}.oe-left{max-height:330px;border-right:0!important;border-bottom:1px solid #DCE3EC}.oe-props{grid-template-columns:1fr}}
      `}</style>
      <div style={{
        width: "min(1500px,100%)", height: "min(930px,calc(100vh - 28px))",
        background: "#fff", border: "1px solid #C6D2E0", borderRadius: 18,
        boxShadow: "0 34px 100px rgba(21,34,45,.4)",
        display: "flex", flexDirection: "column", overflow: "hidden", position: "relative",
      }}>
        <header style={{ padding: "13px 16px", borderBottom: "1px solid #DCE3EC", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", color: "#fff", background: activeEntity.color || "#2A46C4" }}><Database size={19} /></div>
          <div><div style={{ font: "800 20px 'Bricolage Grotesque',sans-serif" }}>{activeEntity.label} Object Explorer</div>
            <div style={{ color: meta.scanCapped ? "#B27C12" : "#687F8E", font: "10px monospace" }}>{meta.returned ?? rows.length} shown · {meta.matched ?? rows.length} matching · {meta.total ?? activeEntity.count} total · org_id scoped{meta.scanCapped ? ` · first ${meta.scanLimit} scanned` : ""}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap", position: "relative" }}>
            <button onClick={() => setShowFilters((value) => !value)} style={button(showFilters)}><Filter size={14} />Filters{filters.length ? ` (${filters.length})` : ""}</button>
            <button onClick={() => setShowColumns((value) => !value)} style={button(showColumns)}><Columns3 size={14} />Columns</button>
            <button onClick={() => { setSaveDialog("exploration"); setSaveName(""); }} style={button()}><Save size={14} />Save view</button>
            <button onClick={() => { setSaveDialog("list"); setSaveName(""); }} style={button()}><ListChecks size={14} />Save list</button>
            <button onClick={() => setShowSaved((value) => !value)} style={button()}><FolderOpen size={14} />Saved</button>
            <button onClick={onOpenObjects} style={button()}><Database size={14} />Objects workspace</button>
            <button onClick={onClose} aria-label="Close" style={{ border: 0, background: "none", cursor: "pointer", padding: 7 }}><X size={19} /></button>
            {showSaved && <ArtifactPanel saved={saved} onLoadExploration={loadExploration} onLoadList={loadList} onDelete={deleteArtifact} onClose={() => setShowSaved(false)} />}
          </div>
        </header>

        <div style={{ padding: "9px 14px", borderBottom: "1px solid #DCE3EC", display: "flex", alignItems: "center", gap: 8, background: "#FAFBFD", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: 11, color: "#687F8E" }} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search all ${activeEntity.label.toLowerCase()} properties`} style={{ ...input, paddingLeft: 33 }} />
          </div>
          <select value={sorts[0]?.property || "objectKey"} onChange={(event) => setSorts((current) => [{ ...(current[0] || { direction: "asc" }), property: event.target.value }, ...current.slice(1)])} style={{ ...input, width: 180 }}>
            <option value="objectKey">Object key</option>
            {propertyDefinitions.map((property) => <option key={property.propertyKey} value={property.propertyKey}>{property.label}</option>)}
          </select>
          <select value={sorts[0]?.direction || "asc"} onChange={(event) => setSorts((current) => [{ ...(current[0] || { property: "objectKey" }), direction: event.target.value }, ...current.slice(1)])} style={{ ...input, width: 105 }}>
            <option value="asc">Ascending</option><option value="desc">Descending</option>
          </select>
          <button onClick={() => runQuery()} style={button()}><Search size={14} />Apply</button>
          <div style={{ display: "flex", border: "1px solid #C6D2E0", borderRadius: 9, overflow: "hidden" }}>
            <button onClick={() => setViewMode("list")} style={{ ...button(viewMode === "list"), border: 0, borderRadius: 0 }}><LayoutGrid size={14} />List</button>
            <button onClick={() => setViewMode("table")} style={{ ...button(viewMode === "table"), border: 0, borderRadius: 0 }}><Table2 size={14} />Table</button>
          </div>
        </div>

        {showFilters && <div style={{ padding: 12, borderBottom: "1px solid #DCE3EC", background: "#F5F8FC" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Filter size={15} color="#2A46C4" /><b>Filter builder</b>
            <select value={match} onChange={(event) => setMatch(event.target.value)} style={{ ...input, width: 160, marginLeft: "auto" }}><option value="all">Match all filters</option><option value="any">Match any filter</option></select>
            <button onClick={addFilter} style={button()}><Plus size={14} />Add filter</button>
            <button onClick={() => runQuery()} style={button(true)}>Apply filters</button>
          </div>
          <div style={{ display: "grid", gap: 7, marginTop: 10 }}>
            {filters.map((filter, index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "minmax(150px,1fr) 150px minmax(160px,1fr) auto", gap: 7 }}>
              <select value={filter.property} onChange={(event) => updateFilter(index, { property: event.target.value })} style={input}>
                <option value="objectKey">Object key</option>{propertyDefinitions.map((property) => <option key={property.propertyKey} value={property.propertyKey}>{property.label}</option>)}
              </select>
              <select value={filter.operator} onChange={(event) => updateFilter(index, { operator: event.target.value })} style={input}>{OPERATORS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              {!["is_empty", "is_not_empty"].includes(filter.operator) ? <input value={filter.value ?? ""} onChange={(event) => updateFilter(index, { value: event.target.value })} style={input} placeholder="Value" /> : <div />}
              <button onClick={() => removeFilter(index)} style={{ ...button(), color: "#AC3247" }}><Trash2 size={14} /></button>
            </div>)}
            {!filters.length && <div style={{ color: "#687F8E", fontSize: 12 }}>No property filters. Search still applies across the full object.</div>}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #DCE3EC" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Table2 size={15} color="#2A46C4" /><b>Multi-column sorting</b>
              <button onClick={() => setSorts((current) => [...current, { property: "objectKey", direction: "asc" }])} style={{ ...button(), marginLeft: "auto" }}><Plus size={14} />Add sort</button>
            </div>
            <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
              {sorts.map((sort, index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "34px minmax(180px,1fr) 140px auto", gap: 7, alignItems: "center" }}>
                <span style={{ textAlign: "center", color: "#687F8E", font: "10px monospace" }}>{index + 1}</span>
                <select value={sort.property} onChange={(event) => setSorts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, property: event.target.value } : item))} style={input}>
                  <option value="objectKey">Object key</option>{propertyDefinitions.map((property) => <option key={property.propertyKey} value={property.propertyKey}>{property.label}</option>)}
                </select>
                <select value={sort.direction} onChange={(event) => setSorts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, direction: event.target.value } : item))} style={input}><option value="asc">Ascending</option><option value="desc">Descending</option></select>
                <button disabled={sorts.length === 1} onClick={() => setSorts((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={{ ...button(), color: "#AC3247" }}><Trash2 size={14} /></button>
              </div>)}
            </div>
          </div>
        </div>}

        {showColumns && <div style={{ padding: 12, borderBottom: "1px solid #DCE3EC", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Columns3 size={15} color="#2A46C4" /><b>Visible table columns</b>
          {propertyDefinitions.map((property) => {
            const active = visibleColumns.includes(property.propertyKey);
            return <button key={property.propertyKey} onClick={() => setVisibleColumns((current) => active ? current.filter((key) => key !== property.propertyKey) : [...current, property.propertyKey])} style={button(active)}>
              {active ? <CheckSquare size={13} /> : <Square size={13} />}{property.label}
            </button>;
          })}
        </div>}

        {(error || notice) && <div style={{ padding: "8px 14px", borderBottom: "1px solid #DCE3EC", color: error ? "#AC3247" : "#12784E", background: error ? "#FFF4F5" : "#F0FAF5", display: "flex", gap: 8 }}>
          {error ? <X size={15} /> : <Check size={15} />}{error || notice}
          <button onClick={() => { setError(""); setNotice(""); }} style={{ marginLeft: "auto", border: 0, background: "none", cursor: "pointer" }}><X size={14} /></button>
        </div>}

        <div className="oe-body" style={{ gridTemplateColumns: viewMode === "table" ? "minmax(0,1fr) 430px" : "310px minmax(0,1fr)" }}>
          <section className="oe-left" style={{ minWidth: 0, minHeight: 0, borderRight: "1px solid #DCE3EC", background: "#F7F9FC", overflow: "auto" }}>
            {busy && <div style={{ padding: 28, textAlign: "center", color: "#687F8E" }}><Loader2 className="spin" size={18} /> Loading…</div>}
            {!busy && viewMode === "list" && <div style={{ padding: 8, display: "grid", gap: 5 }}>
              {rows.map((row, index) => {
                const active = activeObject?.objectKey === row.objectKey;
                const selected = selectedKeys.has(row.objectKey);
                const preview = propertyDefinitions.slice(0, 2).map((property) => `${property.label}: ${displayValue(objectValue(row, property.propertyKey))}`).join(" · ");
                return <div key={row.objectKey} style={{ display: "grid", gridTemplateColumns: "28px 1fr", alignItems: "stretch", border: active ? `1px solid ${activeEntity.color}` : "1px solid transparent", borderRadius: 10, background: active ? "#EEF2FF" : "#fff" }}>
                  <button onClick={() => toggleSelected(row.objectKey)} style={{ border: 0, background: "transparent", cursor: "pointer", color: selected ? "#2A46C4" : "#91A0AA" }}>{selected ? <CheckSquare size={15} /> : <Square size={15} />}</button>
                  <button onClick={() => selectObject(row)} style={{ border: 0, background: "transparent", textAlign: "left", padding: "9px 9px 9px 2px", cursor: "pointer", color: "#15222D" }}>
                    <div style={{ display: "flex", gap: 7 }}><b style={{ fontSize: 12 }}>{row.objectKey}</b><span style={{ marginLeft: "auto", color: "#8093A0", font: "9px monospace" }}>{index + 1}</span></div>
                    <div style={{ marginTop: 4, color: "#687F8E", font: "9px monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{preview}</div>
                  </button>
                </div>;
              })}
            </div>}
            {!busy && viewMode === "table" && <div style={{ overflow: "auto", height: "100%" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 11 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "#EEF2F7" }}><tr>
                  <th style={{ padding: 9, borderBottom: "1px solid #DCE3EC" }}><button onClick={toggleAll} style={{ border: 0, background: "none", cursor: "pointer" }}>{selectedKeys.size === rows.length && rows.length ? <CheckSquare size={15} /> : <Square size={15} />}</button></th>
                  <th style={{ padding: 9, textAlign: "left", borderBottom: "1px solid #DCE3EC", whiteSpace: "nowrap" }}>Object key</th>
                  {activeColumns.map((key) => <th key={key} style={{ padding: 9, textAlign: "left", borderBottom: "1px solid #DCE3EC", whiteSpace: "nowrap" }}>{propertyDefinitions.find((property) => property.propertyKey === key)?.label || labelize(key)}</th>)}
                </tr></thead>
                <tbody>{rows.map((row) => <tr key={row.objectKey} onClick={() => selectObject(row)} style={{ cursor: "pointer", background: activeObject?.objectKey === row.objectKey ? "#EEF2FF" : "#fff" }}>
                  <td onClick={(event) => { event.stopPropagation(); toggleSelected(row.objectKey); }} style={{ padding: 9, borderBottom: "1px solid #EEF2F7" }}>{selectedKeys.has(row.objectKey) ? <CheckSquare size={15} color="#2A46C4" /> : <Square size={15} color="#91A0AA" />}</td>
                  <td style={{ padding: 9, borderBottom: "1px solid #EEF2F7", fontWeight: 700, whiteSpace: "nowrap" }}>{row.objectKey}</td>
                  {activeColumns.map((key) => <td key={key} style={{ padding: 9, borderBottom: "1px solid #EEF2F7", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayValue(objectValue(row, key))}</td>)}
                </tr>)}</tbody>
              </table>
            </div>}
            {!busy && !rows.length && <div style={{ padding: 30, textAlign: "center", color: "#687F8E" }}>No objects match this exploration.</div>}
          </section>

          <section style={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {!activeObject ? <div style={{ flex: 1, display: "grid", placeItems: "center", color: "#687F8E" }}>Select an object.</div> : <>
              <div style={{ padding: "12px 15px", borderBottom: "1px solid #DCE3EC", display: "flex", alignItems: "center", gap: 8 }}>
                <div><div style={{ color: "#687F8E", font: "9px monospace" }}>{activeEntity.label} / object</div><div style={{ font: "800 18px 'Bricolage Grotesque',sans-serif" }}>{activeObject.objectKey}</div></div>
                <span style={{ marginLeft: "auto", color: "#687F8E", font: "10px monospace" }}>{currentIndex + 1} of {rows.length}</span>
                <button disabled={currentIndex <= 0} onClick={() => navigate(-1)} style={{ ...button(), padding: "7px 8px" }}><ChevronLeft size={14} />Prev</button>
                <button disabled={currentIndex < 0 || currentIndex >= rows.length - 1} onClick={() => navigate(1)} style={{ ...button(), padding: "7px 8px" }}>Next<ChevronRight size={14} /></button>
              </div>
              <div style={{ padding: "8px 14px", borderBottom: "1px solid #DCE3EC", display: "flex", gap: 6, flexWrap: "wrap", background: "#FAFBFD" }}>
                {[["overview", "Overview"], ["lineage", "Lineage"], ["linked", "Linked objects"], ["actions", "Actions"]].map(([key, label]) => <button key={key} onClick={() => setTab(key)} style={{ ...button(tab === key), padding: "7px 9px" }}>{label}</button>)}
              </div>
              <div style={{ padding: 15, overflow: "auto", flex: 1, minHeight: 0 }}>
                {tab === "overview" && <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7, marginBottom: 12 }}>
                    {[["Authority", activeEntity.sourceKind === "core_table" ? activeEntity.sourceTable : "ontology_custom_objects"], ["Source", activeEntity.sourceSystem], ["Tenant", "org_id enforced"], ["Mode", activeEntity.sourceKind === "custom" ? "Editable custom object" : "Governed read-only"]].map(([label, value]) => <div key={label} style={{ padding: 9, borderRadius: 9, background: "#F5F8FC" }}><div style={{ color: "#8093A0", font: "9px monospace" }}>{label.toUpperCase()}</div><b style={{ fontSize: 11 }}>{value}</b></div>)}
                  </div>
                  {activeEntity.sourceKind === "custom" && <div style={{ marginBottom: 10, display: "flex", justifyContent: "flex-end" }}>{editMode ? <><button onClick={() => setEditMode(false)} style={button()}>Cancel</button><button onClick={saveCustomObject} style={{ ...button(true), marginLeft: 7 }}><Save size={14} />Save custom properties</button></> : <button onClick={startEdit} style={button()}><Pencil size={14} />Edit custom object</button>}</div>}
                  {editMode ? <textarea value={editJson} onChange={(event) => setEditJson(event.target.value)} style={{ ...input, minHeight: 360, fontSize: 12 }} /> :
                  <div className="oe-props">{propertyDefinitions.map((property) => <div key={property.propertyKey} style={{ ...card, padding: 11 }}>
                    <div style={{ display: "flex", gap: 7 }}><b style={{ fontSize: 12 }}>{property.label}</b>{property.isKey && <span style={{ marginLeft: "auto", color: "#2A46C4", font: "9px monospace" }}>KEY</span>}</div>
                    <div style={{ marginTop: 7, font: "11px 'IBM Plex Mono',monospace", whiteSpace: typeof objectValue(activeObject, property.propertyKey) === "object" ? "pre-wrap" : "normal", overflowWrap: "anywhere" }}>{displayValue(objectValue(activeObject, property.propertyKey))}</div>
                    <div style={{ marginTop: 7, color: "#8093A0", font: "9px monospace" }}>{property.dataType} · {property.sourceColumn || property.propertyKey}</div>
                  </div>)}</div>}
                </>}
                {tab === "lineage" && <div style={{ ...card, overflow: "hidden" }}>
                  {propertyDefinitions.map((property) => <div key={property.propertyKey} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, padding: 11, borderBottom: "1px solid #EEF2F7" }}>
                    <div><b>{property.label}</b><div style={{ color: "#8093A0", font: "9px monospace" }}>{property.propertyKey}</div></div>
                    <div style={{ color: "#47606F", font: "10px monospace" }}>{property.sourceSystem || activeEntity.sourceSystem}<br />{activeEntity.sourceTable || "ontology_custom_objects"}.{property.sourceColumn || property.propertyKey}</div>
                    <div style={{ color: "#687F8E", font: "9px monospace" }}>{property.dataType}{property.isKey ? " · key" : ""}</div>
                  </div>)}
                </div>}
                {tab === "linked" && <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ ...card, padding: 12, display: "flex", alignItems: "center", gap: 8 }}><Network size={15} color="#2A46C4" /><div><b>Live linked objects</b><div style={{ color: "#687F8E", fontSize: 11 }}>Click a linked record to continue browsing without leaving Object Explorer.</div></div><button onClick={loadLinked} style={{ ...button(), marginLeft: "auto" }}>Refresh</button></div>
                  {linkedBusy && <div style={{ padding: 24, textAlign: "center" }}><Loader2 className="spin" /></div>}
                  {!linkedBusy && (linked?.groups || []).map((group) => {
                    const linkedEntity = entities.find((item) => item.entityKey === group.entityKey);
                    return <div key={group.entityKey} style={{ ...card, padding: 12 }}><div style={{ display: "flex", gap: 7, alignItems: "center" }}><Link2 size={14} color={linkedEntity?.color || "#2A46C4"} /><b>{linkedEntity?.label || labelize(group.entityKey)}</b><span style={{ marginLeft: "auto", font: "9px monospace", color: "#687F8E" }}>{group.objects.length}</span></div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 7, marginTop: 8 }}>{group.objects.map((node) => <button key={node.id} onClick={() => openLinkedObject(group.entityKey, node)} style={{ ...button(), justifyContent: "flex-start", textAlign: "left" }}>{node.label || node.objectKey}</button>)}</div>
                    </div>;
                  })}
                  {!linkedBusy && linked && !linked.groups?.length && <div style={{ ...card, padding: 24, textAlign: "center", color: "#687F8E" }}>No linked operational objects were found.</div>}
                  {!linked && !linkedBusy && <button onClick={loadLinked} style={button(true)}><Network size={14} />Load linked objects</button>}
                  <div style={{ ...card, padding: 12 }}><b>Configured relationship types</b>{relationshipRows.map((relationship) => <div key={relationship.relationshipKey} style={{ marginTop: 7, color: "#47606F", font: "10px monospace" }}>{relationship.fromEntityKey} — {relationship.label} → {relationship.toEntityKey} · {relationship.cardinality}</div>)}</div>
                </div>}
                {tab === "actions" && <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ ...card, padding: 12 }}><b>Governed actions</b><div style={{ color: "#687F8E", fontSize: 11, marginTop: 4 }}>Single-record and bulk actions create auditable action runs; operational tables are not silently changed.</div></div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{entityActions.map((action) => <button key={action.actionKey} onClick={() => { setActionKey(action.actionKey); runBulkAction([activeObject.objectKey], action.actionKey); }} style={button(true)}><ShieldCheck size={14} />{action.label}{action.requiresApproval ? " · approval" : ""}</button>)}</div>
                  {!entityActions.length && <div style={{ color: "#687F8E" }}>No actions configured for this entity.</div>}
                </div>}
              </div>
            </>}
          </section>
        </div>

        {selectedKeys.size > 0 && <footer style={{ padding: "10px 14px", borderTop: "1px solid #DCE3EC", background: "#15222D", color: "#fff", display: "flex", alignItems: "center", gap: 9 }}>
          <CheckSquare size={16} /><b>{selectedKeys.size} selected</b>
          <button onClick={() => setSelectedKeys(new Set())} style={{ ...button(), marginLeft: 5 }}>Clear</button>
          <select value={actionKey} onChange={(event) => setActionKey(event.target.value)} style={{ ...input, width: 260, marginLeft: "auto" }}><option value="">Choose governed action</option>{entityActions.map((action) => <option key={action.actionKey} value={action.actionKey}>{action.label}{action.requiresApproval ? " · approval" : ""}</option>)}</select>
          <button disabled={!actionKey || busy} onClick={() => runBulkAction()} style={button(true)}>{busy ? <Loader2 size={14} className="spin" /> : <ShieldCheck size={14} />}Run on selected</button>
        </footer>}

        {saveDialog && <div style={{ position: "absolute", inset: 0, zIndex: 20, background: "rgba(21,34,45,.48)", display: "grid", placeItems: "center", padding: 18 }}>
          <div style={{ width: "min(480px,100%)", ...card, padding: 18, boxShadow: "0 24px 70px rgba(21,34,45,.3)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{saveDialog === "exploration" ? <Save size={17} color="#2A46C4" /> : <ListChecks size={17} color="#2A46C4" />}<b>{saveDialog === "exploration" ? "Save current exploration" : "Save object list"}</b><button onClick={() => setSaveDialog(null)} style={{ marginLeft: "auto", border: 0, background: "none", cursor: "pointer" }}><X size={16} /></button></div>
            <input autoFocus value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder={saveDialog === "exploration" ? "e.g. Northeast customers with open orders" : "e.g. Priority customer review list"} style={{ ...input, marginTop: 14 }} />
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 12 }}><input type="checkbox" checked={saveShared} onChange={(event) => setSaveShared(event.target.checked)} />Share with this organization</label>
            <div style={{ marginTop: 8, color: "#687F8E", fontSize: 11 }}>{saveDialog === "exploration" ? "Saves filters, search, sorting, columns and view mode—not a copy of the operational data." : `Saves ${selectedKeys.size || rows.length} object keys. Values remain live in their source tables.`}</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 15 }}><button onClick={() => setSaveDialog(null)} style={button()}>Cancel</button><button disabled={!saveName.trim()} onClick={saveArtifact} style={button(true)}>Save</button></div>
          </div>
        </div>}
      </div>
    </div>
  );
}
