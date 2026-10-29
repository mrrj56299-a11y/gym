import { useEffect, useState } from "react";
import { Lottie } from "lottie-react";

export default function LottieMedia({ src, label }: { src: string; label: string }) {
  const [animationData, setAnimationData] = useState<Record<string, unknown> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setAnimationData(null);
    setFailed(false);
    fetch(src, { signal: controller.signal, credentials: "same-origin" })
      .then(response => { if (!response.ok) throw new Error("Animation file could not be loaded."); return response.json(); })
      .then(data => { if (!controller.signal.aborted) setAnimationData(data); })
      .catch(error => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [src]);
  if (failed) return <div className="media-placeholder"><span>{label}</span><small>Demo unavailable</small></div>;
  if (!animationData) return <div className="media-placeholder media-loading"><span>{label}</span><small>Loading demonstration…</small></div>;
  return <div className="exercise-media lottie-media" aria-label={label}><Lottie src={animationData} loop autoplay aria-label={label} /></div>;
}
