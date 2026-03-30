"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
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

const ENCOUNTER_CHANCE = 0.35;
const ADMIN_ENCOUNTER_CHANCE = 1.0;
const CREATURE_SIZE = 64;
const PULL_THRESHOLD = 80; // px of pull before triggering reveal

// --- Leaf config ---

interface LeafConfig {
  emoji: string;
  /** Start position (off-screen edge) as % */
  startX: number;
  /** End position (on-screen) as % */
  endX: number;
  startY: number;
  endY: number;
  rotation: number;
  /** When this leaf starts appearing (0-1 of pull progress) */
  enterAt: number;
  size: number;
}

const LEAVES: LeafConfig[] = [
  { emoji: "\u{1F342}", startX: -5, endX: 15, startY: 10, endY: 55, rotation: 120, enterAt: 0.0, size: 24 },
  { emoji: "\u{1F341}", startX: 105, endX: 80, startY: 5, endY: 40, rotation: -90, enterAt: 0.05, size: 20 },
  { emoji: "\u{1F33F}", startX: -3, endX: 25, startY: 30, endY: 65, rotation: 60, enterAt: 0.1, size: 18 },
  { emoji: "\u{1F342}", startX: 103, endX: 70, startY: 20, endY: 60, rotation: -150, enterAt: 0.15, size: 22 },
  { emoji: "\u{1F341}", startX: -8, endX: 35, startY: 50, endY: 75, rotation: 90, enterAt: 0.2, size: 26 },
  { emoji: "\u{1F33F}", startX: 108, endX: 60, startY: 45, endY: 70, rotation: -45, enterAt: 0.25, size: 16 },
  { emoji: "\u{1F342}", startX: -4, endX: 45, startY: 15, endY: 50, rotation: 180, enterAt: 0.1, size: 20 },
  { emoji: "\u{1F341}", startX: 104, endX: 55, startY: 55, endY: 80, rotation: -120, enterAt: 0.3, size: 24 },
  { emoji: "\u{1F33F}", startX: -10, endX: 20, startY: 65, endY: 85, rotation: 30, enterAt: 0.35, size: 18 },
  { emoji: "\u{1F342}", startX: 110, endX: 85, startY: 25, endY: 45, rotation: -60, enterAt: 0.2, size: 22 },
];

// --- Rustle text ---

interface RustleConfig {
  text: string;
  x: number;
  y: number;
  enterAt: number;
}

const RUSTLES: RustleConfig[] = [
  { text: "*rustle*", x: 18, y: 30, enterAt: 0.3 },
  { text: "*crunch*", x: 70, y: 50, enterAt: 0.5 },
  { text: "*rustle*", x: 40, y: 72, enterAt: 0.7 },
];

// --- Leaf border ---

const BORDER_LEAVES = "\u{1F342} \u{1F33F} \u{1F341} \u223F \u{1F342} \u{1F33F} \u{1F341} \u223F \u{1F342} \u{1F33F} \u{1F341} \u223F \u{1F342} \u{1F33F}";

// --- Helpers ---

/** Clamp and normalize a pull distance to 0-1 progress */
function pullProgress(pullPx: number): number {
  return Math.min(1, Math.max(0, pullPx / PULL_THRESHOLD));
}

/** Check if the page is scrolled to the bottom (or content is shorter than viewport) */
function isAtBottom(): boolean {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  return scrollTop + clientHeight >= scrollHeight - 2;
}

// --- Sub-components ---

function LeafElement({ leaf, progress }: { leaf: LeafConfig; progress: ReturnType<typeof useMotionValue<number>> }) {
  // Each leaf enters the scene based on its enterAt threshold
  const leafProgress = useTransform(progress, [leaf.enterAt, 1], [0, 1]);
  const x = useTransform(leafProgress, [0, 1], [`${leaf.startX}%`, `${leaf.endX}%`]);
  const y = useTransform(leafProgress, [0, 1], [`${leaf.startY}%`, `${leaf.endY}%`]);
  const rotate = useTransform(leafProgress, [0, 1], [0, leaf.rotation]);
  const opacity = useTransform(leafProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0.8]);

  return (
    <motion.div
      style={{ x, y, rotate, opacity, position: "absolute", willChange: "transform" }}
      className="pointer-events-none select-none"
    >
      <span style={{ fontSize: leaf.size }}>{leaf.emoji}</span>
    </motion.div>
  );
}

