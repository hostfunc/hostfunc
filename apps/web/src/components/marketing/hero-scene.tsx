"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useRef, useState } from "react";

import { HeroFallback } from "./hero-scene/hero-fallback";
import { SceneContent } from "./hero-scene/scene-content";
import { useDeviceTier } from "./hero-scene/use-device-tier";

/** Bloom post-processing is disabled — it adds a render pass that strains the GPU
 *  (we already fake glow via additive/emissive materials). Flip to enable. */
const BLOOM_ENABLED = false;

/** Pause the render loop while the hero is scrolled out of view. */
function useInView<T extends HTMLElement>(ref: React.RefObject<T | null>): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? true),
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

/**
 * Hero background: an interactive 3D "functions calling functions" scene on
 * capable desktops, gracefully degrading to a lighter scene or a static SVG
 * fallback on weaker devices / `prefers-reduced-motion`.
 *
 * Mounted via `next/dynamic({ ssr: false })` from the marketing page. The export
 * name is intentionally stable so the page import never changes.
 */
export function HeroScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  const tier = useDeviceTier();
  const inView = useInView(rootRef);

  if (tier === "static") {
    return (
      <div ref={rootRef} className="h-full w-full">
        <HeroFallback />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="h-full w-full">
      <Canvas
        camera={{ position: [0, 0.3, 9.6], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={tier === "full" ? [1, 2] : [1, 1.5]}
        frameloop={inView ? "always" : "never"}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[6, 4, 5]} intensity={0.7} color="#fff7e8" />
        <directionalLight position={[-5, -3, -4]} intensity={0.3} color="#22d3ee" />
        <SceneContent tier={tier} />
        {tier === "full" && BLOOM_ENABLED ? (
          <EffectComposer>
            <Bloom intensity={0.9} luminanceThreshold={0.3} luminanceSmoothing={0.4} mipmapBlur />
          </EffectComposer>
        ) : null}
      </Canvas>
    </div>
  );
}
