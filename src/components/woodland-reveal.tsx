"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { ADMIN_UUID } from "@/app/lib/constants";

// --- Phase machine ---

type Phase = "idle" | "pawprints" | "leaves" | "fadeout";

// --- Pawprint config ---

const PAWPRINT_COUNT = 10;
const PAWPRINT_STAGGER = 0.2; // seconds between each print
const PAWPRINT_LIFESPAN = 1; // each regular print visible for 1 second
const FINAL_PRINT_LIFESPAN = 5; // last print lingers for 5 seconds
const FINAL_PRINT_SCALE = 1.25; // 25% bigger

interface PawprintPos {
  /** Starting X position (vw) */
  startX: number;
  /** Starting Y from bottom (vh) */
  startBottom: number;
  /** Drift X during lifespan (vw) — positive = rightward */
  driftX: number;
  /** Drift Y upward during lifespan (vh) */
  driftUp: number;
  rotation: number;
  delay: number;
}

/** Generate pawprints that walk sequentially — each step near the last */
function generatePawprints(): { prints: PawprintPos[]; glowColor: string } {
  // Pick one glow color for the whole trail
  const glowColor = PAW_GLOW_COLORS[Math.floor(Math.random() * PAW_GLOW_COLORS.length)];

  const prints: PawprintPos[] = [];
  // Start somewhere in the middle-ish horizontal band
  let x = 30 + Math.random() * 40; // 30-70vw
  let bottom = 14;

  const MAX_SWAY_VW = 8;

  // Random walk with momentum — direction persists for runs, then shifts
  let directionBias = Math.random() > 0.5 ? 1 : -1;
  // How strongly it leans (0.5 = slight, 1 = full commit to direction)
  let lean = 0.5 + Math.random() * 0.5;

  for (let i = 0; i < PAWPRINT_COUNT; i++) {
    // 25% chance to flip direction, 15% chance to just reduce lean
    const roll = Math.random();
    if (roll < 0.25) {
      directionBias *= -1;
      lean = 0.5 + Math.random() * 0.5;
    } else if (roll < 0.4) {
      lean = 0.3 + Math.random() * 0.7;
    }
    // Bounce off edges with some urgency
    if (x < 15) { directionBias = 1; lean = 0.7; }
    if (x > 85) { directionBias = -1; lean = 0.7; }

    const sway = directionBias * lean * (MAX_SWAY_VW * 0.3 + Math.random() * MAX_SWAY_VW * 0.7);
    x = Math.max(10, Math.min(85, x + sway)); // clamp to screen
    // Step upward with slight jitter
    bottom += 5 + Math.random() * 2;
    // Small drift during each print's lifespan
    const driftX = (Math.random() - 0.5) * 4;
    const driftUp = 1 + Math.random() * 2;

    prints.push({
      startX: x,
      startBottom: bottom,
      driftX,
      driftUp,
      rotation: (i % 2 === 0 ? -1 : 1) * (10 + Math.random() * 10),
      delay: i * PAWPRINT_STAGGER,
    });
  }

  return { prints, glowColor };
}

// Total time from first pawprint to fadeout trigger
// All regular prints + final print's delay + its linger duration
const PAWPRINT_TIMEOUT = ((PAWPRINT_COUNT - 1) * PAWPRINT_STAGGER + FINAL_PRINT_LIFESPAN + 0.5) * 1000;

// One glow color is chosen per trail
const PAW_GLOW_COLORS = [
  "rgba(139, 119, 74, 0.6)",  // warm brown
  "rgba(107, 142, 73, 0.5)",  // moss green
  "rgba(160, 132, 82, 0.55)", // golden oak
  "rgba(122, 150, 89, 0.5)",  // sage
  "rgba(148, 116, 68, 0.6)",  // bark brown
];

// --- Rustle text ---

interface RustleConfig {
  text: string;
  x: number;
  y: number;
  delay: number;
}

const RUSTLES: RustleConfig[] = [
  { text: "*rustle*", x: 18, y: 30, delay: 0.2 },
  { text: "*crunch*", x: 70, y: 50, delay: 0.4 },
  { text: "*rustle*", x: 40, y: 72, delay: 0.6 },
];

const LEAF_ANIM_DURATION = 1.2; // seconds — rustle overlay duration

// --- Sub-components ---

