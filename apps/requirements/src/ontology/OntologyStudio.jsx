import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdvancedObjectExplorer from "./AdvancedObjectExplorer";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import {
  Activity, Bot, Boxes, Check, ChevronRight, Database, GitBranch,
  Layers3, Link2, Loader2, Network, Plus, RefreshCw, Search, Send,
  Hand, Maximize2, ShieldCheck, Sparkles, Trash2, X, ZoomIn, ZoomOut,
} from "lucide-react";

const api = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : `Request failed (${res.status})`);
  return data;
};

const card = {
  background: "#fff", border: "1px solid #DCE3EC", borderRadius: 14,
  boxShadow: "0 1px 2px rgba(21,34,45,.04),0 4px 16px rgba(21,34,45,.04)",
};
const input = {
  width: "100%", border: "1px solid #C6D2E0", borderRadius: 9, padding: "9px 11px",
  background: "#fff", color: "#15222D", font: "13px 'IBM Plex Mono',monospace", outline: "none",
};
const button = (primary = false) => ({
  border: primary ? "none" : "1px solid #C6D2E0", borderRadius: 9, padding: "9px 12px",
  background: primary ? "linear-gradient(180deg,#2A46C4,#1B2E8C)" : "#fff",
  color: primary ? "#fff" : "#29404E", cursor: "pointer", display: "inline-flex",
  alignItems: "center", justifyContent: "center", gap: 7, font: "600 12px 'IBM Plex Mono',monospace",
});

