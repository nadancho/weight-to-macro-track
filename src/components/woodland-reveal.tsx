"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { ADMIN_UUID } from "@/app/lib/constants";

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
// Positions use % of the fixed viewport overlay.

interface LeafConfig {
  emoji: string;
  startX: string;
  endX: string;
  startY: string;
  endY: string;
  rotation: number;
  scrollStart: number;
  scrollEnd: number;
  size: number;
}

const LEAVES: LeafConfig[] = [
  { emoji: "🍂", startX: "-5%", endX: "15%", startY: "10%", endY: "55%", rotation: 120, scrollStart: 0.0, scrollEnd: 0.4, size: 24 },
  { emoji: "🍁", startX: "105%", endX: "80%", startY: "5%", endY: "40%", rotation: -90, scrollStart: 0.05, scrollEnd: 0.45, size: 20 },
  { emoji: "🌿", startX: "-3%", endX: "25%", startY: "30%", endY: "65%", rotation: 60, scrollStart: 0.1, scrollEnd: 0.5, size: 18 },
  { emoji: "🍂", startX: "103%", endX: "70%", startY: "20%", endY: "60%", rotation: -150, scrollStart: 0.15, scrollEnd: 0.55, size: 22 },
  { emoji: "🍁", startX: "-8%", endX: "35%", startY: "50%", endY: "75%", rotation: 90, scrollStart: 0.2, scrollEnd: 0.6, size: 26 },
  { emoji: "🌿", startX: "108%", endX: "60%", startY: "45%", endY: "70%", rotation: -45, scrollStart: 0.25, scrollEnd: 0.65, size: 16 },
  { emoji: "🍂", startX: "-4%", endX: "45%", startY: "15%", endY: "50%", rotation: 180, scrollStart: 0.1, scrollEnd: 0.55, size: 20 },
  { emoji: "🍁", startX: "104%", endX: "55%", startY: "55%", endY: "80%", rotation: -120, scrollStart: 0.3, scrollEnd: 0.7, size: 24 },
  { emoji: "🌿", startX: "-10%", endX: "20%", startY: "65%", endY: "85%", rotation: 30, scrollStart: 0.35, scrollEnd: 0.75, size: 18 },
  { emoji: "🍂", startX: "110%", endX: "85%", startY: "25%", endY: "45%", rotation: -60, scrollStart: 0.2, scrollEnd: 0.6, size: 22 },
];

// --- Rustle text ---

interface RustleConfig {
  text: string;
  x: string;
  y: string;
  fadeIn: number;
  fadeOut: number;
}

const RUSTLES: RustleConfig[] = [
  { text: "*rustle*", x: "18%", y: "30%", fadeIn: 0.2, fadeOut: 0.5 },
  { text: "*crunch*", x: "70%", y: "50%", fadeIn: 0.35, fadeOut: 0.65 },
  { text: "*rustle*", x: "40%", y: "72%", fadeIn: 0.5, fadeOut: 0.8 },
];

// --- Leaf border ---

const BORDER_LEAVES = "🍂 🌿 🍁 ∿ 🍂 🌿 🍁 ∿ 🍂 🌿 🍁 ∿ 🍂 🌿";

// --- Sub-components ---

