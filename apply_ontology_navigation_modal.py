#!/usr/bin/env python3
"""Improve Threadwire Ontology Studio navigation and entity creation UX.

Run from the Threadwire repository root:
  python3 apply_ontology_navigation_modal.py --check
  python3 apply_ontology_navigation_modal.py
  git diff --check
  cd frontend && npm run build
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}. No files changed.")
    return text.replace(old, new, 1)


def replace_between(text: str, start: str, end: str, replacement: str, label: str) -> str:
    start_at = text.find(start)
    if start_at < 0:
        raise RuntimeError(f"{label}: start marker not found. No files changed.")
    end_at = text.find(end, start_at)
    if end_at < 0:
        raise RuntimeError(f"{label}: end marker not found. No files changed.")
    if text.find(start, start_at + len(start)) >= 0:
        raise RuntimeError(f"{label}: multiple start markers found. No files changed.")
    return text[:start_at] + replacement + text[end_at:]


CANVAS = r'''function OntologyCanvas({ entities, relationships, selectedKey, onSelect, onMove }) {
  const hostRef = useRef(null);
  const selectRef = useRef(onSelect);
  const moveRef = useRef(onMove);
  const viewApiRef = useRef(null);
  const navModeRef = useRef("orbit");
  const [navMode, setNavMode] = useState("orbit");
  useEffect(() => { selectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { moveRef.current = onMove; }, [onMove]);
  useEffect(() => {
    navModeRef.current = navMode;
    viewApiRef.current?.setMode?.(navMode);
  }, [navMode]);

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
      const mesh = new THREE.Mesh(geom, mat); mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData = { kind: "ontology-node", entityKey: entity.entityKey };
      group.add(mesh); disposable.push(geom, mat);
      const spriteMat = new THREE.SpriteMaterial({ map: labelTexture(entity.label, `${entity.count ?? 0} objects · ${entity.sourceKind === "core_table" ? entity.sourceTable : "custom"}`, entity.color), transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat); sprite.position.set(0, 1.28, 0); sprite.scale.set(4.5, 1.55, 1); group.add(sprite);
      disposable.push(spriteMat, spriteMat.map);
      if (entity.entityKey === selectedKey) {
        mat.emissive = new THREE.Color(0xffffff); mat.emissiveIntensity = 0.16;
      }
      scene.add(group); nodeGroups.set(entity.entityKey, group);
    });

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
    };

    const zoomBy = (factor) => {
      const offset = camera.position.clone().sub(orbit.target);
      const current = offset.length();
      const next = THREE.MathUtils.clamp(current * factor, orbit.minDistance, orbit.maxDistance);
      if (current > 0.001) camera.position.copy(orbit.target).add(offset.setLength(next));
      orbit.update();
    };

    const setMode = (mode) => {
      const pan = mode === "pan";
      orbit.mouseButtons.LEFT = pan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
      orbit.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      transform.enabled = !pan;
      if (pan) transform.detach();
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
      viewApiRef.current = null;
      cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener("pointerdown", pick);
      orbit.dispose(); transform.dispose(); disposable.forEach((x) => x?.dispose?.()); renderer.dispose(); host.replaceChildren();
    };
  }, [entities, relationships, selectedKey]);

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

'''

CREATE_LOGIC = r'''  const suggestEntityPosition = useCallback(() => {
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
      setMode("model");
      flash(`Custom entity created at X ${position.x}, Y ${position.y}, Z ${position.z}`);
    } catch (e) { setError(e.message); }
    finally { setCreatingEntity(false); }
  };

'''

MODAL = r'''      {showCreate && <div role="dialog" aria-modal="true" aria-labelledby="ontology-create-title" onMouseDown={(e) => { if (e.target === e.currentTarget && !creatingEntity) setShowCreate(false); }} style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", padding: 20, background: "rgba(21,34,45,.58)", backdropFilter: "blur(5px)" }}>
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
'''


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="verify expected source markers without writing")
    args = parser.parse_args()

    root = Path.cwd()
    path = root / "frontend/src/ontology/OntologyStudio.jsx"
    if not path.is_file():
        print("Run this script from the Threadwire repository root.", file=sys.stderr)
        return 2

    original = path.read_text(encoding="utf-8")
    updated = original

    updated = replace_once(
        updated,
        "  ShieldCheck, Sparkles, Trash2, X,\n",
        "  Hand, Maximize2, ShieldCheck, Sparkles, Trash2, X, ZoomIn, ZoomOut,\n",
        "navigation icon imports",
    )

    updated = replace_between(
        updated,
        "function OntologyCanvas(",
        "function PropertyTable(",
        CANVAS,
        "3D canvas controls",
    )

    updated = replace_once(
        updated,
        '  const [newEntity, setNewEntity] = useState({ entity_key: "", label: "", description: "", color: "#2A46C4" });\n',
        '  const [newEntity, setNewEntity] = useState({ entity_key: "", label: "", description: "", color: "#2A46C4", position: { x: 0, y: 1, z: 0 } });\n  const [creatingEntity, setCreatingEntity] = useState(false);\n',
        "new entity position state",
    )

    updated = replace_between(
        updated,
        "  const createEntity = async () => {",
        "  const createRelationship = async () => {",
        CREATE_LOGIC,
        "entity creation logic",
    )

    old_button_start = '            {model?.canWrite && <button onClick={() => setShowCreate((v) => !v)}'
    new_button = '            {model?.canWrite && <button onClick={openCreateEntity} style={{ ...button(), width: "100%", marginTop: 10 }}><Plus size={14} />New entity</button>}\n'
    updated = replace_between(updated, old_button_start, "          </aside>", new_button, "replace inline entity form")

    updated = replace_once(
        updated,
        "Drag the XYZ gizmo to move an entity. Orbit on empty space; scroll to zoom.",
        "Select an entity to move it with the XYZ gizmo. Use the view controls below to pan, zoom or fit the entire model.",
        "3D navigation help text",
    )

    tail = "      </main>\n    </div>\n  );\n}\n"
    updated = replace_once(updated, tail, "      </main>\n" + MODAL + "    </div>\n  );\n}\n", "create entity modal")

    if updated == original:
        raise RuntimeError("No changes produced.")

    print("All expected source blocks matched.")
    print(f"  frontend/src/ontology/OntologyStudio.jsx: ready ({len(updated) - len(original):+d} bytes)")

    if args.check:
        print("Check only: no files changed.")
        return 0

    backup = path.with_name(path.name + ".bak-before-navigation-modal")
    if not backup.exists():
        shutil.copy2(path, backup)
    path.write_text(updated, encoding="utf-8")
    print("Ontology navigation and entity modal update applied.")
    print("Next: git diff --check && cd frontend && npm run build")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