function labelTexture(title, subtitle, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 640; canvas.height = 220;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,.97)";
  ctx.strokeStyle = color || "#2A46C4";
  ctx.lineWidth = 8;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(8, 8, 624, 204, 26);
  else ctx.rect(8, 8, 624, 204);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#15222D"; ctx.font = "700 42px Arial"; ctx.textAlign = "center";
  ctx.fillText(String(title).slice(0, 30), 320, 94);
  ctx.fillStyle = "#5B7180"; ctx.font = "28px monospace";
  ctx.fillText(String(subtitle).slice(0, 38), 320, 151);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function OntologyCanvas({ entities, relationships, selectedKey, onSelect, onMove, storageKey }) {
  const hostRef = useRef(null);
  const selectRef = useRef(onSelect);
  const moveRef = useRef(onMove);
  const viewApiRef = useRef(null);
  const selectionApiRef = useRef(null);
  const positionApiRef = useRef(null);
  const cameraStateRef = useRef(null);
  const selectedKeyRef = useRef(selectedKey);
  const navModeRef = useRef("orbit");
  const [navMode, setNavMode] = useState(() => {
    if (!storageKey) return "orbit";
    try { return sessionStorage.getItem(`${storageKey}:mode`) || "orbit"; }
    catch (_) { return "orbit"; }
  });
  useEffect(() => { selectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { moveRef.current = onMove; }, [onMove]);
  useEffect(() => {
    selectedKeyRef.current = selectedKey;
    selectionApiRef.current?.(selectedKey);
  }, [selectedKey]);
  useEffect(() => {
    navModeRef.current = navMode;
    viewApiRef.current?.setMode?.(navMode);
    if (storageKey) {
      try { sessionStorage.setItem(`${storageKey}:mode`, navMode); } catch (_) {}
    }
  }, [navMode, storageKey]);

  const sceneKey = useMemo(() => JSON.stringify({
    entities: entities.map((entity) => [
      entity.entityKey, entity.label, entity.color, entity.count,
      entity.sourceKind, entity.sourceTable,
    ]),
    relationships: relationships.map((relationship) => [
      relationship.relationshipKey, relationship.fromEntityKey,
      relationship.toEntityKey, relationship.label,
      relationship.cardinality, relationship.sourceKind,
    ]),
  }), [entities, relationships]);

  useEffect(() => {
    positionApiRef.current?.(entities);
  }, [entities]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !entities.length) return undefined;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f8fc);
    scene.fog = new THREE.Fog(0xf5f8fc, 35, 72);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
    camera.position.set(16, 14, 20);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch (_) { host.textContent = "3D rendering is unavailable in this browser. Use the Objects and Impact tabs instead."; return undefined; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    host.replaceChildren(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8aa0b8, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(12, 20, 10); key.castShadow = true; scene.add(key);
    const grid = new THREE.GridHelper(44, 44, 0x9eb0bf, 0xd9e1e8);
    grid.position.y = 0; scene.add(grid);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.minDistance = 3;
    orbit.maxDistance = 140;
    orbit.screenSpacePanning = true;
    orbit.target.set(0, 1.5, 0);

    let savedView = cameraStateRef.current;
    if (!savedView && storageKey) {
      try {
        savedView = JSON.parse(sessionStorage.getItem(storageKey) || "null");
        cameraStateRef.current = savedView;
      } catch (_) {}
    }
    if (savedView?.position?.length === 3 && savedView?.target?.length === 3) {
      camera.position.fromArray(savedView.position);
      orbit.target.fromArray(savedView.target);
    }
    const rememberView = () => {
      cameraStateRef.current = {
        position: camera.position.toArray(),
        target: orbit.target.toArray(),
      };
    };
    const persistView = () => {
      rememberView();
      if (storageKey) {
        try { sessionStorage.setItem(storageKey, JSON.stringify(cameraStateRef.current)); }
        catch (_) {}
      }
    };
    orbit.addEventListener("change", rememberView);
    orbit.addEventListener("end", persistView);

    const transform = new TransformControls(camera, renderer.domElement);
    transform.setMode("translate"); transform.setSpace("world"); transform.setTranslationSnap(0.25);
    scene.add(transform.getHelper());
    transform.addEventListener("dragging-changed", (e) => { orbit.enabled = !e.value; });

    const nodeGroups = new Map();
    const edgeRows = [];
    const disposable = [];

    entities.forEach((entity) => {
      const group = new THREE.Group();
      const p = entity.position || { x: 0, y: 1, z: 0 };
      group.position.set(Number(p.x) || 0, Math.max(0.8, Number(p.y) || 1), Number(p.z) || 0);
      group.userData = { kind: "ontology-node", entityKey: entity.entityKey };
      const geom = new THREE.BoxGeometry(3.2, 1.25, 1.85);
      const mat = new THREE.MeshStandardMaterial({ color: entity.color || "#2A46C4", roughness: 0.42, metalness: 0.08 });
      group.userData.nodeMaterial = mat;
      const mesh = new THREE.Mesh(geom, mat); mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData = { kind: "ontology-node", entityKey: entity.entityKey };
      group.add(mesh); disposable.push(geom, mat);
      const spriteMat = new THREE.SpriteMaterial({ map: labelTexture(entity.label, `${entity.count ?? 0} objects · ${entity.sourceKind === "core_table" ? entity.sourceTable : "custom"}`, entity.color), transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat); sprite.position.set(0, 1.28, 0); sprite.scale.set(4.5, 1.55, 1); group.add(sprite);
      disposable.push(spriteMat, spriteMat.map);
      scene.add(group); nodeGroups.set(entity.entityKey, group);
    });

    const applySelection = (entityKey) => {
      nodeGroups.forEach((group, key) => {
        const material = group.userData.nodeMaterial;
        if (!material) return;
        const selected = key === entityKey;
        material.emissive.setHex(selected ? 0xffffff : 0x000000);
        material.emissiveIntensity = selected ? 0.16 : 0;
      });
      const selectedGroup = nodeGroups.get(entityKey);
      if (selectedGroup && navModeRef.current !== "pan") transform.attach(selectedGroup);
    };
    selectionApiRef.current = applySelection;
    applySelection(selectedKeyRef.current);

    const updateEdges = () => {
      edgeRows.forEach(({ line, from, to, loop }) => {
        const a = from.position, b = to.position;
        const points = loop
          ? [a.clone().add(new THREE.Vector3(0, .5, 0)), a.clone().add(new THREE.Vector3(3.2, 2.6, 0)), a.clone().add(new THREE.Vector3(0, .5, 2.8))]
          : [a.clone().add(new THREE.Vector3(0, .3, 0)), b.clone().add(new THREE.Vector3(0, .3, 0))];
        line.geometry.setFromPoints(points);
        line.geometry.attributes.position.needsUpdate = true;
      });
    };

    positionApiRef.current = (nextEntities) => {
      nextEntities.forEach((entity) => {
        const group = nodeGroups.get(entity.entityKey);
        if (!group) return;
        const p = entity.position || { x: 0, y: 1, z: 0 };
        const nextX = Number(p.x) || 0;
        const nextY = Math.max(0.8, Number(p.y) || 1);
        const nextZ = Number(p.z) || 0;
        if (
          Math.abs(group.position.x - nextX) > 0.0001 ||
          Math.abs(group.position.y - nextY) > 0.0001 ||
          Math.abs(group.position.z - nextZ) > 0.0001
        ) {
          group.position.set(nextX, nextY, nextZ);
        }
      });
      updateEdges();
    };

    relationships.forEach((rel) => {
      const from = nodeGroups.get(rel.fromEntityKey), to = nodeGroups.get(rel.toEntityKey);
      if (!from || !to) return;
      const geom = new THREE.BufferGeometry();
      const mat = new THREE.LineBasicMaterial({ color: rel.sourceKind === "custom" ? 0xa25b9b : 0x71879a, transparent: true, opacity: .72 });
      const line = new THREE.Line(geom, mat); scene.add(line); disposable.push(geom, mat);
      edgeRows.push({ line, from, to, loop: from === to });
    });
    updateEdges();

    const fitAll = () => {
      if (!nodeGroups.size) return;
      const box = new THREE.Box3();
      nodeGroups.forEach((group) => {
        box.expandByPoint(group.position.clone().add(new THREE.Vector3(-2.8, -0.7, -2.2)));
        box.expandByPoint(group.position.clone().add(new THREE.Vector3(2.8, 3.0, 2.2)));
      });
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z, 5);
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const distance = Math.min(135, Math.max(8, (maxSize / (2 * Math.tan(fov / 2))) * 1.35));
      const direction = camera.position.clone().sub(orbit.target);
      if (direction.lengthSq() < 0.001) direction.set(1, .75, 1);
      direction.normalize();
      orbit.target.copy(center);
      camera.position.copy(center).add(direction.multiplyScalar(distance));
      camera.near = Math.max(0.1, distance / 120);
      camera.far = Math.max(300, distance * 8);
      camera.updateProjectionMatrix();
      scene.fog.near = Math.max(35, distance * 1.25);
      scene.fog.far = Math.max(90, distance * 3.5);
      orbit.update();
      persistView();
    };

    const zoomBy = (factor) => {
      const offset = camera.position.clone().sub(orbit.target);
      const current = offset.length();
      const next = THREE.MathUtils.clamp(current * factor, orbit.minDistance, orbit.maxDistance);
      if (current > 0.001) camera.position.copy(orbit.target).add(offset.setLength(next));
      orbit.update();
      persistView();
    };

    const setMode = (mode) => {
      const pan = mode === "pan";
      orbit.mouseButtons.LEFT = pan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
      orbit.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      transform.enabled = !pan;
      if (pan) {
        transform.detach();
      } else {
        const selectedGroup = nodeGroups.get(selectedKeyRef.current);
        if (selectedGroup) transform.attach(selectedGroup);
      }
    };

    setMode(navModeRef.current);
    viewApiRef.current = { fitAll, zoomIn: () => zoomBy(.82), zoomOut: () => zoomBy(1.22), setMode };

    transform.addEventListener("objectChange", updateEdges);
    transform.addEventListener("mouseUp", () => {
      const object = transform.object;
      if (object?.userData?.entityKey) {
        moveRef.current?.(object.userData.entityKey, { x: object.position.x, y: Math.max(.8, object.position.y), z: object.position.z });
      }
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pick = (event) => {
      if (navModeRef.current === "pan" || transform.dragging || transform.axis) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...nodeGroups.values()], true);
      if (!hits.length) { transform.detach(); return; }
      let obj = hits[0].object;
      while (obj && !obj.userData?.entityKey) obj = obj.parent;
      if (obj?.userData?.entityKey) {
        transform.attach(obj); selectRef.current?.(obj.userData.entityKey);
      }
    };
    renderer.domElement.addEventListener("pointerdown", pick);

    const resize = () => {
      const w = Math.max(320, host.clientWidth), h = Math.max(420, host.clientHeight);
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    let frame;
    const animate = () => { frame = requestAnimationFrame(animate); orbit.update(); renderer.render(scene, camera); };
    animate();

    return () => {
      persistView();
      orbit.removeEventListener("change", rememberView);
      orbit.removeEventListener("end", persistView);
      viewApiRef.current = null;
      selectionApiRef.current = null;
      positionApiRef.current = null;
      cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener("pointerdown", pick);
      orbit.dispose(); transform.dispose(); disposable.forEach((x) => x?.dispose?.()); renderer.dispose(); host.replaceChildren();
    };
  }, [sceneKey, storageKey]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ font: "600 10px 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "#687F8E", marginRight: 2 }}>3D VIEW</span>
        <button type="button" onClick={() => setNavMode((m) => m === "pan" ? "orbit" : "pan")} aria-pressed={navMode === "pan"} style={{ ...button(navMode === "pan"), padding: "7px 9px" }}><Hand size={14} />Pan</button>
        <button type="button" onClick={() => viewApiRef.current?.zoomIn?.()} style={{ ...button(), padding: "7px 9px" }}><ZoomIn size={14} />Zoom in</button>
        <button type="button" onClick={() => viewApiRef.current?.zoomOut?.()} style={{ ...button(), padding: "7px 9px" }}><ZoomOut size={14} />Zoom out</button>
        <button type="button" onClick={() => viewApiRef.current?.fitAll?.()} style={{ ...button(), padding: "7px 9px" }}><Maximize2 size={14} />Fit all</button>
        <span style={{ marginLeft: "auto", color: "#687F8E", font: "10px monospace" }}>{navMode === "pan" ? "Left-drag pans · click Pan again to select entities" : "Left-drag orbits · right-drag pans · wheel zooms"}</span>
      </div>
      <div ref={hostRef} style={{ width: "100%", height: "clamp(520px,70vh,760px)", borderRadius: 14, overflow: "hidden", border: "1px solid #DCE3EC" }} />
    </div>
  );
}

function PropertyTable({ entity }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ font: "600 11px 'IBM Plex Mono',monospace", letterSpacing: ".12em", color: "#687F8E", marginBottom: 7 }}>PROPERTIES & LINEAGE</div>
      <div style={{ border: "1px solid #DCE3EC", borderRadius: 10, overflow: "hidden" }}>
        {(entity?.properties || []).map((p) => (
          <div key={p.propertyKey} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, padding: "8px 10px", borderBottom: "1px solid #EEF2F7", fontSize: 12 }}>
            <div><b>{p.label}</b><div style={{ color: "#718695", font: "11px monospace" }}>{p.propertyKey} · {p.dataType}{p.isKey ? " · key" : ""}</div></div>
            <div style={{ textAlign: "right", color: "#47606F", font: "10px monospace" }}>{p.sourceSystem}<br />{p.sourceColumn || "custom property"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImpactView({ impact, onPick }) {
  if (!impact) return <div style={{ ...card, padding: 30, color: "#687F8E", textAlign: "center" }}>Choose an operational object and run impact analysis.</div>;
  const root = impact.nodes.find((n) => n.id === impact.root);
  const neighbors = impact.nodes.filter((n) => n.id !== impact.root);
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...card, padding: 18, borderColor: "#2A46C4" }}>
        <div style={{ font: "700 17px 'Bricolage Grotesque',sans-serif" }}>{root?.label}</div>
        <div style={{ color: "#687F8E", font: "11px monospace" }}>{root?.entityKey} · root object</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
        {neighbors.map((n) => {
          const links = impact.edges.filter((e) => e.from === n.id || e.to === n.id).map((e) => e.label).join(", ");
          return <button key={n.id} onClick={() => onPick?.(n)} style={{ ...card, padding: 14, textAlign: "left", cursor: "pointer", color: "#15222D" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Network size={15} color="#2A46C4" /><b>{n.label}</b></div>
            <div style={{ color: "#687F8E", font: "10px monospace", marginTop: 5 }}>{n.entityKey} · {links}</div>
          </button>;
        })}
      </div>
      {impact.truncated && <div style={{ color: "#B27C12", fontSize: 12 }}>Large impact graph was capped for browser performance.</div>}
    </div>
  );
}


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

export default function OntologyStudio({ user, onBack }) {
  const [model, setModel] = useState(null);
  const [mode, setMode] = useState("model");
  const [selectedKey, setSelectedKey] = useState("");
  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [objectExplorerOpen, setObjectExplorerOpen] = useState(false);
  const [objectExplorerLoading, setObjectExplorerLoading] = useState(false);
  const [impact, setImpact] = useState(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newEntity, setNewEntity] = useState({ entity_key: "", label: "", description: "", color: "#2A46C4", position: { x: 0, y: 1, z: 0 } });
  const [creatingEntity, setCreatingEntity] = useState(false);
  const [newRel, setNewRel] = useState({
    relationship_key: "", label: "", from_entity_key: "", to_entity_key: "",
    cardinality: "many-to-one", from_property: "objectKey", to_property: "objectKey",
  });
  const [customObject, setCustomObject] = useState({ object_key: "", properties: "{\n  \"status\": \"Draft\"\n}" });
  const [runs, setRuns] = useState([]);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const loadModel = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const data = await api("/api/workforce/ontology/model");
      setModel(data);
      setSelectedKey((current) =>
        data.entities?.some((entity) => entity.entityKey === current)
          ? current
          : data.entities?.[0]?.entityKey || ""
      );
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { loadModel(); }, [loadModel]);
  const selectedEntity = model?.entities?.find((e) => e.entityKey === selectedKey) || null;
  const relationshipFromEntity = model?.entities?.find((e) => e.entityKey === newRel.from_entity_key) || null;
  const relationshipToEntity = model?.entities?.find((e) => e.entityKey === newRel.to_entity_key) || null;
  const selectedRelationships = (model?.relationships || []).filter(
    (relationship) =>
      relationship.fromEntityKey === selectedKey ||
      relationship.toEntityKey === selectedKey
  );

  const defaultRelationshipProperty = (entity) =>
    entity?.keyFields?.[0] ||
    entity?.properties?.find((property) => property.isKey)?.propertyKey ||
    "objectKey";

  const chooseRelationshipEntity = (side, entityKey) => {
    const entity = model?.entities?.find((item) => item.entityKey === entityKey);
    setNewRel((current) => ({
      ...current,
      [`${side}_entity_key`]: entityKey,
      [`${side}_property`]: defaultRelationshipProperty(entity),
    }));
  };

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
    if (!selectedKey) return;
    try {
      const data = await api(`/api/workforce/ontology/objects/${encodeURIComponent(selectedKey)}?limit=150&search=${encodeURIComponent(search)}`);
      setObjects(data.objects || []);
      setSelectedObject((old) => old && data.objects?.find((x) => x.objectKey === old.objectKey) ? old : null);
    } catch (e) { setError(e.message); }
  }, [selectedKey, search]);

  useEffect(() => { if (mode === "objects" || mode === "impact" || mode === "actions" || mode === "ai") loadObjects(); }, [mode, loadObjects]);
  useEffect(() => {
    if (mode === "actions") api("/api/workforce/ontology/actions/runs").then(setRuns).catch((e) => setError(e.message));
  }, [mode]);

  const flash = (message) => { setNotice(message); window.setTimeout(() => setNotice(""), 2600); };
  const patchEntity = async (key, patch, local = true) => {
    if (local) setModel((m) => ({ ...m, entities: m.entities.map((e) => e.entityKey === key ? { ...e, ...patch } : e) }));
    try { await api(`/api/workforce/ontology/entities/${encodeURIComponent(key)}`, { method: "PATCH", body: JSON.stringify(patch) }); }
    catch (e) { setError(e.message); await loadModel(); }
  };

  const suggestEntityPosition = useCallback(() => {
    const base = selectedEntity?.position || { x: 0, y: 1, z: 0 };
    const offsets = [[4, 0], [0, 4], [-4, 0], [0, -4], [4, 4], [-4, 4], [4, -4], [-4, -4], [8, 0], [0, 8]];
    const occupied = (model?.entities || []).map((e) => e.position || { x: 0, y: 1, z: 0 });
    const free = offsets
      .map(([dx, dz]) => ({ x: Number(base.x || 0) + dx, y: Math.max(.8, Number(base.y || 1)), z: Number(base.z || 0) + dz }))
      .find((candidate) => occupied.every((p) => Math.hypot(candidate.x - Number(p.x || 0), candidate.z - Number(p.z || 0)) > 3.1));
    const position = free || { x: Number(base.x || 0) + 4, y: Math.max(.8, Number(base.y || 1)), z: Number(base.z || 0) + 4 };
    return { x: Math.round(position.x * 4) / 4, y: Math.round(position.y * 4) / 4, z: Math.round(position.z * 4) / 4 };
  }, [model, selectedEntity]);

  const openCreateEntity = () => {
    setNewEntity({ entity_key: "", label: "", description: "", color: "#2A46C4", position: suggestEntityPosition() });
    setShowCreate(true);
  };

  useEffect(() => {
    if (!showCreate) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => { if (event.key === "Escape") setShowCreate(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [showCreate]);

  const createEntity = async () => {
    const position = {
      x: Number(newEntity.position?.x) || 0,
      y: Math.max(.8, Number(newEntity.position?.y) || 1),
      z: Number(newEntity.position?.z) || 0,
    };
    const createdKey = newEntity.entity_key;
    setCreatingEntity(true);
    try {
      await api("/api/workforce/ontology/entities", { method: "POST", body: JSON.stringify({ ...newEntity, position }) });
      setShowCreate(false);
      setNewEntity({ entity_key: "", label: "", description: "", color: "#2A46C4", position: { x: 0, y: 1, z: 0 } });
      await loadModel();
      setSelectedKey(createdKey);
      setNewRel((current) => ({
        ...current,
        from_entity_key: createdKey,
        from_property: "objectKey",
      }));
      setMode("model");
      flash(`Custom entity created at X ${position.x}, Y ${position.y}, Z ${position.z}`);
    } catch (e) { setError(e.message); }
    finally { setCreatingEntity(false); }
  };

  const createRelationship = async () => {
    try {
      await api("/api/workforce/ontology/relationships", {
        method: "POST", body: JSON.stringify(newRel),
      });
      setNewRel({
        relationship_key: "", label: "", from_entity_key: "", to_entity_key: "",
        cardinality: "many-to-one", from_property: "objectKey", to_property: "objectKey",
      });
      await loadModel();
      flash(
        `Relationship created: ${newRel.from_entity_key}.${newRel.from_property} → ` +
        `${newRel.to_entity_key}.${newRel.to_property}`
      );
    } catch (e) { setError(e.message); }
  };

  const deleteRelationship = async (relationship) => {
    if (!window.confirm(`Delete relationship "${relationship.label}"?`)) return;
    try {
      await api(
        `/api/workforce/ontology/relationships/${encodeURIComponent(relationship.relationshipKey)}`,
        { method: "DELETE" }
      );
      await loadModel(); flash("Relationship deleted");
    } catch (e) { setError(e.message); }
  };

  const deleteSelectedEntity = async () => {
    if (!selectedEntity || selectedEntity.isSystem) return;
    if (Number(selectedEntity.count || 0) > 0) {
      setError(
        `Delete the ${selectedEntity.count} ${selectedEntity.label} object` +
        `${selectedEntity.count === 1 ? "" : "s"} first`
      );
      return;
    }
    if (!window.confirm(
      `Delete the empty custom entity "${selectedEntity.label}" and its relationship definitions?`
    )) return;
    try {
      await api(
        `/api/workforce/ontology/entities/${encodeURIComponent(selectedEntity.entityKey)}`,
        { method: "DELETE" }
      );
      await loadModel(); flash("Custom entity deleted");
    } catch (e) { setError(e.message); }
  };

  const createCustomObject = async () => {
    try {
      const properties = JSON.parse(customObject.properties || "{}");
      await api(`/api/workforce/ontology/objects/${encodeURIComponent(selectedKey)}`, { method: "POST", body: JSON.stringify({ object_key: customObject.object_key, properties }) });
      setCustomObject({ object_key: "", properties: "{\n  \"status\": \"Draft\"\n}" });
      await loadObjects(); await loadModel(); flash("Object saved");
    } catch (e) { setError(e.message); }
  };

  const runImpact = async (obj = selectedObject) => {
    if (!obj) return;
    setBusy(true); setError("");
    try { setImpact(await api(`/api/workforce/ontology/impact/${encodeURIComponent(selectedKey)}/${encodeURIComponent(obj.objectKey)}`)); setMode("impact"); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const runAction = async (action, object = selectedObject) => {
    if (!object) return setError("Select an object first");
    try {
      await api("/api/workforce/ontology/actions/runs", { method: "POST", body: JSON.stringify({ action_key: action.actionKey, entity_key: selectedKey, object_key: object.objectKey, input: { source: "Ontology Studio" } }) });
      setRuns(await api("/api/workforce/ontology/actions/runs")); flash(action.requiresApproval ? "Action submitted for approval" : "Action completed");
    } catch (e) { setError(e.message); }
  };

  const decide = async (id, decision) => {
    try {
      await api(`/api/workforce/ontology/actions/runs/${id}/decision`, { method: "POST", body: JSON.stringify({ decision, note: "Reviewed in Ontology Studio" }) });
      setRuns(await api("/api/workforce/ontology/actions/runs"));
    } catch (e) { setError(e.message); }
  };

  const ontologyContext = useMemo(() => {
    if (!model) return "";
    const entities = model.entities.map((e) => `${e.entityKey} (${e.label}): ${e.count} objects; source=${e.sourceKind}:${e.sourceTable || "custom"}; properties=${e.properties.map((p) => p.propertyKey).join(",")}`).join("\n");
    const rels = model.relationships.map((r) => `${r.fromEntityKey} -[${r.label}]-> ${r.toEntityKey} (${r.cardinality})`).join("\n");
    return `THREADWIRE ONTOLOGY FOR ORGANIZATION ${model.tenant?.legalName || "current tenant"}\nENTITIES\n${entities}\nRELATIONSHIPS\n${rels}\nSELECTED OBJECT\n${JSON.stringify(selectedObject || null)}\nCURRENT IMPACT GRAPH\n${JSON.stringify(impact || null)}`;
  }, [model, selectedObject, impact]);

  const askAi = async (question = aiQuestion) => {
    const q = question.trim(); if (!q) return;
    setAiQuestion(q); setAiBusy(true); setAiAnswer(""); setError("");
    try {
      const data = await api("/api/ai/chat", { method: "POST", body: JSON.stringify({
        page: "ontology",
        system: "You are Threadwire's ontology-aware manufacturing operations assistant. Use only the supplied tenant-scoped ontology, selected object and impact graph. Distinguish schema facts from operational object facts. Never infer another customer's data. Explain lineage and relationships plainly, quantify impacts when values are supplied, and propose governed actions rather than claiming actions were executed.\n\n" + ontologyContext,
        messages: [{ role: "user", content: q }],
      }) });
      setAiAnswer(data.text || "No answer returned.");
    } catch (e) { setError(e.message); }
    finally { setAiBusy(false); }
  };

  const tabs = [
    ["model", "3D Model", Layers3], ["objects", "Objects", Database], ["impact", "Impact", Network],
    ["actions", "Actions", ShieldCheck], ["ai", "Ontology AI", Bot],
  ];

  if (!model && busy) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#F4F6FA", color: "#47606F" }}><Loader2 className="spin" /> Loading ontology…</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6FA", color: "#15222D", fontFamily: "Inter,Arial,sans-serif" }}>
      <style>{`@keyframes ontSpin{to{transform:rotate(360deg)}} .spin{animation:ontSpin 1s linear infinite}`}</style>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(255,255,255,.96)", backdropFilter: "blur(12px)", borderBottom: "1px solid #DCE3EC" }}>
        <div style={{ maxWidth: 1500, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button onClick={onBack} style={button()}><ChevronRight size={15} style={{ transform: "rotate(180deg)" }} /> Operations</button>
          <div style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", color: "#fff", background: "linear-gradient(180deg,#2A46C4,#1B2E8C)" }}><Boxes size={19} /></div>
          <div><div style={{ font: "800 19px 'Bricolage Grotesque',sans-serif" }}>Ontology Studio</div><div style={{ color: "#687F8E", font: "10px monospace" }}>{model?.tenant?.legalName} · organization-scoped semantic layer</div></div>
          <nav style={{ marginLeft: "auto", display: "flex", gap: 5, flexWrap: "wrap" }}>
            {tabs.map(([key, label, Icon]) => <button key={key} onClick={() => setMode(key)} style={{ ...button(mode === key), padding: "8px 10px" }}><Icon size={14} />{label}</button>)}
          </nav>
        </div>
      </header>

      {(error || notice) && <div style={{ maxWidth: 1500, margin: "12px auto 0", padding: "0 20px" }}>
        <div style={{ ...card, padding: "10px 12px", color: error ? "#AC3247" : "#12784E", display: "flex", alignItems: "center", gap: 8 }}>
          {error ? <X size={16} /> : <Check size={16} />} {error || notice}<button onClick={() => { setError(""); setNotice(""); }} style={{ marginLeft: "auto", border: 0, background: "none", cursor: "pointer" }}><X size={14} /></button>
        </div>
      </div>}

      <main style={{ maxWidth: 1500, margin: "0 auto", padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "250px minmax(0,1fr)", gap: 16, alignItems: "start" }}>
          <aside style={{ ...card, padding: 14, position: "sticky", top: 82 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><GitBranch size={16} color="#2A46C4" /><b>Business objects</b><span style={{ marginLeft: "auto", font: "10px monospace", color: "#687F8E" }}>{model?.entities?.length || 0}</span></div>
            <div style={{ display: "grid", gap: 5, maxHeight: "58vh", overflow: "auto" }}>
              {model?.entities?.map((e) => <button key={e.entityKey} onClick={() => { setSelectedKey(e.entityKey); setSelectedObject(null); setImpact(null); }} style={{ border: selectedKey === e.entityKey ? `1px solid ${e.color}` : "1px solid transparent", background: selectedKey === e.entityKey ? "#EEF2FF" : "transparent", borderRadius: 9, padding: "9px", cursor: "pointer", textAlign: "left", color: "#15222D" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 9, height: 9, borderRadius: 99, background: e.color }} /><b style={{ fontSize: 12 }}>{e.label}</b><span role="button" tabIndex={0} title={`Browse ${e.count} ${e.label} objects`}
                  onClick={(event) => { event.stopPropagation(); openObjectExplorer(e); }}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); openObjectExplorer(e); } }}
                  style={{ marginLeft: "auto", font: "10px monospace", color: "#2A46C4", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}>{e.count}</span></div>
                <div style={{ marginLeft: 17, color: "#7B8E9A", font: "9px monospace" }}>{e.sourceKind === "core_table" ? e.sourceTable : "custom object store"}</div>
              </button>)}
            </div>
            {model?.canWrite && <button onClick={openCreateEntity} style={{ ...button(), width: "100%", marginTop: 10 }}><Plus size={14} />New entity</button>}
          </aside>

          <section style={{ minWidth: 0 }}>
            {mode === "model" && <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 330px", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ color: "#47606F", fontSize: 12 }}>Select an entity to move it with the XYZ gizmo. Use the view controls below to pan, zoom or fit the entire model.</div>
                  <button onClick={async () => { await api("/api/workforce/ontology/bootstrap", { method: "POST", body: "{}" }); await loadModel(); flash("Ontology refreshed from the current Threadwire schema"); }} disabled={!model?.canWrite} style={{ ...button(), marginLeft: "auto" }}><RefreshCw size={14} />Refresh schema</button>
                </div>
                <OntologyCanvas
                  entities={model?.entities || []}
                  relationships={model?.relationships || []}
                  selectedKey={selectedKey}
                  onSelect={setSelectedKey}
                  onMove={(key, position) => patchEntity(key, { position })}
                  storageKey={`threadwire:ontology-camera:${model?.tenant?.orgId || "default"}`}
                />
              </div>
              <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
                {selectedEntity && <div style={{ ...card, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 12, height: 12, borderRadius: 99, background: selectedEntity.color }} /><b>{selectedEntity.label}</b><button type="button" onClick={() => openObjectExplorer(selectedEntity)}
                    title={`Browse all ${selectedEntity.count} ${selectedEntity.label} objects`}
                    style={{ marginLeft: "auto", border: 0, background: "transparent", color: "#2A46C4", font: "600 10px 'IBM Plex Mono',monospace", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
                    {selectedEntity.count} objects
                  </button></div>
                  <div style={{ margin: "8px 0 12px", color: "#687F8E", fontSize: 12 }}>{selectedEntity.description}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 7 }}>
                    <input style={input} value={selectedEntity.label} disabled={!model.canWrite} onChange={(e) => setModel((m) => ({ ...m, entities: m.entities.map((x) => x.entityKey === selectedKey ? { ...x, label: e.target.value } : x) }))} onBlur={() => patchEntity(selectedKey, { label: selectedEntity.label }, false)} />
                    <input type="color" value={selectedEntity.color} disabled={!model.canWrite} onChange={(e) => patchEntity(selectedKey, { color: e.target.value })} style={{ ...input, padding: 4 }} />
                  </div>
                  <div style={{ marginTop: 10, padding: 10, borderRadius: 9, background: "#F5F8FC", font: "10px monospace", color: "#47606F" }}>
                    Authority: {selectedEntity.sourceKind === "core_table" ? `existing ${selectedEntity.sourceTable} table filtered by org_id` : "ontology_custom_objects filtered by org_id"}<br />
                    Key: {(selectedEntity.keyFields || []).join(" + ")}<br />Source system: {selectedEntity.sourceSystem}
                  </div>
                  <PropertyTable entity={selectedEntity} />
                  {model.canWrite && !selectedEntity.isSystem && <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #E3E9F0" }}>
                    <div style={{ color: "#687F8E", fontSize: 11, marginBottom: 8 }}>
                      Custom entity lifecycle: delete its object records first. The entity type can be removed only when its count is zero.
                    </div>
                    <button
                      type="button"
                      disabled={Number(selectedEntity.count || 0) > 0}
                      onClick={deleteSelectedEntity}
                      title={selectedEntity.count ? `Delete ${selectedEntity.count} objects first` : "Delete this empty custom entity"}
                      style={{
                        ...button(), color: "#AC3247",
                        opacity: selectedEntity.count ? .55 : 1,
                        cursor: selectedEntity.count ? "not-allowed" : "pointer",
                      }}
                    ><Trash2 size={14} />{selectedEntity.count ? `Delete ${selectedEntity.count} objects first` : "Delete empty entity"}</button>
                  </div>}
                </div>}
                {model?.canWrite && <div style={{ ...card, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                    <Link2 size={15} color="#2A46C4" /><b>Create mapped relationship</b>
                    {selectedEntity && <button type="button" onClick={() => chooseRelationshipEntity("from", selectedEntity.entityKey)} style={{ ...button(), marginLeft: "auto", padding: "6px 8px" }}>Use selected as From</button>}
                  </div>
                  <div style={{ color: "#687F8E", fontSize: 11, lineHeight: 1.45, marginBottom: 10 }}>
                    Objects become linked when the configured property values match. Example:
                    <span style={{ font: "10px monospace", color: "#29404E" }}> Machine.part_number → Part.part_number</span>.
                    JSON arrays are supported for many-to-many links.
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <input style={input} placeholder="relationship_key, e.g. machine_builds_part" value={newRel.relationship_key} onChange={(e) => setNewRel({ ...newRel, relationship_key: e.target.value.toLowerCase().replace(/\W+/g, "_") })} />
                    <input style={input} placeholder="Relationship label, e.g. builds" value={newRel.label} onChange={(e) => setNewRel({ ...newRel, label: e.target.value })} />
                    <div style={{ padding: 10, border: "1px solid #DCE3EC", borderRadius: 10, background: "#F8FAFD" }}>
                      <div style={{ color: "#687F8E", font: "10px monospace", marginBottom: 6 }}>FROM OBJECT PROPERTY</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                        <select style={input} value={newRel.from_entity_key} onChange={(e) => chooseRelationshipEntity("from", e.target.value)}>
                          <option value="">From entity</option>{model.entities.map((entity) => <option key={entity.entityKey} value={entity.entityKey}>{entity.label}</option>)}
                        </select>
                        <input list="ontology-from-properties" style={input} placeholder="Property, e.g. part_number" value={newRel.from_property} onChange={(e) => setNewRel({ ...newRel, from_property: e.target.value })} />
                        <datalist id="ontology-from-properties"><option value="objectKey" />{(relationshipFromEntity?.properties || []).map((property) => <option key={property.propertyKey} value={property.propertyKey}>{property.label}</option>)}</datalist>
                      </div>
                    </div>
                    <div style={{ textAlign: "center", color: "#2A46C4", font: "700 15px monospace" }}>↓ matches ↓</div>
                    <div style={{ padding: 10, border: "1px solid #DCE3EC", borderRadius: 10, background: "#F8FAFD" }}>
                      <div style={{ color: "#687F8E", font: "10px monospace", marginBottom: 6 }}>TO OBJECT PROPERTY</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                        <select style={input} value={newRel.to_entity_key} onChange={(e) => chooseRelationshipEntity("to", e.target.value)}>
                          <option value="">To entity</option>{model.entities.map((entity) => <option key={entity.entityKey} value={entity.entityKey}>{entity.label}</option>)}
                        </select>
                        <input list="ontology-to-properties" style={input} placeholder="Property, e.g. part_number" value={newRel.to_property} onChange={(e) => setNewRel({ ...newRel, to_property: e.target.value })} />
                        <datalist id="ontology-to-properties"><option value="objectKey" />{(relationshipToEntity?.properties || []).map((property) => <option key={property.propertyKey} value={property.propertyKey}>{property.label}</option>)}</datalist>
                      </div>
                    </div>
                    <select style={input} value={newRel.cardinality} onChange={(e) => setNewRel({ ...newRel, cardinality: e.target.value })}><option>one-to-one</option><option>one-to-many</option><option>many-to-one</option><option>many-to-many</option></select>
                    {newRel.from_entity_key && newRel.to_entity_key && <div style={{ padding: 9, borderRadius: 9, background: "#EEF2FF", color: "#29404E", font: "10px monospace", overflowWrap: "anywhere" }}>
                      {newRel.from_entity_key}.{newRel.from_property || "objectKey"} → {newRel.to_entity_key}.{newRel.to_property || "objectKey"}
                    </div>}
                    <button onClick={createRelationship} disabled={!newRel.relationship_key || !newRel.label || !newRel.from_entity_key || !newRel.to_entity_key || !newRel.from_property || !newRel.to_property} style={button(true)}>Create mapped relationship</button>
                  </div>
                  {!!selectedRelationships.length && <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #E3E9F0" }}>
                    <div style={{ color: "#687F8E", font: "10px monospace", marginBottom: 7 }}>RELATIONSHIPS FOR {selectedEntity?.label?.toUpperCase()}</div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {selectedRelationships.map((relationship) => <div key={relationship.relationshipKey} style={{ padding: 8, border: "1px solid #E3E9F0", borderRadius: 8, display: "grid", gridTemplateColumns: "1fr auto", gap: 7 }}>
                        <div><b style={{ fontSize: 11 }}>{relationship.label}</b><div style={{ color: "#718695", font: "9px monospace", overflowWrap: "anywhere" }}>{relationship.fromEntityKey}.{relationship.fromProperty || "objectKey"} → {relationship.toEntityKey}.{relationship.toProperty || "objectKey"} · {relationship.cardinality}</div></div>
                        {relationship.sourceKind === "custom" && <button type="button" onClick={() => deleteRelationship(relationship)} title="Delete custom relationship" style={{ border: 0, background: "none", cursor: "pointer", color: "#AC3247" }}><Trash2 size={14} /></button>}
                      </div>)}
                    </div>
                  </div>}
                </div>}
              </div>
            </div>}

            {mode === "objects" && <div style={{ display: "grid", gap: 12 }}>
              <div style={{ ...card, padding: 14, display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
                <Search size={16} color="#2A46C4" /><input style={{ ...input, flex: 1, minWidth: 220 }} placeholder={`Search ${selectedEntity?.label || "objects"}`} value={search} onChange={(e) => setSearch(e.target.value)} />
                <button onClick={loadObjects} style={button()}><RefreshCw size={14} />Refresh</button>
              </div>
              {selectedEntity?.sourceKind === "custom" && model.canWrite && <div style={{ ...card, padding: 16 }}>
                <b>Create or update {selectedEntity.label}</b><div style={{ display: "grid", gridTemplateColumns: "240px minmax(0,1fr) auto", gap: 8, marginTop: 10 }}>
                  <input style={input} placeholder="Object key" value={customObject.object_key} onChange={(e) => setCustomObject({ ...customObject, object_key: e.target.value })} />
                  <textarea style={{ ...input, minHeight: 88 }} value={customObject.properties} onChange={(e) => setCustomObject({ ...customObject, properties: e.target.value })} />
                  <button onClick={createCustomObject} style={button(true)}>Save object</button>
                </div>
              </div>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
                {objects.map((obj) => <button key={obj.objectKey} onClick={() => setSelectedObject(obj)} style={{ ...card, padding: 14, textAlign: "left", cursor: "pointer", borderColor: selectedObject?.objectKey === obj.objectKey ? "#2A46C4" : "#DCE3EC", color: "#15222D" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Database size={15} color={selectedEntity?.color || "#2A46C4"} /><b>{obj.objectKey}</b></div>
                  <div style={{ marginTop: 8, color: "#687F8E", font: "10px monospace", whiteSpace: "pre-wrap", maxHeight: 92, overflow: "hidden" }}>{JSON.stringify(obj.properties, null, 2)}</div>
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ font: "10px monospace", color: "#7B8E9A" }}>{selectedEntity?.sourceKind === "core_table" ? "read from existing table" : "custom ontology object"}</span><span onClick={(e) => { e.stopPropagation(); setSelectedObject(obj); runImpact(obj); }} style={{ color: "#2A46C4", font: "11px monospace" }}>Impact →</span></div>
                </button>)}
              </div>
              {!objects.length && <div style={{ ...card, padding: 30, textAlign: "center", color: "#687F8E" }}>No objects found for this organization.</div>}
            </div>}

            {mode === "impact" && <div style={{ display: "grid", gap: 12 }}>
              <div style={{ ...card, padding: 14, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <Network size={16} color="#2A46C4" /><b>Impact analysis</b>
                <select style={{ ...input, width: 260, marginLeft: "auto" }} value={selectedObject?.objectKey || ""} onChange={(e) => setSelectedObject(objects.find((o) => o.objectKey === e.target.value) || null)}><option value="">Select {selectedEntity?.label}</option>{objects.map((o) => <option key={o.objectKey}>{o.objectKey}</option>)}</select>
                <button onClick={() => runImpact()} disabled={!selectedObject || busy} style={button(true)}>{busy ? <Loader2 size={14} className="spin" /> : <Activity size={14} />}Trace impact</button>
              </div>
              <ImpactView impact={impact} onPick={(n) => { setSelectedKey(n.entityKey); setSelectedObject({ objectKey: n.objectKey, properties: n.properties }); }} />
            </div>}

            {mode === "actions" && <div style={{ display: "grid", gap: 14 }}>
              <div style={{ ...card, padding: 16 }}><b>Governed actions</b><p style={{ color: "#687F8E", margin: "6px 0 12px", fontSize: 13 }}>Actions create an auditable request first. Core operational tables are not mutated by this module.</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{model.actions.filter((a) => a.entityKey === "*" || a.entityKey === selectedKey).map((a) => <button key={a.actionKey} onClick={() => runAction(a)} style={button(true)}><ShieldCheck size={14} />{a.label}{a.requiresApproval ? " · approval" : ""}</button>)}</div>
              </div>
              <div style={{ ...card, overflow: "hidden" }}>
                <div style={{ padding: 14, borderBottom: "1px solid #DCE3EC" }}><b>Action history</b></div>
                {runs.map((r) => <div key={r.id} style={{ padding: 13, borderBottom: "1px solid #EEF2F7", display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                  <div><b>{r.action_key}</b> <span style={{ color: "#687F8E" }}>on {r.entity_key}:{r.object_key}</span><div style={{ font: "10px monospace", color: "#7B8E9A" }}>{r.requested_by} · {r.requested_at}</div></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ padding: "3px 8px", borderRadius: 999, background: r.status === "completed" ? "#E7F5EE" : r.status === "rejected" ? "#FBECEF" : "#FFF4D8", color: r.status === "completed" ? "#12784E" : r.status === "rejected" ? "#AC3247" : "#8B6817", font: "10px monospace" }}>{r.status}</span>{r.status === "pending" && model.canWrite && <><button onClick={() => decide(r.id, "approved")} style={button(true)}>Approve</button><button onClick={() => decide(r.id, "rejected")} style={button()}>Reject</button></>}</div>
                </div>)}
              </div>
            </div>}

            {mode === "ai" && <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 14 }}>
              <div style={{ ...card, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Sparkles size={18} color="#2A46C4" /><b>Ontology-aware AI</b></div>
                <p style={{ color: "#687F8E", fontSize: 13 }}>The assistant receives this organization’s ontology, lineage, selected object and current impact graph. Existing AI metering and provider configuration remain in force.</p>
                <textarea style={{ ...input, minHeight: 110, marginTop: 8 }} placeholder="Ask what depends on this part, where a field came from, or what action should be reviewed…" value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)} />
                <button onClick={() => askAi()} disabled={aiBusy || !aiQuestion.trim()} style={{ ...button(true), marginTop: 9 }}>{aiBusy ? <Loader2 size={14} className="spin" /> : <Send size={14} />}Ask Ontology AI</button>
                {aiAnswer && <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: "#F5F8FC", border: "1px solid #DCE3EC", whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 13 }}>{aiAnswer}</div>}
              </div>
              <div style={{ ...card, padding: 16 }}><b>Grounding scope</b>
                <div style={{ display: "grid", gap: 8, marginTop: 10, color: "#47606F", fontSize: 12 }}><div><b>Tenant</b><br />{model.tenant?.legalName}</div><div><b>Selected entity</b><br />{selectedEntity?.label || "None"}</div><div><b>Selected object</b><br />{selectedObject?.objectKey || "None"}</div><div><b>Impact graph</b><br />{impact ? `${impact.nodes.length} nodes / ${impact.edges.length} links` : "Not loaded"}</div></div>
                <div style={{ display: "grid", gap: 7, marginTop: 14 }}>{["Explain this object's upstream and downstream impact", "Which properties come from PostgreSQL and which are custom?", "What governed action should be reviewed next?"].map((q) => <button key={q} onClick={() => askAi(q)} style={{ ...button(), textAlign: "left", justifyContent: "flex-start" }}>{q}</button>)}</div>
              </div>
            </div>}
          </section>
        </div>
      </main>
      {objectExplorerOpen && <AdvancedObjectExplorer
        entity={selectedEntity}
        entities={model?.entities || []}
        objects={objects}
        selectedObject={selectedObject}
        onSelect={setSelectedObject}
        onNavigateEntity={(entityKey, object) => { setSelectedKey(entityKey); setSelectedObject(object); }}
        onClose={() => setObjectExplorerOpen(false)}
        loading={objectExplorerLoading}
        relationships={model?.relationships || []}
        actions={model?.actions || []}
        onOpenObjects={() => { setObjectExplorerOpen(false); setSearch(""); setMode("objects"); }}
        onTraceImpact={(object) => { setObjectExplorerOpen(false); setSelectedObject(object); runImpact(object); }}
        onRunAction={runAction}
        canWrite={model?.canWrite}
        onObjectDeleted={(entityKey, deletedKeys) => {
          const deleted = new Set(deletedKeys || []);
          if (entityKey === selectedKey) {
            setObjects((current) => current.filter((object) => !deleted.has(object.objectKey)));
            setSelectedObject((current) => current && deleted.has(current.objectKey) ? null : current);
          }
          loadModel();
        }}
      />}
      {showCreate && <div role="dialog" aria-modal="true" aria-labelledby="ontology-create-title" onMouseDown={(e) => { if (e.target === e.currentTarget && !creatingEntity) setShowCreate(false); }} style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", padding: 20, background: "rgba(21,34,45,.58)", backdropFilter: "blur(5px)" }}>
        <div style={{ width: "min(620px,100%)", maxHeight: "calc(100vh - 40px)", overflow: "auto", background: "#fff", border: "1px solid #C6D2E0", borderRadius: 18, boxShadow: "0 30px 90px rgba(21,34,45,.32)" }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #DCE3EC", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", color: "#fff", background: "linear-gradient(180deg,#2A46C4,#1B2E8C)" }}><Plus size={19} /></div>
            <div><div id="ontology-create-title" style={{ font: "800 20px 'Bricolage Grotesque',sans-serif" }}>Create a new 3D entity</div><div style={{ color: "#687F8E", fontSize: 12 }}>Choose its identity and exact starting position in the ontology space.</div></div>
            <button type="button" onClick={() => setShowCreate(false)} disabled={creatingEntity} aria-label="Close create entity dialog" style={{ marginLeft: "auto", border: 0, background: "transparent", color: "#47606F", cursor: "pointer", padding: 7 }}><X size={19} /></button>
          </div>
          <div style={{ padding: 20, display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 86px", gap: 10 }}>
              <label style={{ color: "#47606F", fontSize: 12 }}>Entity key<input autoFocus style={{ ...input, marginTop: 5 }} placeholder="engineering_change" value={newEntity.entity_key} onChange={(e) => setNewEntity({ ...newEntity, entity_key: e.target.value.toLowerCase().replace(/\W+/g, "_") })} /></label>
              <label style={{ color: "#47606F", fontSize: 12 }}>Display label<input style={{ ...input, marginTop: 5 }} placeholder="Engineering Change" value={newEntity.label} onChange={(e) => setNewEntity({ ...newEntity, label: e.target.value })} /></label>
              <label style={{ color: "#47606F", fontSize: 12 }}>Color<input type="color" value={newEntity.color} onChange={(e) => setNewEntity({ ...newEntity, color: e.target.value })} style={{ ...input, height: 39, marginTop: 5, padding: 4 }} /></label>
            </div>
            <label style={{ color: "#47606F", fontSize: 12 }}>Description<textarea style={{ ...input, minHeight: 82, marginTop: 5, resize: "vertical" }} placeholder="What this business object represents" value={newEntity.description} onChange={(e) => setNewEntity({ ...newEntity, description: e.target.value })} /></label>
            <div style={{ padding: 14, borderRadius: 12, border: "1px solid #DCE3EC", background: "#F5F8FC" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}><Maximize2 size={16} color="#2A46C4" /><b>Starting position in 3D space</b><span style={{ marginLeft: "auto", color: "#687F8E", font: "10px monospace" }}>adjust later with the XYZ gizmo</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 9 }}>
                {["x", "y", "z"].map((axis) => <label key={axis} style={{ color: "#47606F", fontSize: 12, textTransform: "uppercase" }}>{axis}<input type="number" step="0.25" min={axis === "y" ? .8 : undefined} style={{ ...input, marginTop: 5 }} value={newEntity.position?.[axis] ?? (axis === "y" ? 1 : 0)} onChange={(e) => setNewEntity((current) => ({ ...current, position: { ...current.position, [axis]: e.target.value } }))} /></label>)}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button type="button" onClick={() => setNewEntity((current) => ({ ...current, position: { x: 0, y: 1, z: 0 } }))} style={{ ...button(), padding: "7px 9px" }}>Use model center</button>
                <button type="button" onClick={() => setNewEntity((current) => ({ ...current, position: suggestEntityPosition() }))} style={{ ...button(), padding: "7px 9px" }}>Find open spot{selectedEntity ? ` near ${selectedEntity.label}` : ""}</button>
              </div>
              <div style={{ marginTop: 10, color: "#29404E", font: "11px monospace" }}>Will be created at X {newEntity.position?.x ?? 0} · Y {newEntity.position?.y ?? 1} · Z {newEntity.position?.z ?? 0}</div>
            </div>
          </div>
          <div style={{ padding: "14px 20px", borderTop: "1px solid #DCE3EC", display: "flex", justifyContent: "flex-end", gap: 9 }}>
            <button type="button" onClick={() => setShowCreate(false)} disabled={creatingEntity} style={button()}>Cancel</button>
            <button type="button" onClick={createEntity} disabled={creatingEntity || !newEntity.entity_key || !newEntity.label} style={button(true)}>{creatingEntity ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}Create at this position</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
