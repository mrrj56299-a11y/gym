import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useReducedMotion } from "framer-motion";
import { gsap } from "gsap";

type Lang = "ar" | "en";
type Zone = { mesh: THREE.Mesh; slug: string; part: string; material: THREE.MeshStandardMaterial; base: THREE.Color };

const MUSCLE = new THREE.Color("#ff6a2a");
const SELECTED = new THREE.Color("#ffeb3b");
const PARTS: Record<string, string[]> = {
  chest: ["chest-upper", "chest-mid", "chest-lower"],
  shoulders: ["front-delts", "side-delts", "rear-delts"],
  biceps: ["biceps-long", "biceps-short", "biceps-brachialis"],
  triceps: ["triceps-long", "triceps-lateral", "triceps-medial"],
  forearms: ["forearm-flexors", "forearm-extensors", "forearm-brachioradialis"],
  abs: ["abs-rectus", "abs-obliques", "abs-transverse"],
  quadriceps: ["quads-rectus-femoris", "quads-vastus-lateralis", "quads-vastus-medialis", "quads-vastus-intermedius"],
  adductors: ["adductors-upper", "adductors-middle", "adductors-lower"],
  back: ["back-lats", "back-upper", "back-mid", "back-lower", "back-traps"],
  glutes: ["glute-maximus", "glute-medius", "glute-minimus"],
  hamstrings: ["hamstrings-biceps-femoris", "hamstrings-semitendinosus", "hamstrings-semimembranosus"],
  calves: ["calves-gastrocnemius", "calves-soleus"],
};

function makeBodyMaterial(color: THREE.Color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.15,
    emissive: new THREE.Color("#ff4a10"),
    emissiveIntensity: 0.15,
  });
}