function PawprintTrail({
  phase,
  onTap,
}: {
  phase: Phase;
  onTap: () => void;
}) {
  const isFading = phase === "fadeout" || phase === "leaves";

  // Generate positions + glow color once per trail appearance
  const { prints: pawprints, glowColor } = useMemo(() => generatePawprints(), []);

  const fadeInDuration = 0.15;
  const fadeOutDuration = 0.25;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 41,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {pawprints.map((paw, i) => {
        const isLast = i === PAWPRINT_COUNT - 1;
        const lifespan = isLast ? FINAL_PRINT_LIFESPAN : PAWPRINT_LIFESPAN;
        const lingerDuration = lifespan - fadeInDuration - fadeOutDuration;
        const totalDuration = fadeInDuration + lingerDuration + fadeOutDuration;
        const baseScale = isLast ? FINAL_PRINT_SCALE : 1;

        return (
          <motion.button
            key={i}
            initial={{
              opacity: 0,
              scale: 0.3,
              x: 0,
              y: 0,
            }}
            animate={
              isFading
                ? { opacity: 0, scale: 0.5, transition: { duration: 0.3 } }
                : {
                    opacity: isLast ? [0, 1, 1, 0.8] : [0, 1, 1, 0],
                    scale: [0.3 * baseScale, 1.1 * baseScale, baseScale, 0.8 * baseScale],
                    x: [0, `${paw.driftX * 0.5}vw`, `${paw.driftX}vw`],
                    y: [0, `${-paw.driftUp * 0.5}vh`, `${-paw.driftUp}vh`],
                  }
            }
            transition={
              isFading
                ? undefined
                : {
                    duration: totalDuration,
                    delay: paw.delay,
                    times: [
                      0,
                      fadeInDuration / totalDuration,
                      (fadeInDuration + lingerDuration) / totalDuration,
                      1,
                    ],
                    ease: "easeOut",
                  }
            }
            onClick={isLast && phase === "pawprints" ? onTap : undefined}
            style={{
              position: "absolute",
              left: `${paw.startX}vw`,
              bottom: `${paw.startBottom}vh`,
              rotate: paw.rotation,
              pointerEvents: isLast && phase === "pawprints" ? "auto" : "none",
              filter: `drop-shadow(0 0 ${isLast ? "10px" : "6px"} ${glowColor})`,
            }}
            className={`flex items-center justify-center ${isLast ? "h-16 w-16" : "h-12 w-12"}`}
            aria-label={isLast ? "Discover what's hiding" : undefined}
          >
            <span
              className={`select-none ${isLast ? "text-3xl" : "text-2xl"}`}
              style={{
                textShadow: `0 0 8px ${glowColor}, 0 0 ${isLast ? "24px" : "16px"} ${glowColor}`,
              }}
            >
              🐾
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

function RustleText({ rustle }: { rustle: RustleConfig }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.7, 0.7, 0] }}
      transition={{
        duration: 0.8,
        delay: rustle.delay,
        times: [0, 0.2, 0.7, 1],
      }}
      style={{
        position: "absolute",
        left: `${rustle.x}%`,
        top: `${rustle.y}%`,
      }}
      className="pointer-events-none select-none"
    >
      <span className="text-base italic text-muted-foreground/60">{rustle.text}</span>
    </motion.div>
  );
}


// --- Main components ---

/** Outer gate — admin-only feature flag for now */
export function WoodlandReveal() {
  const { userId } = useAuth();
  const isAdmin = userId === ADMIN_UUID;

  if (!isAdmin) return null;

  return <WoodlandScene />;
}

/**
 * Pawprint trail with rustle effects.
 *
 * Listens for "woodland:save" custom event (fired by save handler).
 * On save: pawprints walk up the screen. Tapping one triggers
 * rustle/shrub animation. Ignoring them causes a fadeout back to idle.
 */
function WoodlandScene() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const fadeoutTimer = useRef<ReturnType<typeof setTimeout>>();
  const leafTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Clean up timers
  const clearTimers = useCallback(() => {
    if (fadeoutTimer.current) clearTimeout(fadeoutTimer.current);
    if (leafTimer.current) clearTimeout(leafTimer.current);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Listen for save events
  useEffect(() => {
    function onSave() {
      setPhase((current) => {
        // Only trigger from idle — don't interrupt an in-progress sequence
        if (current !== "idle") return current;
        return "pawprints";
      });
    }

    window.addEventListener("woodland:save", onSave);
    return () => window.removeEventListener("woodland:save", onSave);
  }, [prefersReducedMotion]);

  // Pawprint timeout → fadeout if not tapped
  useEffect(() => {
    if (phase !== "pawprints") return;
    clearTimers();
    fadeoutTimer.current = setTimeout(() => setPhase("fadeout"), PAWPRINT_TIMEOUT);
    return clearTimers;
  }, [phase, clearTimers]);

  // Fadeout → idle
  useEffect(() => {
    if (phase !== "fadeout") return;
    const t = setTimeout(() => setPhase("idle"), 600);
    return () => clearTimeout(t);
  }, [phase]);

  // Leaves → idle (rustle plays, then resets)
  useEffect(() => {
    if (phase !== "leaves") return;
    clearTimers();
    leafTimer.current = setTimeout(
      () => setPhase("idle"),
      (LEAF_ANIM_DURATION + 0.3) * 1000,
    );
    return clearTimers;
  }, [phase, clearTimers]);

  const handlePawTap = useCallback(() => {
    clearTimers();
    setPhase("leaves");
  }, [clearTimers]);

  // Nothing visible in idle
  if (phase === "idle") return null;

  return (
    <div aria-hidden>
      {/* Pawprints — visible during pawprints, fading during leaves/fadeout */}
      <AnimatePresence>
        {(phase === "pawprints" || phase === "leaves" || phase === "fadeout") && (
          <PawprintTrail phase={phase} onTap={handlePawTap} />
        )}
      </AnimatePresence>

      {/* Leaf/shrub overlay — during leaves phase */}
      <AnimatePresence>
        {phase === "leaves" && (
          <motion.div
            key="leaf-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 40,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            {/* Dark green overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ duration: LEAF_ANIM_DURATION, ease: "easeIn" }}
              style={{
                backgroundColor: "hsl(120, 25%, 12%)",
                position: "absolute",
                inset: 0,
              }}
            />
            {/* Rustle text */}
            {RUSTLES.map((rustle, i) => (
              <RustleText key={i} rustle={rustle} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
