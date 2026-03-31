"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { ADMIN_UUID } from "@/app/lib/constants";
import { NAV_HEIGHT } from "@/components/bottom-nav";

// --- Creature data ---

const CREATURES = [
  { id: "raccoon", src: "/sprites/raccoon-sp1-f.png" },
  { id: "ermine", src: "/sprites/ermine-sp1.png" },
  { id: "fruit-bat", src: "/sprites/fruit-bat-sp1.png" },
  { id: "fox", src: "/sprites/fox-sp1.png" },
  { id: "fennec", src: "/sprites/fennec-sp1.png" },
  { id: "cat", src: "/sprites/cat-sp1.png" },
  { id: "possum", src: "/sprites/possum-sp1.png" },
  { id: "skunk", src: "/sprites/skunk-sp1.png" },
  { id: "hedgehog", src: "/sprites/hedgehog-sp1.png" },
];

const CREATURE_SIZE = 64;

// --- Phase machine ---

type Phase = "idle" | "pawprints" | "leaves" | "revealed" | "fadeout";

// --- Pawprint config ---

const PAWPRINT_COUNT = 10;
const PAWPRINT_STAGGER = 0.2; // seconds between each print
const PAWPRINT_LIFESPAN = 1; // each print visible for 1 second
const PAWPRINT_LINGER = 2; // seconds to wait after last print before fadeout

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
const PAWPRINT_TIMEOUT = (PAWPRINT_COUNT * PAWPRINT_STAGGER + PAWPRINT_LINGER) * 1000;

// One glow color is chosen per trail
const PAW_GLOW_COLORS = [
  "rgba(139, 119, 74, 0.6)",  // warm brown
  "rgba(107, 142, 73, 0.5)",  // moss green
  "rgba(160, 132, 82, 0.55)", // golden oak
  "rgba(122, 150, 89, 0.5)",  // sage
  "rgba(148, 116, 68, 0.6)",  // bark brown
];

// --- Shrub config ---
// shrub.png is a 4×4 sprite sheet. Each bush is 25% of the sheet.

interface ShrubConfig {
  /** Column (0-3) in sprite sheet */
  col: number;
  /** Row (0-3) in sprite sheet */
  row: number;
  /** Horizontal position as vw */
  x: number;
  /** Final resting Y from bottom as vh */
  targetBottom: number;
  /** Flip horizontally */
  flip: boolean;
  /** Stagger delay */
  delay: number;
  /** Display size in px */
  size: number;
}

const SHRUBS: ShrubConfig[] = [
  { col: 0, row: 0, x: 5, targetBottom: 8, flip: false, delay: 0, size: 100 },
  { col: 1, row: 1, x: 25, targetBottom: 6, flip: true, delay: 0.1, size: 90 },
  { col: 2, row: 0, x: 50, targetBottom: 10, flip: false, delay: 0.05, size: 110 },
  { col: 3, row: 2, x: 72, targetBottom: 7, flip: true, delay: 0.15, size: 95 },
  { col: 0, row: 3, x: 90, targetBottom: 9, flip: false, delay: 0.08, size: 100 },
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

// --- Leaf border ---

const BORDER_LEAVES = "\u{1F342} \u{1F33F} \u{1F341} \u223F \u{1F342} \u{1F33F} \u{1F341} \u223F \u{1F342} \u{1F33F} \u{1F341} \u223F \u{1F342} \u{1F33F}";

const LEAF_ANIM_DURATION = 1.2; // seconds

// --- Sub-components ---

function PawprintTrail({
  phase,
  onTap,
}: {
  phase: Phase;
  onTap: () => void;
}) {
  const isTappable = phase === "pawprints";
  const isFading = phase === "fadeout" || phase === "leaves";

  // Generate positions + glow color once per trail appearance
  const { prints: pawprints, glowColor } = useMemo(() => generatePawprints(), []);

  const fadeInDuration = 0.15;
  const fadeOutDuration = 0.25;
  const lingerDuration = PAWPRINT_LIFESPAN - fadeInDuration - fadeOutDuration;
  const totalDuration = fadeInDuration + lingerDuration + fadeOutDuration;

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
      {pawprints.map((paw, i) => (
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
                    opacity: [0, 1, 1, 0],
                    scale: [0.3, 1.1, 1, 0.8],
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
            onClick={isTappable ? onTap : undefined}
            style={{
              position: "absolute",
              left: `${paw.startX}vw`,
              bottom: `${paw.startBottom}vh`,
              rotate: paw.rotation,
              pointerEvents: isTappable ? "auto" : "none",
              filter: `drop-shadow(0 0 6px ${glowColor})`,
            }}
            className="flex h-12 w-12 items-center justify-center"
            aria-label="Discover what's hiding"
          >
            <span
              className="text-2xl select-none"
              style={{
                textShadow: `0 0 8px ${glowColor}, 0 0 16px ${glowColor}`,
              }}
            >
              🐾
            </span>
          </motion.button>
        ))}
    </div>
  );
}