function LeafElement({
  leaf,
  scrollYProgress,
}: {
  leaf: LeafConfig;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const x = useTransform(scrollYProgress, [leaf.scrollStart, leaf.scrollEnd], [leaf.startX, leaf.endX]);
  const y = useTransform(scrollYProgress, [leaf.scrollStart, leaf.scrollEnd], [leaf.startY, leaf.endY]);
  const rotate = useTransform(scrollYProgress, [leaf.scrollStart, leaf.scrollEnd], [0, leaf.rotation]);
  const opacity = useTransform(
    scrollYProgress,
    [Math.max(0, leaf.scrollStart - 0.05), leaf.scrollStart, leaf.scrollEnd, Math.min(1, leaf.scrollEnd + 0.05)],
    [0, 1, 1, 0],
  );

  return (
    <motion.div
      style={{ x, y, rotate, opacity, position: "absolute", willChange: "transform" }}
      className="pointer-events-none select-none"
    >
      <span style={{ fontSize: leaf.size }}>{leaf.emoji}</span>
    </motion.div>
  );
}

function RustleText({
  rustle,
  scrollYProgress,
}: {
  rustle: RustleConfig;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const opacity = useTransform(
    scrollYProgress,
    [Math.max(0, rustle.fadeIn - 0.05), rustle.fadeIn, rustle.fadeOut, Math.min(1, rustle.fadeOut + 0.05)],
    [0, 0.6, 0.6, 0],
  );

  return (
    <motion.div
      style={{ opacity, position: "absolute", left: rustle.x, top: rustle.y, willChange: "transform" }}
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
 * Apple-style scroll-driven parallax:
 *
 * 1. A scroll RUNWAY div (100vh) sits in document flow after <main>.
 *    It provides extra scroll distance beyond the content.
 *
 * 2. A FIXED OVERLAY (position: fixed, inset: 0) covers the viewport.
 *    Leaves and rustle text live inside it. pointer-events: none so
 *    the user can still interact with the content underneath.
 *
 * 3. useScroll tracks the runway with offset ["start end", "end end"]:
 *    - progress=0 when the runway's TOP reaches the viewport BOTTOM
 *      (user just scrolled past all content)
 *    - progress=1 when the runway's BOTTOM reaches the viewport BOTTOM
 *      (user scrolled through the full runway)
 *
 * This means the leaf animation ONLY plays while the invisible runway
 * is being scrolled through. Content above scrolls normally with zero
 * animation interference.
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
  const scrollRunwayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const { scrollYProgress } = useScroll({
    target: scrollRunwayRef,
    offset: ["start end", "end end"],
  });

  // Background color shifts from transparent to forest green
  const bgColor = useTransform(
    scrollYProgress,
    [0, 0.3, 0.8, 1],
    [
      "hsla(120, 20%, 10%, 0)",
      "hsla(120, 20%, 10%, 0.3)",
      "hsla(120, 25%, 12%, 0.7)",
      "hsla(120, 25%, 12%, 0.9)",
    ],
  );

  // Collapse transition after reveal
  useEffect(() => {
    if (revealed) return;
    const unsubscribe = scrollYProgress.on("change", (v) => {
      if (v >= 0.95) {
        setRevealed(true);
        unsubscribe();
      }
    });
    return unsubscribe;
  }, [scrollYProgress, revealed]);

  const skipTransition = prefersReducedMotion || revealed;

  return (
    <div aria-hidden>
      {/*
        SCROLL RUNWAY — invisible div providing scroll distance.
        Sits in document flow after <main>. Collapses to 0 after reveal.
      */}
      <div
        ref={scrollRunwayRef}
        style={{ height: skipTransition ? 0 : "100vh" }}
      />

      {/*
        FIXED OVERLAY — covers the entire viewport.
        Leaves animate inside this fixed frame driven by scroll progress.
        pointer-events: none so user can still interact with content below.
      */}
      {!skipTransition && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <motion.div
            style={{
              backgroundColor: bgColor,
              position: "absolute",
              inset: 0,
              willChange: "transform",
            }}
          />
          {LEAVES.map((leaf, i) => (
            <LeafElement key={i} leaf={leaf} scrollYProgress={scrollYProgress} />
          ))}
          {RUSTLES.map((rustle, i) => (
            <RustleText key={i} rustle={rustle} scrollYProgress={scrollYProgress} />
          ))}
        </div>
      )}

      {/* Leaf border — permanent divider once revealed */}
      {(revealed || prefersReducedMotion) && (
        <div
          className="flex items-center justify-center py-2 text-muted-foreground/30 select-none overflow-hidden"
          style={{ fontSize: 14, letterSpacing: "0.15em" }}
        >
          {BORDER_LEAVES}
        </div>
      )}

      {/* Woodland clearing — visible once revealed */}
      {(revealed || prefersReducedMotion) && (
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
              bottom: "calc(12px + 56px + env(safe-area-inset-bottom, 0px))",
              left: `${xPercent}%`,
              transform: "translateX(-50%)",
              width: CREATURE_SIZE,
              height: CREATURE_SIZE,
              objectFit: "contain",
              imageRendering: "pixelated",
            }}
          />
          {/* Spacer for fixed bottom nav */}
          <div
            className="sm:hidden"
            style={{
              height: "calc(56px + env(safe-area-inset-bottom, 0px))",
              backgroundColor: "#4a5a2c",
            }}
          />
        </div>
      )}
    </div>
  );
}