function buildMannequin(scene: THREE.Scene) {
  const root = new THREE.Group();
  scene.add(root);
  const zones: Zone[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  // --- Body shell (fiery glowing primitive mannequin) ---
  const skinMat = makeBodyMaterial(new THREE.Color("#d44820"));
  const trunkMat = makeBodyMaterial(new THREE.Color("#cc4a1e"));
  const limbMat = makeBodyMaterial(new THREE.Color("#c44618"));

  const addPart = (geo: THREE.BufferGeometry, mat: THREE.MeshStandardMaterial, pos: [number, number, number], scale: [number, number, number] = [1, 1, 1], rot: [number, number, number] = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    geometries.push(geo);
    return mesh;
  };

  // Head
  addPart(new THREE.SphereGeometry(0.28, 32, 24), skinMat, [0, 4.82, 0]);
  // Neck
  addPart(new THREE.CylinderGeometry(0.13, 0.15, 0.22, 20), trunkMat, [0, 4.46, 0]);
  // Torso
  addPart(new THREE.CylinderGeometry(0.42, 0.36, 1.2, 28), trunkMat, [0, 3.7, 0]);
  // Pelvis
  addPart(new THREE.SphereGeometry(0.38, 28, 20), trunkMat, [0, 2.95, 0], [1, 0.75, 1]);
  // Shoulders
  addPart(new THREE.SphereGeometry(0.24, 24, 18), trunkMat, [0, 4.18, 0], [1.8, 1, 1.1]);

  // Arms
  for (const sign of [-1, 1]) {
    addPart(new THREE.CylinderGeometry(0.12, 0.1, 0.85, 18), limbMat, [sign * 0.62, 3.85, 0], [1, 1, 1], [0, 0, sign * 0.12]);
    addPart(new THREE.CylinderGeometry(0.1, 0.085, 0.78, 18), limbMat, [sign * 0.72, 3.0, 0], [1, 1, 1], [0, 0, sign * 0.18]);
    addPart(new THREE.SphereGeometry(0.1, 16, 12), limbMat, [sign * 0.76, 2.58, 0]);
  }

  // Legs
  for (const sign of [-1, 1]) {
    addPart(new THREE.CylinderGeometry(0.16, 0.13, 1.15, 20), limbMat, [sign * 0.2, 2.15, 0]);
    addPart(new THREE.CylinderGeometry(0.13, 0.1, 1.1, 20), limbMat, [sign * 0.2, 1.0, 0]);
    addPart(new THREE.BoxGeometry(0.16, 0.1, 0.32), limbMat, [sign * 0.2, 0.4, 0.07]);
  }

  // --- Muscle zones (fiery patches) ---
  const zoneGeo = new THREE.SphereGeometry(1, 20, 14);
  geometries.push(zoneGeo);

  const addZone = (slug: string, partIndex: number, position: [number, number, number], scale: [number, number, number], rotZ = 0) => {
    const partSlug = PARTS[slug]?.[partIndex] ?? `${slug}-${partIndex + 1}`;
    const material = new THREE.MeshStandardMaterial({
      color: MUSCLE.clone(),
      roughness: 0.3,
      metalness: 0.1,
      emissive: MUSCLE.clone(),
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(zoneGeo, material);
    mesh.position.set(...position);
    mesh.rotation.z = rotZ;
    mesh.scale.set(...scale);
    mesh.castShadow = false;
    mesh.renderOrder = 3;
    mesh.userData.slug = slug;
    mesh.userData.part = partSlug;
    mesh.userData.role = "muscle-zone";
    root.add(mesh);
    zones.push({ mesh, slug, part: partSlug, material, base: MUSCLE.clone() });
  };

  const pair = (slug: string, index: number, y: number, x: number, z: number, scale: [number, number, number], rot = 0) => {
    for (const sign of [-1, 1]) addZone(slug, index, [sign * x, y, z], scale, sign * rot);
  };

  // FRONT zones
  pair("chest", 0, 4.05, 0.22, 0.32, [0.24, 0.12, 0.05]);
  pair("chest", 1, 3.88, 0.22, 0.34, [0.24, 0.11, 0.05]);
  pair("chest", 2, 3.72, 0.2, 0.33, [0.21, 0.1, 0.05]);
  pair("shoulders", 0, 4.18, 0.42, 0.18, [0.16, 0.16, 0.1]);
  pair("shoulders", 1, 4.16, 0.5, 0.05, [0.1, 0.16, 0.12]);
  pair("shoulders", 2, 4.18, 0.42, -0.18, [0.16, 0.16, 0.1]);
  pair("biceps", 0, 3.82, 0.66, 0.14, [0.1, 0.22, 0.06]);
  pair("biceps", 1, 3.68, 0.68, 0.15, [0.09, 0.18, 0.055]);
  pair("biceps", 2, 3.52, 0.7, 0.15, [0.08, 0.16, 0.05]);
  pair("triceps", 0, 3.85, 0.66, -0.14, [0.1, 0.22, 0.06]);
  pair("triceps", 1, 3.7, 0.68, -0.15, [0.09, 0.18, 0.055]);
  pair("triceps", 2, 3.9, 0.72, -0.05, [0.08, 0.2, 0.06]);
  pair("forearms", 0, 3.15, 0.74, 0.1, [0.08, 0.22, 0.05], -0.1);
  pair("forearms", 1, 3.06, 0.76, -0.09, [0.08, 0.2, 0.05], -0.1);
  pair("forearms", 2, 3.25, 0.78, 0.12, [0.07, 0.18, 0.045], -0.1);
  pair("abs", 0, 3.55, 0.1, 0.33, [0.09, 0.12, 0.035]);
  pair("abs", 1, 3.32, 0.1, 0.32, [0.09, 0.12, 0.035]);
  addZone("abs", 2, [0.22, 3.1, 0.28], [0.07, 0.18, 0.04], -0.15);
  addZone("abs", 2, [-0.22, 3.1, 0.28], [0.07, 0.18, 0.04], 0.15);
  pair("quadriceps", 0, 2.2, 0.2, 0.14, [0.13, 0.3, 0.07], -0.05);
  pair("quadriceps", 1, 2.0, 0.26, 0.13, [0.1, 0.28, 0.07], 0.08);
  pair("quadriceps", 2, 1.98, 0.14, 0.15, [0.1, 0.26, 0.07], -0.08);
  pair("quadriceps", 3, 2.18, 0.2, 0.22, [0.07, 0.22, 0.05]);
  pair("adductors", 0, 2.05, 0.06, 0.1, [0.08, 0.28, 0.06], -0.1);
  pair("adductors", 1, 1.98, 0.08, 0.09, [0.07, 0.24, 0.055], -0.1);
  pair("adductors", 2, 1.75, 0.07, 0.1, [0.06, 0.18, 0.05], -0.08);

  // BACK zones
  addZone("back", 4, [0, 3.95, -0.34], [0.26, 0.18, 0.05]);
  pair("back", 0, 3.78, 0.22, -0.27, [0.16, 0.2, 0.05]);
  pair("back", 1, 3.88, 0.1, -0.29, [0.09, 0.14, 0.045]);
  pair("back", 2, 3.45, 0.24, -0.26, [0.15, 0.22, 0.055]);
  pair("back", 3, 3.12, 0.15, -0.26, [0.1, 0.15, 0.045]);
  pair("glutes", 0, 2.65, 0.2, -0.25, [0.19, 0.19, 0.07]);
  pair("glutes", 1, 2.52, 0.2, -0.24, [0.17, 0.15, 0.06]);
  pair("glutes", 2, 2.64, 0.3, -0.22, [0.08, 0.12, 0.05]);
  pair("hamstrings", 0, 2.1, 0.2, -0.13, [0.12, 0.3, 0.06], -0.04);
  pair("hamstrings", 1, 1.95, 0.26, -0.13, [0.1, 0.28, 0.06], 0.06);
  pair("hamstrings", 2, 1.9, 0.14, -0.14, [0.1, 0.26, 0.06], -0.06);
  pair("calves", 0, 1.0, 0.22, -0.1, [0.1, 0.24, 0.07]);
  pair("calves", 1, 0.82, 0.22, -0.11, [0.08, 0.22, 0.06]);

  // Ground shadow (fiery glow disc)
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.85, 40),
    new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.32, 0);
  shadow.scale.set(0.9, 1.3, 1);
  root.add(shadow);

  return { root, zones, geometries };
}

// --- Fire particle system ---
function buildFireParticles(scene: THREE.Scene, root: THREE.Group) {
  const count = 120;
  const positions = new Float32Array(count * 3);
  const velocities: { x: number; y: number; z: number }[] = [];
  const lifetimes: number[] = [];
  const maxLifetimes: number[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.2 + Math.random() * 0.5;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 0.4 + Math.random() * 0.3;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    velocities.push({
      x: (Math.random() - 0.5) * 0.003,
      y: 0.008 + Math.random() * 0.015,
      z: (Math.random() - 0.5) * 0.003,
    });
    lifetimes.push(Math.random());
    maxLifetimes.push(0.8 + Math.random() * 0.6);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Fire color texture via vertex colors
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = 1;
    colors[i * 3 + 1] = 0.5 + Math.random() * 0.3;
    colors[i * 3 + 2] = 0.1;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.08,
    transparent: true,
    opacity: 0.7,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  root.add(points);

  const update = (delta: number) => {
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    const col = geometry.getAttribute("color") as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      lifetimes[i] += delta;
      if (lifetimes[i] > maxLifetimes[i]) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.2 + Math.random() * 0.5;
        pos.setXYZ(i, Math.cos(angle) * radius, 0.4, Math.sin(angle) * radius);
        velocities[i] = {
          x: (Math.random() - 0.5) * 0.003,
          y: 0.008 + Math.random() * 0.015,
          z: (Math.random() - 0.5) * 0.003,
        };
        lifetimes[i] = 0;
        maxLifetimes[i] = 0.8 + Math.random() * 0.6;
      } else {
        pos.setXYZ(
          i,
          pos.getX(i) + velocities[i].x,
          pos.getY(i) + velocities[i].y,
          pos.getZ(i) + velocities[i].z,
        );
      }
      // Color shifts: bright orange -> red -> dark as it rises
      const t = lifetimes[i] / maxLifetimes[i];
      col.setXYZ(i, 1, (1 - t) * 0.6 + 0.1, (1 - t) * 0.15);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  };

  return { points, update, dispose: () => { geometry.dispose(); material.dispose(); } };
}

export default function Anatomy3D({ side, selected, activePart, onSelect, onHover, dir, names }: {
  side: "front" | "back" | "profile";
  selected: string[];
  activePart: string;
  onSelect: (slug: string) => void;
  onHover: (slug: string | null) => void;
  dir: Lang;
  names: Record<string, string>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const renderRef = useRef<() => void>(() => {});
  const renderFrameRef = useRef<number | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const zonesRef = useRef<Zone[]>([]);
  const autoRotateRef = useRef(true);
  const fireRef = useRef<{ update: (delta: number) => void; dispose: () => void } | null>(null);
  const pulseRef = useRef(0);
  const callbacks = useRef({ onSelect, onHover, names, dir });
  const reduce = useReducedMotion();
  callbacks.current = { onSelect, onHover, names, dir };

  const requestRender = () => {
    if (renderFrameRef.current !== null) return;
    renderFrameRef.current = requestAnimationFrame(() => {
      renderFrameRef.current = null;
      renderRef.current();
    });
  };

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 2.6, 8.5);
    camera.lookAt(0, 2.6, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(element.clientWidth, element.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-label", dir === "ar" ? "مجسّم ناري ثلاثي الأبعاد" : "Fiery 3D human mannequin");
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.style.touchAction = "none";
    element.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting — warm fiery tones
    scene.add(new THREE.HemisphereLight(0xff8844, 0x1a0a05, 1.4));
    const key = new THREE.DirectionalLight(0xffaa55, 2.5);
    key.position.set(-3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff4400, 1.2);
    rim.position.set(3, 4, -3);
    scene.add(rim);
    const fill = new THREE.PointLight(0xff6600, 0.6, 12);
    fill.position.set(0, 3, 4);
    scene.add(fill);
    // Pulsing ember light at the base
    const emberLight = new THREE.PointLight(0xff3300, 1.5, 6);
    emberLight.position.set(0, 0.5, 0);
    scene.add(emberLight);

    const built = buildMannequin(scene);
    modelRef.current = built.root;
    zonesRef.current = built.zones;

    // Fire particles
    if (!reduce) {
      const fire = buildFireParticles(scene, built.root);
      fireRef.current = fire;
    }

    const render = () => renderer.render(scene, camera);
    renderRef.current = render;
    render();

    if (!reduce) gsap.fromTo(renderer.domElement, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" });
    else renderer.domElement.style.opacity = "1";

    // Auto-rotation + fire + ember pulse loop
    let raf = 0;
    let lastTime = performance.now();
    const animate = () => {
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (autoRotateRef.current && modelRef.current) {
        modelRef.current.rotation.y += 0.005;
      }
      if (fireRef.current) fireRef.current.update(delta);

      // Pulsing ember light and emissive body
      pulseRef.current += delta * 2.5;
      const pulse = 0.5 + Math.sin(pulseRef.current) * 0.5;
      emberLight.intensity = 1.0 + pulse * 1.2;
      built.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial && obj.userData.role !== "muscle-zone") {
          obj.material.emissiveIntensity = 0.1 + pulse * 0.12;
        }
      });

      render();
      raf = requestAnimationFrame(animate);
    };
    if (!reduce) raf = requestAnimationFrame(animate);
    else render();

    // Interaction
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down = false;
    let dragged = false;
    let previousX = 0;

    const onDown = (event: PointerEvent) => {
      down = true;
      dragged = false;
      previousX = event.clientX;
      autoRotateRef.current = false;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const onMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      if (down) {
        const delta = event.clientX - previousX;
        if (Math.abs(delta) > 1) dragged = true;
        if (modelRef.current) modelRef.current.rotation.y += delta * 0.015;
        previousX = event.clientX;
      } else {
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(built.root.children, false).find(item => item.object.userData.role === "muscle-zone");
        const slug = hit?.object.userData.slug as string | undefined;
        if (hoveredRef.current !== (slug ?? null)) {
          hoveredRef.current = slug ?? null;
          setHoveredSlug(slug ?? null);
          callbacks.current.onHover(slug ?? null);
        }
        renderer.domElement.style.cursor = slug ? "pointer" : "grab";
      }
    };

    const onUp = (event: PointerEvent) => {
      if (down && !dragged) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(built.root.children, false).find(item => item.object.userData.role === "muscle-zone");
        const slug = hit?.object.userData.slug as string | undefined;
        if (slug) {
          setHoveredSlug(slug);
          callbacks.current.onSelect(slug);
        }
      }
      down = false;
    };

    const onLeave = () => {
      hoveredRef.current = null;
      setHoveredSlug(null);
      callbacks.current.onHover(null);
    };

    const resize = () => {
      if (!host.current) return;
      camera.aspect = host.current.clientWidth / Math.max(1, host.current.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(host.current.clientWidth, host.current.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);

    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointercancel", onUp);
    renderer.domElement.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointercancel", onUp);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      if (renderFrameRef.current !== null) cancelAnimationFrame(renderFrameRef.current);
      renderFrameRef.current = null;
      renderRef.current = () => {};
      gsap.killTweensOf(renderer.domElement);
      fireRef.current?.dispose();
      fireRef.current = null;
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
          else object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      rendererRef.current = null;
      modelRef.current = null;
      zonesRef.current = [];
    };
  }, [reduce, dir]);

  // Side view — pause auto-rotate, animate to target, then resume
  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    autoRotateRef.current = false;
    gsap.killTweensOf(model.rotation);
    const target = side === "front" ? 0 : side === "back" ? Math.PI : Math.PI / 2;
    if (reduce) {
      model.rotation.y = target;
      autoRotateRef.current = true;
      requestRender();
    } else {
      gsap.to(model.rotation, {
        y: target,
        duration: 0.7,
        ease: "power2.inOut",
        onUpdate: requestRender,
        onComplete: () => { autoRotateRef.current = true; },
      });
    }
  }, [side, reduce]);

  // Zone highlighting — fiery glow
  useEffect(() => {
    for (const zone of zonesRef.current) {
      const chosen = selected.includes(zone.slug);
      const active = chosen && (!activePart || activePart === zone.part);
      const color = chosen ? SELECTED : zone.base;
      const opacity = chosen ? (activePart && !active ? 0.4 : 0.9) : hoveredSlug === zone.slug ? 0.35 : 0;
      const emissiveIntensity = chosen ? (active ? 1.2 : 0.6) : hoveredSlug === zone.slug ? 0.4 : 0;
      gsap.killTweensOf(zone.material.color);
      gsap.killTweensOf(zone.material);
      gsap.killTweensOf(zone.material, "emissiveIntensity");
      if (reduce) {
        zone.material.color.copy(color);
        zone.material.opacity = opacity;
        zone.material.emissive.copy(color);
        zone.material.emissiveIntensity = emissiveIntensity;
      } else {
        gsap.to(zone.material.color, { r: color.r, g: color.g, b: color.b, duration: 0.3, ease: "power1.out", onUpdate: requestRender });
        gsap.to(zone.material, { opacity, duration: 0.25, ease: "power1.out", onUpdate: requestRender });
        gsap.to(zone.material, { emissiveIntensity, duration: 0.25, ease: "power1.out", onUpdate: requestRender });
      }
      zone.material.transparent = true;
    }
  }, [selected, activePart, hoveredSlug, reduce]);

  return (
    <div ref={host} className="anatomy3d-root" dir={dir}>
      <div className="anatomy3d-badge">
        <span className="anatomy3d-orb" />
        <span>{dir === "ar" ? "مانيكان ناري" : "FIERY MANNEQUIN"}</span>
      </div>
      <div className="anatomy3d-hint">
        {dir === "ar" ? "يلف تلقائيًا · اسحب للتحكم · اضغط لاختيار العضلة" : "AUTO-ROTATING · DRAG TO CONTROL · TAP A MUSCLE"}
      </div>
      <div className={`anatomy3d-hover${hoveredSlug ? " visible" : ""}`} aria-live="polite">
        {hoveredSlug ? names[hoveredSlug] ?? hoveredSlug : ""}
      </div>
    </div>
  );
}