function ShrubLeaf({ shrub }: { shrub: ShrubConfig }) {
  // Each bush is 25% of the sprite sheet
  const bgX = shrub.col * (100 / 3); // percentage for background-position
  const bgY = shrub.row * (100 / 3);

  return (
    <motion.div
      initial={{ y: "100vh", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 120,
        damping: 20,
        delay: shrub.delay,
      }}
      style={{
        position: "absolute",
        left: `${shrub.x}vw`,
        bottom: `${shrub.targetBottom}vh`,
        width: shrub.size,
        height: shrub.size,
        backgroundImage: "url(/sprites/shrub.png)",
        backgroundSize: "400% 400%",
        backgroundPosition: `${bgX}% ${bgY}%`,
        imageRendering: "pixelated" as const,
        transform: shrub.flip ? "scaleX(-1)" : undefined,
        willChange: "transform",
      }}
      className="pointer-events-none"
    />
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

function LeafBorder() {
  return (
    <div
      className="flex items-center justify-center py-2 text-muted-foreground/30 select-none overflow-hidden"
      style={{ fontSize: 14, letterSpacing: "0.15em" }}
    >
      {BORDER_LEAVES}
    </div>
  );
}

function WoodlandClearing({
  creature,
  xPercent,
}: {
  creature: (typeof CREATURES)[number];
  xPercent: number;
}) {
  return (
    <div className="pointer-events-none select-none relative">
      <img
        src="/woodland-bg.jpg"
        alt=""
        className="w-full block"
        style={{ imageRendering: "pixelated" }}
      />
      <img
        src={creature.src}
        alt=""
        style={{
          position: "absolute",
          bottom: `calc(12px + ${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
          left: `${xPercent}%`,
          transform: "translateX(-50%)",
          width: CREATURE_SIZE,
          height: CREATURE_SIZE,
          objectFit: "contain",
          imageRendering: "pixelated",
        }}
      />
      <div
        className="sm:hidden"
        style={{
          height: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
          backgroundColor: "#4a5a2c",
        }}
      />
    </div>
  );
}

// --- Main components ---

/** Outer gate — admin-only feature flag for now */
export function WoodlandReveal() {
  const { userId } = useAuth();
  const isAdmin = userId === ADMIN_UUID;

  const encounter = useMemo(() => {
    if (!isAdmin) return null;
    const creature = CREATURES[Math.floor(Math.random() * CREATURES.length)];
    const xPercent = 25 + Math.random() * 50;
    return { creature, xPercent };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (!encounter) return null;

  return <WoodlandScene creature={encounter.creature} xPercent={encounter.xPercent} />;
}

/**
 * Pawprint trail → tap to reveal woodland clearing.
 *
 * Listens for "woodland:save" custom event (fired by save handler).
 * On save: pawprints walk up the screen. Tapping one triggers the
 * leaf/shrub animation and reveals the clearing. Ignoring them
 * causes a fadeout back to idle.
 */
function WoodlandScene({
  creature,
  xPercent,
}: {
  creature: (typeof CREATURES)[number];
  xPercent: number;
}) {
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
        return prefersReducedMotion ? "revealed" : "pawprints";
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

  // Leaves → revealed
  useEffect(() => {
    if (phase !== "leaves") return;
    clearTimers();
    leafTimer.current = setTimeout(
      () => setPhase("revealed"),
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
            {/* Shrubs rising from bottom */}
            {SHRUBS.map((shrub, i) => (
              <ShrubLeaf key={i} shrub={shrub} />
            ))}
            {/* Rustle text */}
            {RUSTLES.map((rustle, i) => (
              <RustleText key={i} rustle={rustle} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Woodland clearing — persists after reveal */}
      {phase === "revealed" && (
        <motion.div
          initial={prefersReducedMotion ? false : { y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          <LeafBorder />
          <WoodlandClearing creature={creature} xPercent={xPercent} />
        </motion.div>
      )}
    </div>
  );
}
