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
            f"{label}: expected exactly one original block, found {count}. "
            "The file may differ from the expected Ontology Studio version."
        )
    return text.replace(old, new, 1)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    path = Path("frontend/src/ontology/OntologyStudio.jsx")
    if not path.is_file():
        raise SystemExit("Run this script from the Threadwire repository root.")

    original = path.read_text(encoding="utf-8")
    updated = original

    updated = replace_once(
        updated,
        '''  const viewApiRef = useRef(null);
  const navModeRef = useRef("orbit");
''',
        '''  const viewApiRef = useRef(null);
  const selectionApiRef = useRef(null);
  const selectedKeyRef = useRef(selectedKey);
  const navModeRef = useRef("orbit");
''',
        "selection refs",
    )

    updated = replace_once(
        updated,
        '''  useEffect(() => { moveRef.current = onMove; }, [onMove]);
  useEffect(() => {
    navModeRef.current = navMode;
    viewApiRef.current?.setMode?.(navMode);
  }, [navMode]);
''',
        '''  useEffect(() => { moveRef.current = onMove; }, [onMove]);
  useEffect(() => {
    selectedKeyRef.current = selectedKey;
    selectionApiRef.current?.(selectedKey);
  }, [selectedKey]);
  useEffect(() => {
    navModeRef.current = navMode;
    viewApiRef.current?.setMode?.(navMode);
  }, [navMode]);
''',
        "selection update effect",
    )

    updated = replace_once(
        updated,
        '''      const mat = new THREE.MeshStandardMaterial({ color: entity.color || "#2A46C4", roughness: 0.42, metalness: 0.08 });
      const mesh = new THREE.Mesh(geom, mat); mesh.castShadow = true; mesh.receiveShadow = true;
''',
        '''      const mat = new THREE.MeshStandardMaterial({ color: entity.color || "#2A46C4", roughness: 0.42, metalness: 0.08 });
      group.userData.nodeMaterial = mat;
      const mesh = new THREE.Mesh(geom, mat); mesh.castShadow = true; mesh.receiveShadow = true;
''',
        "node material reference",
    )

    updated = replace_once(
        updated,
        '''      if (entity.entityKey === selectedKey) {
        mat.emissive = new THREE.Color(0xffffff); mat.emissiveIntensity = 0.16;
      }
      scene.add(group); nodeGroups.set(entity.entityKey, group);
    });

    const updateEdges = () => {
''',
        '''      scene.add(group); nodeGroups.set(entity.entityKey, group);
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
''',
        "in-place selection highlighting",
    )

    updated = replace_once(
        updated,
        '''    const setMode = (mode) => {
      const pan = mode === "pan";
      orbit.mouseButtons.LEFT = pan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
      orbit.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      transform.enabled = !pan;
      if (pan) transform.detach();
    };
''',
        '''    const setMode = (mode) => {
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
''',
        "restore gizmo after pan",
    )

    updated = replace_once(
        updated,
        '''    return () => {
      viewApiRef.current = null;
      cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener("pointerdown", pick);
''',
        '''    return () => {
      viewApiRef.current = null;
      selectionApiRef.current = null;
      cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener("pointerdown", pick);
''',
        "selection cleanup",
    )

    updated = replace_once(
        updated,
        '''  }, [entities, relationships, selectedKey]);
''',
        '''  }, [entities, relationships]);
''',
        "prevent scene recreation on selection",
    )

    if updated == original:
        print("Selection/camera fix is already applied. No files changed.")
        return 0

    print("All expected source blocks matched.")
    print(f"  {path}: ready ({len(updated) - len(original):+d} bytes)")

    if args.check:
        print("Check only: no files changed.")
        return 0

    backup = path.with_name(path.name + ".bak-before-selection-camera-fix")
    if not backup.exists():
        shutil.copy2(path, backup)
    path.write_text(updated, encoding="utf-8")

    print("Ontology selection/camera fix applied.")
    print("Selecting entities now preserves the current pan, zoom and camera angle.")
    print("Next: git diff --check && cd frontend && npm run build")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
