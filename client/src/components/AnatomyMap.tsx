import { useEffect, useRef, useState } from "react";
import { Moon, RefreshCw, Sun, ZoomIn, ZoomOut } from "lucide-react";
import { ANATOMY_IMAGE_SIZE, HOTSPOTS } from "@/lib/anatomyHotspots";

type Lang = "ar" | "en";
type Theme = "dark" | "clinical";
type View = { scale: number; x: number; y: number };

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const START_VIEW: View = { scale: 1, x: 0, y: 0 };
const LABELS = {
  ar: { badge: "خريطة العضلات", hint: "اسحب للتحريك · مرّر للتقريب · اضغط على العضلة", zoomIn: "تقريب", zoomOut: "تبعيد", reset: "إعادة الضبط", toLight: "إضاءة فاتحة", toDark: "إضاءة داكنة", toolbar: "أدوات الخريطة" },
  en: { badge: "ANATOMY MAP", hint: "DRAG TO PAN · SCROLL TO ZOOM · TAP A MUSCLE", zoomIn: "Zoom in", zoomOut: "Zoom out", reset: "Reset view", toLight: "Clinical light", toDark: "Dark studio", toolbar: "Map controls" },
};

export default function AnatomyMap({ side, selected, activePart, onSelect, dir, names, theme, onThemeToggle }: {
  side: "front" | "back";
  selected: string[];
  activePart: string;
  onSelect: (slug: string, part: string) => void;
  dir: Lang;
  names: Record<string, string>;
  theme: Theme;
  onThemeToggle: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; originX: number; originY: number; moved: boolean } | null>(null);
  const [view, setView] = useState<View>(START_VIEW);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const face = side;
  const t = LABELS[dir];

  const clampView = (next: View): View => {
    const element = viewportRef.current;
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next.scale));
    if (!element) return { ...next, scale };
    const maxX = ((scale - 1) * element.clientWidth) / 2;
    const maxY = ((scale - 1) * element.clientHeight) / 2;
    return {
      scale,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  };

  const zoomBy = (factor: number) => setView(current => clampView({ ...current, scale: current.scale * factor }));

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  });

  const zoneAt = (target: EventTarget | null) => (target as Element | null)?.closest<SVGElement>("[data-part]") ?? null;

  const onPointerDown = (event: React.PointerEvent) => {
    dragRef.current = { x: event.clientX, y: event.clientY, originX: view.x, originY: view.y, moved: false };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) {
      setHovered(zoneAt(event.target)?.dataset.slug ?? null);
      return;
    }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    setDragging(true);
    setView(current => (current.scale > 1 ? clampView({ ...current, x: drag.originX + dx, y: drag.originY + dy }) : current));
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!drag || drag.moved) return;
    const zone = zoneAt(event.target);
    if (zone?.dataset.slug && zone.dataset.part) onSelect(zone.dataset.slug, zone.dataset.part);
  };

  const onPointerLeave = () => {
    dragRef.current = null;
    setDragging(false);
    setHovered(null);
  };

  return (
    <div className="anatomy-map-root" dir={dir}>
      <div className="anatomy-map-badge">
        <span className="anatomy-map-orb" />
        <span>{t.badge}</span>
      </div>
      <div className="anatomy-map-hint">{t.hint}</div>
      <div
        ref={viewportRef}
        className="anatomy-map-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerLeave}
        onPointerLeave={onPointerLeave}
      >
        <div
          className={`anatomy-map-scene ${face}${theme === "dark" ? " dark" : ""}${dragging ? " dragging" : ""}`}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          <img src="/anatomy/mannequin.jpeg" alt={dir === "ar" ? "صورة تشريحية للجسم من الأمام والخلف" : "Anatomy figure, front and back"} draggable={false} />
          <svg viewBox={`0 0 ${ANATOMY_IMAGE_SIZE.width} ${ANATOMY_IMAGE_SIZE.height}`} preserveAspectRatio="none" aria-hidden="true">
            {HOTSPOTS[face].map((zone, index) => {
              const chosen = selected.includes(zone.slug);
              const isActive = chosen && (!activePart || activePart === zone.part);
              const state = isActive ? "is-selected" : chosen ? "is-dimmed" : hovered === zone.slug ? "is-hover" : "";
              return (
                <ellipse
                  key={index}
                  cx={zone.cx}
                  cy={zone.cy}
                  rx={zone.rx}
                  ry={zone.ry}
                  data-slug={zone.slug}
                  data-part={zone.part}
                  pointerEvents="all"
                  className={`anatomy-map-zone ${state}`}
                />
              );
            })}
          </svg>
        </div>
      </div>
      <div className="anatomy-map-controls" role="toolbar" aria-label={t.toolbar}>
        <button type="button" data-compact="true" className="anatomy-map-control" aria-label={t.zoomIn} title={t.zoomIn} onClick={() => zoomBy(1.25)}><ZoomIn size={15} /></button>
        <button type="button" data-compact="true" className="anatomy-map-control" aria-label={t.zoomOut} title={t.zoomOut} onClick={() => zoomBy(0.8)}><ZoomOut size={15} /></button>
        <button type="button" data-compact="true" className="anatomy-map-control" aria-label={t.reset} title={t.reset} onClick={() => setView(START_VIEW)}><RefreshCw size={15} /></button>
        <button type="button" data-compact="true" className="anatomy-map-control" aria-label={theme === "dark" ? t.toLight : t.toDark} title={theme === "dark" ? t.toLight : t.toDark} onClick={onThemeToggle}>
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
      <div className={`anatomy-map-hover${hovered ? " visible" : ""}`} aria-live="polite">
        {hovered ? names[hovered] ?? hovered : ""}
      </div>
    </div>
  );
}
