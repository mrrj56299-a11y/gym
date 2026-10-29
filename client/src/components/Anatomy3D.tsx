import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useReducedMotion } from "framer-motion";
import { gsap } from "gsap";

type Lang = "ar" | "en";
type Zone = { mesh: THREE.Mesh; slug: string; part: string; material: THREE.MeshStandardMaterial; base: THREE.Color };

const MUSCLE = new THREE.Color("#f0e4d8");
const SELECTED = new THREE.Color("#E53935");
const PARTS: Record<string, string[]> = {
  chest:["chest-upper","chest-mid","chest-lower"], shoulders:["front-delts","side-delts","rear-delts"],
  biceps:["biceps-long","biceps-short","biceps-brachialis"], triceps:["triceps-long","triceps-lateral","triceps-medial"],
  forearms:["forearm-flexors","forearm-extensors","forearm-brachioradialis"], abs:["abs-rectus","abs-obliques","abs-transverse"],
  quadriceps:["quads-rectus-femoris","quads-vastus-lateralis","quads-vastus-medialis","quads-vastus-intermedius"],
  adductors:["adductors-upper","adductors-middle","adductors-lower"],
  back:["back-lats","back-upper","back-mid","back-lower","back-traps"],
  glutes:["glute-maximus","glute-medius","glute-minimus"],
  hamstrings:["hamstrings-biceps-femoris","hamstrings-semitendinosus","hamstrings-semimembranosus"],
  calves:["calves-gastrocnemius","calves-soleus"],
};

function makeStandard(color: THREE.Color, roughness = 0.4) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

function buildMannequin(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.position.y = -2.5;
  root.scale.y = 0.92;
  scene.add(root);
  const sphere = new THREE.SphereGeometry(1, 28, 20);
  const zones: Zone[] = [];

  const addZone = (slug: string, partIndex: number, position: [number, number, number], scale: [number, number, number], rotationZ = 0) => {
    const partSlug = PARTS[slug]?.[partIndex] ?? `${slug}-${partIndex + 1}`;
    const material = makeStandard(MUSCLE.clone(), 0.62);
    material.transparent = true;
    material.opacity = 0;
    material.depthWrite = false;
    const mesh = new THREE.Mesh(sphere, material);
    mesh.position.set(...position);
    mesh.rotation.z = rotationZ;
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.renderOrder = 2;
    mesh.userData.slug = slug;
    mesh.userData.part = partSlug;
    mesh.userData.role = "muscle-zone";
    root.add(mesh);
    zones.push({ mesh, slug, part: partSlug, material, base: MUSCLE.clone() });
  };
  const pair = (slug: string, index: number, y: number, x: number, z: number, scale: [number, number, number], rotation = 0) => {
    for (const sign of [-1, 1]) addZone(slug, index, [sign * x, y, z], scale, sign * rotation);
  };

  // Front: upper/mid/lower chest, deltoids, arms and abdominal/leg subdivisions.
  pair("chest", 0, 4.14, 0.27, 0.335, [0.31, 0.16, 0.075]);
  pair("chest", 1, 3.90, 0.27, 0.347, [0.31, 0.15, 0.075]);
  pair("chest", 2, 3.68, 0.25, 0.332, [0.28, 0.135, 0.07]);
  pair("shoulders", 0, 4.28, 0.57, 0.19, [0.22, 0.22, 0.15]);
  pair("shoulders", 1, 4.26, 0.68, 0.04, [0.14, 0.22, 0.18]);
  pair("shoulders", 2, 4.28, 0.57, -0.19, [0.22, 0.22, 0.15]);
  pair("biceps", 0, 3.91, 0.75, 0.16, [0.135, 0.29, 0.095]);
  pair("biceps", 1, 3.83, 0.76, 0.18, [0.12, 0.23, 0.085]);
  pair("biceps", 2, 3.60, 0.79, 0.19, [0.10, 0.20, 0.075]);
  pair("triceps", 0, 3.95, 0.77, -0.16, [0.145, 0.29, 0.09]);
  pair("triceps", 1, 3.81, 0.78, -0.18, [0.12, 0.22, 0.085]);
  pair("triceps", 2, 3.96, 0.83, -0.06, [0.10, 0.29, 0.10]);
  pair("forearms", 0, 3.29, 0.88, 0.13, [0.105, 0.29, 0.08], -0.12);
  pair("forearms", 1, 3.20, 0.91, -0.11, [0.105, 0.27, 0.08], -0.12);
  pair("forearms", 2, 3.42, 0.94, 0.17, [0.085, 0.25, 0.07], -0.12);
  pair("abs", 0, 3.68, 0.13, 0.329, [0.11, 0.15, 0.045]);
  pair("abs", 1, 3.42, 0.13, 0.315, [0.11, 0.15, 0.045]);
  pair("abs", 2, 3.20, 0.33, 0.265, [0.085, 0.27, 0.055], -0.20);
  pair("quadriceps", 0, 2.06, 0.28, 0.17, [0.16, 0.40, 0.10], -0.06);
  pair("quadriceps", 1, 1.88, 0.34, 0.16, [0.13, 0.36, 0.10], 0.10);
  pair("quadriceps", 2, 1.85, 0.20, 0.18, [0.12, 0.34, 0.10], -0.10);
  pair("quadriceps", 3, 2.04, 0.28, 0.27, [0.08, 0.30, 0.06]);
  pair("adductors", 0, 1.91, 0.13, 0.12, [0.105, 0.38, 0.085], -0.15);
  pair("adductors", 1, 1.85, 0.15, 0.11, [0.09, 0.32, 0.08], -0.15);
  pair("adductors", 2, 1.60, 0.14, 0.12, [0.075, 0.24, 0.065], -0.12);

  // Posterior surfaces become visible when the model turns around its centre.
  addZone("back", 4, [0, 4.08, -0.31], [0.34, 0.23, 0.075]);
  pair("back", 0, 3.87, 0.27, -0.28, [0.21, 0.25, 0.075]);
  pair("back", 1, 3.95, 0.12, -0.30, [0.11, 0.19, 0.065]);
  pair("back", 2, 3.53, 0.30, -0.27, [0.20, 0.30, 0.085]);
  pair("back", 3, 3.18, 0.19, -0.27, [0.14, 0.20, 0.065]);
  pair("glutes", 0, 2.64, 0.25, -0.275, [0.245, 0.25, 0.10]);
  pair("glutes", 1, 2.49, 0.25, -0.26, [0.22, 0.20, 0.09]);
  pair("glutes", 2, 2.63, 0.37, -0.24, [0.10, 0.16, 0.07]);
  pair("hamstrings", 0, 2.04, 0.28, -0.16, [0.16, 0.40, 0.095]);
  pair("hamstrings", 1, 1.88, 0.34, -0.16, [0.13, 0.36, 0.09]);
  pair("hamstrings", 2, 1.83, 0.20, -0.17, [0.12, 0.34, 0.09]);
  pair("calves", 0, 0.96, 0.30, -0.13, [0.13, 0.33, 0.10]);
  pair("calves", 1, 0.79, 0.30, -0.14, [0.105, 0.29, 0.09]);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.73, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.24 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.03, 0);
  shadow.scale.set(0.8, 1.25, 1);
  root.add(shadow);
  return { root, zones, geometries: [sphere] };
}

