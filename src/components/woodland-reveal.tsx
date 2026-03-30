"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { useLogCache } from "@/components/log-cache-provider";
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

const ENCOUNTER_CHANCE = 0.35;
const ADMIN_ENCOUNTER_CHANCE = 1.0;
const CREATURE_SIZE = 64;

// --- Leaf config ---

interface LeafConfig {
  emoji: string;
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  rotation: number;
  /** Stagger delay in seconds */
  delay: number;
  size: number;
}

const LEAVES: LeafConfig[] = [
  { emoji: "\u{1F342}", startX: -5, endX: 15, startY: 10, endY: 55, rotation: 120, delay: 0, size: 28 },
  { emoji: "\u{1F341}", startX: 105, endX: 80, startY: 5, endY: 40, rotation: -90, delay: 0.05, size: 24 },
  { emoji: "\u{1F33F}", startX: -3, endX: 25, startY: 30, endY: 65, rotation: 60, delay: 0.1, size: 22 },
  { emoji: "\u{1F342}", startX: 103, endX: 70, startY: 20, endY: 60, rotation: -150, delay: 0.12, size: 26 },
  { emoji: "\u{1F341}", startX: -8, endX: 35, startY: 50, endY: 75, rotation: 90, delay: 0.18, size: 30 },
  { emoji: "\u{1F33F}", startX: 108, endX: 60, startY: 45, endY: 70, rotation: -45, delay: 0.2, size: 20 },
  { emoji: "\u{1F342}", startX: -4, endX: 45, startY: 15, endY: 50, rotation: 180, delay: 0.08, size: 24 },
  { emoji: "\u{1F341}", startX: 104, endX: 55, startY: 55, endY: 80, rotation: -120, delay: 0.25, size: 28 },
  { emoji: "\u{1F33F}", startX: -10, endX: 20, startY: 65, endY: 85, rotation: 30, delay: 0.3, size: 22 },
  { emoji: "\u{1F342}", startX: 110, endX: 85, startY: 25, endY: 45, rotation: -60, delay: 0.15, size: 26 },
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

// Total duration of the leaf animation before clearing appears
const LEAF_ANIM_DURATION = 1.2; // seconds

// --- Helpers ---

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// --- Sub-components ---

function LeafElement({ leaf }: { leaf: LeafConfig }) {
  return (
    <motion.div
      initial={{
        x: `${leaf.startX}%`,
        y: `${leaf.startY}%`,
        rotate: 0,
        opacity: 0,
      }}
      animate={{
        x: `${leaf.endX}%`,
        y: `${leaf.endY}%`,
        rotate: leaf.rotation,
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: LEAF_ANIM_DURATION,
        delay: leaf.delay,
        ease: "easeInOut",
        opacity: { times: [0, 0.1, 0.7, 1] },
      }}
      style={{ position: "absolute", willChange: "transform" }}
      className="pointer-events-none select-none"
    >
      <span style={{ fontSize: leaf.size }}>{leaf.emoji}</span>
    </motion.div>
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

function PawButton({ onTap }: { onTap: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      whileTap={{ scale: 0.9 }}
      onClick={onTap}
      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/60 shadow-md active:bg-accent/80"
      style={{
        // Enough margin to sit above the fixed bottom nav
        marginTop: 24,
        marginBottom: `calc(24px + ${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
      }}
      aria-label="Reveal woodland creature"
    >
      <span className="text-3xl" role="img" aria-hidden>
        🐾
      </span>
    </motion.button>
  );
}

// --- Main components ---

/** Outer gate — decides if encounter happens, then renders inner component */
export function WoodlandReveal() {
  const { userId } = useAuth();
  const { getLog, initialized } = useLogCache();

  const isAdmin = userId === ADMIN_UUID;
  const hasLoggedToday = initialized && !!getLog(todayStr());

  // DEBUG: log gate state to help diagnose visibility issues
  useEffect(() => {
    console.log("[WoodlandReveal]", { userId, isAdmin, initialized, hasLoggedToday, today: todayStr() });
  }, [userId, isAdmin, initialized, hasLoggedToday]);

  const encounter = useMemo(() => {
    if (!isAdmin) return null;
    const chance = isAdmin ? ADMIN_ENCOUNTER_CHANCE : ENCOUNTER_CHANCE;
    if (Math.random() > chance) return null;
    const creature = CREATURES[Math.floor(Math.random() * CREATURES.length)];
    const xPercent = 25 + Math.random() * 50;
    return { creature, xPercent };
  }, [isAdmin]);

  if (!encounter || !hasLoggedToday) return null;

  return <WoodlandScene creature={encounter.creature} xPercent={encounter.xPercent} />;
}

/**
 * Tap-to-reveal woodland transition.
 *
 * A paw print button appears below the content when the user has logged
 * for today. Tapping it triggers a timed leaf animation (leaves drift in
 * from edges, rustle text appears), then the woodland clearing slides
 * into view with a random creature.
 *
 * After reveal, the paw disappears and the clearing persists with a
 * decorative leaf border divider.
 */
function WoodlandScene({
  creature,
  xPercent,
}: {
  creature: (typeof CREATURES)[number];
  xPercent: number;
}) {
  const [phase, setPhase] = useState<"idle" | "animating" | "revealed">("idle");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function handleTap() {
    if (prefersReducedMotion) {
      setPhase("revealed");
      return;
    }
    setPhase("animating");
    // After leaves finish, show the clearing
    setTimeout(() => setPhase("revealed"), (LEAF_ANIM_DURATION + 0.3) * 1000);
  }

  return (
    <div aria-hidden>
      {/* Paw button — visible only in idle state */}
      <AnimatePresence>
        {phase === "idle" && <PawButton onTap={handleTap} />}
      </AnimatePresence>

      {/* Leaf animation overlay — during animating phase */}
      <AnimatePresence>
        {phase === "animating" && (
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
            {/* Dark green background that fades in */}
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
            {LEAVES.map((leaf, i) => (
              <LeafElement key={i} leaf={leaf} />
            ))}
            {RUSTLES.map((rustle, i) => (
              <RustleText key={i} rustle={rustle} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revealed: leaf border + woodland clearing slide in */}
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
      {/* Spacer matching bottom nav height */}
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