function RustleText({ rustle, progress }: { rustle: RustleConfig; progress: ReturnType<typeof useMotionValue<number>> }) {
  const opacity = useTransform(
    progress,
    [Math.max(0, rustle.enterAt - 0.1), rustle.enterAt, 1],
    [0, 0.6, 0.6],
  );

  return (
    <motion.div
      style={{
        opacity,
        position: "absolute",
        left: `${rustle.x}%`,
        top: `${rustle.y}%`,
        willChange: "transform",
      }}
      className="pointer-events-none select-none"
    >
      <span className="text-sm italic text-muted-foreground/50">{rustle.text}</span>
    </motion.div>
  );
}

// --- Main components ---

/** Outer gate — decides if encounter happens, then renders inner component */
export function WoodlandReveal() {
  const { userId } = useAuth();

  const encounter = useMemo(() => {
    const isAdmin = userId === ADMIN_UUID;
    if (!isAdmin) return null;
    const chance = isAdmin ? ADMIN_ENCOUNTER_CHANCE : ENCOUNTER_CHANCE;
    if (Math.random() > chance) return null;
    const creature = CREATURES[Math.floor(Math.random() * CREATURES.length)];
    const xPercent = 25 + Math.random() * 50;
    return { creature, xPercent };
  }, [userId]);

  if (!encounter) return null;

  return <WoodlandScene creature={encounter.creature} xPercent={encounter.xPercent} />;
}

/**
 * Pull-to-reveal woodland transition.
 *
 * When the user is at the bottom of the page and pulls upward (like an
 * inverted pull-to-refresh), leaves and twigs drift in from the edges
 * proportional to pull distance. Releasing past the threshold triggers
 * the woodland clearing to slide into view. Releasing below threshold
 * snaps everything back.
 *
 * After reveal, the transition is gone and the clearing sits permanently
 * below the content with a decorative leaf border divider.
 */
function WoodlandScene({
  creature,
  xPercent,
}: {
  creature: (typeof CREATURES)[number];
  xPercent: number;
}) {
  const [revealed, setRevealed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Pull progress: 0 (no pull) → 1 (threshold reached)
  const progress = useMotionValue(0);
  // Background overlay opacity driven by pull
  const bgOpacity = useTransform(progress, [0, 0.5, 1], [0, 0.15, 0.5]);

  // Track touch state
  const touchStartY = useRef<number | null>(null);
  const isPulling = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (revealed) return;
    if (!isAtBottom()) return;
    touchStartY.current = e.touches[0].clientY;
    isPulling.current = false;
  }, [revealed]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (revealed || touchStartY.current === null) return;

    const deltaY = touchStartY.current - e.touches[0].clientY;
    // Only activate on upward pull (positive delta) when at bottom
    if (deltaY <= 0) {
      if (isPulling.current) {
        // User reversed direction — reset
        progress.set(0);
        isPulling.current = false;
      }
      return;
    }

    if (!isAtBottom() && !isPulling.current) return;

    // Once we start pulling, prevent page scroll bounce
    isPulling.current = true;
    e.preventDefault();
    progress.set(pullProgress(deltaY));
  }, [revealed, progress]);

  const handleTouchEnd = useCallback(() => {
    if (revealed || !isPulling.current) {
      touchStartY.current = null;
      isPulling.current = false;
      return;
    }

    const current = progress.get();
    touchStartY.current = null;
    isPulling.current = false;

    if (current >= 0.95) {
      // Past threshold — reveal!
      setRevealed(true);
      animate(progress, 0, { duration: 0.3 });
    } else {
      // Snap back
      animate(progress, 0, { type: "spring", stiffness: 300, damping: 25 });
    }
  }, [revealed, progress]);

  // Attach touch listeners to window (passive: false to allow preventDefault)
  useEffect(() => {
    if (revealed || prefersReducedMotion) return;

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [revealed, prefersReducedMotion, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Reduced motion: skip everything, show clearing directly
  if (prefersReducedMotion) {
    return (
      <div aria-hidden>
        <LeafBorder />
        <WoodlandClearing creature={creature} xPercent={xPercent} />
      </div>
    );
  }

  return (
    <div aria-hidden>
      {/* Fixed overlay for leaves during pull — only while pulling */}
      {!revealed && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {/* Dark green background overlay */}
          <motion.div
            style={{
              opacity: bgOpacity,
              backgroundColor: "hsl(120, 25%, 12%)",
              position: "absolute",
              inset: 0,
            }}
          />
          {LEAVES.map((leaf, i) => (
            <LeafElement key={i} leaf={leaf} progress={progress} />
          ))}
          {RUSTLES.map((rustle, i) => (
            <RustleText key={i} rustle={rustle} progress={progress} />
          ))}
        </div>
      )}

      {/* Revealed: leaf border + woodland clearing slide in */}
      {revealed && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
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