export default function Anatomy3D({ side, selected, activePart, onSelect, onHover, dir, names }: {
  side: "front" | "back" | "profile"; selected: string[]; activePart: string;
  onSelect: (slug: string) => void; onHover: (slug: string | null) => void;
  dir: Lang; names: Record<string, string>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [modelState, setModelState] = useState<"loading" | "ready" | "error">("loading");
  const hoveredRef = useRef<string | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const renderRef = useRef<() => void>(() => {});
  const renderFrameRef = useRef<number | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const zonesRef = useRef<Zone[]>([]);
  const callbacks = useRef({ onSelect, onHover, names, dir });
  const reduce = useReducedMotion();
  callbacks.current = { onSelect, onHover, names, dir };
  const requestRender = () => {
    if (renderFrameRef.current !== null) return;
    renderFrameRef.current = requestAnimationFrame(() => { renderFrameRef.current = null; renderRef.current(); });
  };

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.35, 9.3);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.setSize(element.clientWidth, element.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-label", "Interactive three-dimensional human muscle model");
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.style.touchAction = "none";
    element.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.HemisphereLight(0xf3f0e9, 0x303038, 1.45));
    const key = new THREE.DirectionalLight(0xfff8eb, 2.25);
    key.position.set(-3.8, 7.2, 5.2);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xa9c4d8, 1.0);
    rim.position.set(3.2, 4.0, -4.0);
    scene.add(rim);
    const fill = new THREE.PointLight(0xffffff, 0.35, 9);
    fill.position.set(0, 3.2, 4.5);
    scene.add(fill);

    const built = buildMannequin(scene);
    modelRef.current = built.root;
    zonesRef.current = built.zones;
    setModelState("loading");
    const modelAbort = new AbortController();
    let disposed = false;
    fetch("/models/human-body.obj", { signal: modelAbort.signal })
      .then(response => { if (!response.ok) throw new Error("Human model could not be loaded"); return response.text(); })
      .then(text => {
        if (disposed) return;
        const human = new OBJLoader().parse(text);
        const skin = new THREE.Color("#e5c6ab");
        const shorts = new THREE.Color("#303035");
        human.name = "licensed-human-body";
        human.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return;
          const original = object.geometry;
          const geometry = mergeVertices(original, 0.00001);
          const positions = geometry.getAttribute("position");
          const colors = new Float32Array(positions.count * 3);
          const smooth = (edge0: number, edge1: number, value: number) => {
            const x = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
            return x * x * (3 - 2 * x);
          };
          for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const covered = smooth(2.10, 2.22, y) * (1 - smooth(3.02, 3.14, y)) * (1 - smooth(0.48, 0.58, Math.abs(x)));
            const color = skin.clone().lerp(shorts, covered);
            color.toArray(colors, i * 3);
          }
          geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
          geometry.computeVertexNormals();
          object.geometry = geometry;
          object.material = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.72, metalness: 0.01 });
          object.castShadow = true;
          object.receiveShadow = true;
          original.dispose();
        });
        built.root.add(human);
        setModelState("ready");
        requestRender();
      })
      .catch(() => { if (!disposed) setModelState("error"); });
    const render = () => renderer.render(scene, camera);
    renderRef.current = render;
    render();
    if (!reduce) gsap.fromTo(renderer.domElement, { autoAlpha: 0, y: 9 }, { autoAlpha: 1, y: 0, duration: 0.75, ease: "power2.out" });
    else renderer.domElement.style.opacity = "1";

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down = false;
    let dragged = false;
    let previousX = 0;
    const onDown = (event: PointerEvent) => { down = true; dragged = false; previousX = event.clientX; renderer.domElement.setPointerCapture(event.pointerId); };
    const onMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      if (down) {
        const delta = event.clientX - previousX;
        if (Math.abs(delta) > 1) dragged = true;
        built.root.rotation.y += delta * 0.018;
        previousX = event.clientX;
        requestRender();
      } else {
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(built.root.children, false).find(item => item.object.userData.role === "muscle-zone");
        const slug = hit?.object.userData.slug as string | undefined;
        if (hoveredRef.current !== (slug ?? null)) { hoveredRef.current = slug ?? null; setHoveredSlug(slug ?? null); callbacks.current.onHover(slug ?? null); }
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
        if (slug) { setHoveredSlug(slug); callbacks.current.onSelect(slug); }
      }
      down = false;
    };
    const onLeave = () => { hoveredRef.current = null; setHoveredSlug(null); callbacks.current.onHover(null); };
    const resize = () => {
      if (!host.current) return;
      camera.aspect = host.current.clientWidth / Math.max(1, host.current.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(host.current.clientWidth, host.current.clientHeight);
      requestRender();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointercancel", onUp);
    renderer.domElement.addEventListener("pointerleave", onLeave);
    return () => {
      disposed = true;
      modelAbort.abort();
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
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
          else object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      rendererRef.current = null;
      modelRef.current = null;
      zonesRef.current = [];
    };
  }, [reduce]);

  useEffect(() => {
    const model = modelRef.current;
    const renderer = rendererRef.current;
    if (!model) return;
    gsap.killTweensOf(model.rotation);
    const targetAngle = side === "front" ? 0 : side === "back" ? Math.PI : Math.PI / 2;
    if (reduce) { model.rotation.y = targetAngle; requestRender(); }
    else gsap.to(model.rotation, { y: targetAngle, duration: 0.8, ease: "power2.inOut", onUpdate: requestRender });
    renderer?.renderLists.dispose();
  }, [side, reduce]);

  useEffect(() => {
    for (const zone of zonesRef.current) {
      const chosen = selected.includes(zone.slug);
      const active = chosen && (!activePart || activePart === zone.part);
      const color = chosen ? SELECTED : zone.base;
      const opacity = chosen ? (activePart && !active ? 0.42 : 1) : hoveredSlug === zone.slug ? 0.36 : 0;
      gsap.killTweensOf(zone.material.color);
      gsap.killTweensOf(zone.material);
      if (reduce) {
        zone.material.color.copy(color);
        zone.material.opacity = opacity;
      } else {
        gsap.to(zone.material.color, { r: color.r, g: color.g, b: color.b, duration: 0.32, ease: "power1.out", onUpdate: requestRender });
        gsap.to(zone.material, { opacity, duration: 0.28, ease: "power1.out", onUpdate: requestRender });
      }
      zone.material.transparent = true;
    }
  }, [selected, activePart, hoveredSlug, reduce]);

  return <div ref={host} className="anatomy3d-root" dir={dir}>
    <div className="anatomy3d-badge"><span className="anatomy3d-orb"/><span>{dir === "ar" ? "مجسّم تشريحي تفاعلي" : "INTERACTIVE 3D MODEL"}</span></div>
    {modelState !== "ready" && <div className={`anatomy3d-loading ${modelState === "error" ? "error" : ""}`} role="status">{modelState === "loading" ? (dir === "ar" ? "جارٍ تحميل المجسّم…" : "Loading human model…") : (dir === "ar" ? "تعذّر تحميل المجسّم" : "Human model could not be loaded")}</div>}
    <div className="anatomy3d-hint">{dir === "ar" ? "اسحب للدوران · اضغط لاختيار العضلة" : "DRAG TO ROTATE · TAP A MUSCLE"}</div>
    <div className={`anatomy3d-hover${hoveredSlug ? " visible" : ""}`} aria-live="polite">{hoveredSlug ? names[hoveredSlug] ?? hoveredSlug : ""}</div>
  </div>;
}
