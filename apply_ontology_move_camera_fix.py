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
            "No files changed."
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
  const selectionApiRef = useRef(null);
  const selectedKeyRef = useRef(selectedKey);
  const navModeRef = useRef("orbit");
''',
        '''  const viewApiRef = useRef(null);
  const selectionApiRef = useRef(null);
  const positionApiRef = useRef(null);
  const cameraStateRef = useRef(null);
  const selectedKeyRef = useRef(selectedKey);
  const navModeRef = useRef("orbit");
''',
        "camera and position refs",
    )

    updated = replace_once(
        updated,
        '''  useEffect(() => {
    navModeRef.current = navMode;
    viewApiRef.current?.setMode?.(navMode);
  }, [navMode]);

  useEffect(() => {
''',
        '''  useEffect(() => {
    navModeRef.current = navMode;
    viewApiRef.current?.setMode?.(navMode);
  }, [navMode]);

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
''',
        "stable scene signature",
    )

    updated = replace_once(
        updated,
        '''    orbit.screenSpacePanning = true;
    orbit.target.set(0, 1.5, 0);

    const transform = new TransformControls(camera, renderer.domElement);
''',
        '''    orbit.screenSpacePanning = true;
    orbit.target.set(0, 1.5, 0);

    const savedView = cameraStateRef.current;
    if (savedView) {
      camera.position.fromArray(savedView.position);
      orbit.target.fromArray(savedView.target);
    }
    const rememberView = () => {
      cameraStateRef.current = {
        position: camera.position.toArray(),
        target: orbit.target.toArray(),
      };
    };
    orbit.addEventListener("change", rememberView);

    const transform = new TransformControls(camera, renderer.domElement);
''',
        "camera state restoration",
    )

    updated = replace_once(
        updated,
        '''    const updateEdges = () => {
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
''',
        '''    const updateEdges = () => {
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
''',
        "in-place position synchronization",
    )

    updated = replace_once(
        updated,
        '''      orbit.update();
    };

    const zoomBy = (factor) => {
''',
        '''      orbit.update();
      rememberView();
    };

    const zoomBy = (factor) => {
''',
        "remember fit-all view",
    )

    updated = replace_once(
        updated,
        '''      if (current > 0.001) camera.position.copy(orbit.target).add(offset.setLength(next));
      orbit.update();
    };
''',
        '''      if (current > 0.001) camera.position.copy(orbit.target).add(offset.setLength(next));
      orbit.update();
      rememberView();
    };
''',
        "remember zoom view",
    )

    updated = replace_once(
        updated,
        '''    return () => {
      viewApiRef.current = null;
      selectionApiRef.current = null;
      cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener("pointerdown", pick);
      orbit.dispose(); transform.dispose(); disposable.forEach((x) => x?.dispose?.()); renderer.dispose(); host.replaceChildren();
    };
  }, [entities, relationships]);
''',
        '''    return () => {
      rememberView();
      orbit.removeEventListener("change", rememberView);
      viewApiRef.current = null;
      selectionApiRef.current = null;
      positionApiRef.current = null;
      cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener("pointerdown", pick);
      orbit.dispose(); transform.dispose(); disposable.forEach((x) => x?.dispose?.()); renderer.dispose(); host.replaceChildren();
    };
  }, [sceneKey]);
''',
        "scene dependency and cleanup",
    )

    if updated == original:
        print("Move/camera persistence fix is already applied. No files changed.")
        return 0

    print("All expected source blocks matched.")
    print(f"  {path}: ready ({len(updated) - len(original):+d} bytes)")

    if args.check:
        print("Check only: no files changed.")
        return 0

    backup = path.with_name(path.name + ".bak-before-move-camera-fix")
    if not backup.exists():
        shutil.copy2(path, backup)
    path.write_text(updated, encoding="utf-8")

    print("Ontology move/camera persistence fix applied.")
    print("Moving a block no longer rebuilds or resets the 3D camera.")
    print("Next: git diff --check && cd frontend && npm run build")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
