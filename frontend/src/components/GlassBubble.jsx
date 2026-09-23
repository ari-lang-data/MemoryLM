import { useEffect, useState } from "react";
import { getRimTier } from "../lib/glassRim";
import RimCanvas from "./RimCanvas";

export function GlassRimDefs() {
  // Mount ONCE, anywhere near the app root (Chat.jsx's return root is fine
  // since it's always mounted). All SVG-tier bubbles reference this by id.
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <filter id="glass-rim-svg" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" result="blur" />

          {/* Primary catch-light — near corner, bright, theme accent 1 */}
          <feSpecularLighting in="blur" surfaceScale="2.2" specularConstant="1.0" specularExponent="16" result="specMain" style={{ lightingColor: "var(--color-rim-accent-1)" }}>
            <fePointLight x="-40" y="-60" z="90" />
          </feSpecularLighting>
          <feComposite in="specMain" in2="SourceAlpha" operator="in" result="specMainClip" />
          <feComponentTransfer in="specMainClip" result="fresnelMain">
            <feFuncA type="gamma" amplitude="1" exponent="0.35" offset="0" />
          </feComponentTransfer>

          {/* Counter-glow — far corner, dimmer, theme accent 2 */}
          <feSpecularLighting in="blur" surfaceScale="1.6" specularConstant="0.5" specularExponent="20" result="specCounter" style={{ lightingColor: "var(--color-rim-accent-2)" }}>
            <fePointLight x="120" y="140" z="70" />
          </feSpecularLighting>
          <feComposite in="specCounter" in2="SourceAlpha" operator="in" result="specCounterClip" />
          <feComponentTransfer in="specCounterClip" result="fresnelCounter">
            <feFuncA type="gamma" amplitude="0.7" exponent="0.4" offset="0" />
          </feComponentTransfer>

          {/* Inner shadow, tinted with the theme's own background rather than flat grey */}
          <feOffset in="SourceAlpha" dx="0" dy="1" result="offA" />
          <feGaussianBlur in="offA" stdDeviation="1" result="offBlur" />
          <feComposite in="offBlur" in2="SourceAlpha" operator="out" result="innerShadowMask" />
          <feFlood floodOpacity="0.55" style={{ floodColor: "var(--color-rim-accent-3)" }} result="shadowTint" />
          <feComposite in="shadowTint" in2="innerShadowMask" operator="in" result="tintedInnerShadow" />

          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="tintedInnerShadow" />
            <feMergeNode in="fresnelCounter" />
            <feMergeNode in="fresnelMain" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );

}

function useRimTier() {
  const [tier, setTier] = useState(() => getRimTier());
  useEffect(() => {
    function handler() { setTier(getRimTier()); }
    window.addEventListener("memlm:rimModeChanged", handler);
    return () => window.removeEventListener("memlm:rimModeChanged", handler);
  }, []);
  return tier;
}

export default function GlassBubble({ children, style, radius = 20 }) {
  const tier = useRimTier();
  return (
    <div style={{ ...style, position: "relative" }}>
      {children}
      {tier === "svg" ? (
        <div aria-hidden style={{
          position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
          border: "2.5px solid transparent",
          background: "linear-gradient(transparent, transparent) padding-box, linear-gradient(135deg, var(--color-rim-accent-1), var(--color-rim-accent-2)) border-box",
          opacity: 0.55,
          filter: "url(#glass-rim-svg)",
        }} />
      ) : (
        <RimCanvas radius={radius} rimWidth={3} ior={1.52} />
      )}
    </div>
  );
}