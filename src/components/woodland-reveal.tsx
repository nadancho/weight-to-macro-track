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

interface LeafConfig {
  emoji: string;
  startX: number; // starting X position (vw units, negative = left off-screen)
  endX: number;   // ending X position (vw units)
  startY: number; // % of transition zone height
  endY: number;
  rotation: number;
  scrollStart: number; // 0-1 when this leaf begins moving
  scrollEnd: number;   // 0-1 when this leaf stops
  size: number;
}

const LEAVES: LeafConfig[] = [
  { emoji: "🍂", startX: -10, endX: 15, startY: 20, endY: 60, rotation: 120, scrollStart: 0.0, scrollEnd: 0.4, size: 24 },
  { emoji: "🍁", startX: 110, endX: 80, startY: 10, endY: 45, rotation: -90, scrollStart: 0.05, scrollEnd: 0.45, size: 20 },
  { emoji: "🌿", startX: -8, endX: 25, startY: 40, endY: 70, rotation: 60, scrollStart: 0.1, scrollEnd: 0.5, size: 18 },
  { emoji: "🍂", startX: 108, endX: 70, startY: 30, endY: 65, rotation: -150, scrollStart: 0.15, scrollEnd: 0.55, size: 22 },
  { emoji: "🍁", startX: -12, endX: 35, startY: 55, endY: 80, rotation: 90, scrollStart: 0.2, scrollEnd: 0.6, size: 26 },
  { emoji: "🌿", startX: 112, endX: 60, startY: 50, endY: 75, rotation: -45, scrollStart: 0.25, scrollEnd: 0.65, size: 16 },
  { emoji: "🍂", startX: -6, endX: 45, startY: 15, endY: 55, rotation: 180, scrollStart: 0.1, scrollEnd: 0.55, size: 20 },
  { emoji: "🍁", startX: 106, endX: 55, startY: 60, endY: 85, rotation: -120, scrollStart: 0.3, scrollEnd: 0.7, size: 24 },
  { emoji: "🌿", startX: -15, endX: 20, startY: 70, endY: 90, rotation: 30, scrollStart: 0.35, scrollEnd: 0.75, size: 18 },
  { emoji: "🍂", startX: 115, endX: 85, startY: 25, endY: 50, rotation: -60, scrollStart: 0.2, scrollEnd: 0.6, size: 22 },
];

// --- Rustle text config ---

interface RustleConfig {
  text: string;
  x: number; // vw
  y: number; // % of transition zone
  fadeIn: number;  // scroll progress
  fadeOut: number;
}

const RUSTLES: RustleConfig[] = [
  { text: "*rustle*", x: 20, y: 35, fadeIn: 0.2, fadeOut: 0.5 },
  { text: "*crunch*", x: 72, y: 55, fadeIn: 0.35, fadeOut: 0.65 },
  { text: "*rustle*", x: 45, y: 75, fadeIn: 0.5, fadeOut: 0.8 },
];

// --- Leaf border ---

const BORDER_LEAVES = "🍂 🌿 🍁 ∿ 🍂 🌿 🍁 ∿ 🍂 🌿 🍁 ∿ 🍂 🌿";

// --- Component ---

function LeafElement({
  leaf,
  scrollYProgress,
}: {
  leaf: LeafConfig;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const x = useTransform(
    scrollYProgress,
    [leaf.scrollStart, leaf.scrollEnd],
    [`${leaf.startX}vw`, `${leaf.endX}vw`],
  );
  const y = useTransform(
    scrollYProgress,
    [leaf.scrollStart, leaf.scrollEnd],
    [`${leaf.startY}%`, `${leaf.endY}%`],
  );
  const rotate = useTransform(
    scrollYProgress,
    [leaf.scrollStart, leaf.scrollEnd],
    [0, leaf.rotation],
  );
  const opacity = useTransform(
    scrollYProgress,
    [
      Math.max(0, leaf.scrollStart - 0.05),
      leaf.scrollStart,
      leaf.scrollEnd,
      Math.min(1, leaf.scrollEnd + 0.05),
    ],
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
    [
      Math.max(0, rustle.fadeIn - 0.05),
      rustle.fadeIn,
      rustle.fadeOut,
      Math.min(1, rustle.fadeOut + 0.05),
    ],
    [0, 0.6, 0.6, 0],
  );

  return (
    <motion.div
      style={{
        opacity,
        position: "absolute",
        left: `${rustle.x}vw`,
        top: `${rustle.y}%`,
        willChange: "transform",
      }}
      className="pointer-events-none select-none"
    >
      <span className="text-sm italic text-muted-foreground/50">{rustle.text}</span>
    </motion.div>
  );
}

export function WoodlandReveal() {
  const { userId } = useAuth();
  const [revealed, setRevealed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const transitionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const { scrollYProgress } = useScroll({
    target: transitionRef,
    offset: ["start end", "end start"],
  });

  // Track when scroll reaches end of transition
  useEffect(() => {
    if (revealed) return;
    const unsubscribe = scrollYProgress.on("change", (v) => {
      if (v >= 0.85) {
        setRevealed(true);
        unsubscribe();
      }
    });
    return unsubscribe;
  }, [scrollYProgress, revealed]);

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

  const { creature, xPercent } = encounter;
  const skipTransition = prefersReducedMotion || revealed;

  return (
    <div aria-hidden>
      {/* Transition zone — collapses after first reveal */}
      {!skipTransition && (
        <div
          ref={transitionRef}
          className="relative overflow-hidden pointer-events-none select-none"
          style={{ height: "100vh" }}
        >
          {LEAVES.map((leaf, i) => (
            <LeafElement key={i} leaf={leaf} scrollYProgress={scrollYProgress} />
          ))}
          {RUSTLES.map((rustle, i) => (
            <RustleText key={i} rustle={rustle} scrollYProgress={scrollYProgress} />
          ))}
        </div>
      )}

      {/* Leaf border — always visible once revealed (or with reduced motion) */}
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
              bottom: 12,
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
