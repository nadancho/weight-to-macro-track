"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SpriteAnimator } from "@/components/sprite-animator";

// --- Phase machine ---

type Phase = "idle" | "pawprints" | "leaves" | "reveal" | "fadeout";

const REVEAL_DURATION = 6000; // ms — how long the creature overlay shows

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

const LEAF_ANIM_DURATION = 2.2; // seconds — rustle + leaf burst overlay duration

// --- Leaf burst config ---

const LEAVES_PER_BURST = 5;
const LEAF_EMOJIS = ["🍃", "🍂", "🌿", "🍁", "🌾", "🪶", "🌰"];
const LEAF_GRAVITY = 800; // px/s²
const LEAF_VY_MIN = -700; // px/s (upward)
const LEAF_VY_MAX = -400;
const LEAF_VX_RANGE = 150; // px/s (±)
const LEAF_SPIN_RANGE = 360; // deg/s (±)

interface LeafParticle {
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  size: number;
  opacity: number;
  /** Seconds after mount before this particle activates */
  delay: number;
  active: boolean;
}

/** Generate 3 bursts of 5, each at a rustle text position + delay */
function generateLeaves(): LeafParticle[] {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const particles: LeafParticle[] = [];

  for (const rustle of RUSTLES) {
    const cx = (rustle.x / 100) * w;
    const cy = (rustle.y / 100) * h;
    for (let j = 0; j < LEAVES_PER_BURST; j++) {
      particles.push({
        emoji: LEAF_EMOJIS[Math.floor(Math.random() * LEAF_EMOJIS.length)],
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 2 * LEAF_VX_RANGE,
        vy: LEAF_VY_MIN + Math.random() * (LEAF_VY_MAX - LEAF_VY_MIN),
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 2 * LEAF_SPIN_RANGE,
        size: 1.2 + Math.random() * 0.8,
        opacity: 0,
        delay: rustle.delay,
        active: false,
      });
    }
  }
  return particles;
}

function LeafBurst() {
  const rafRef = useRef<number>(0);
  const spansRef = useRef<(HTMLSpanElement | null)[]>([]);
  const particlesRef = useRef<LeafParticle[]>(generateLeaves());

  useEffect(() => {
    const particles = particlesRef.current;
    let prev = 0;
    let start = 0;

    function tick(timestamp: number) {
      if (!prev) { prev = timestamp; start = timestamp; }
      const dt = Math.min((timestamp - prev) / 1000, 0.05);
      const elapsed = (timestamp - start) / 1000;
      prev = timestamp;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // Activate when delay has passed
        if (!p.active) {
          if (elapsed >= p.delay) p.active = true;
          else continue;
        }
        const localT = elapsed - p.delay;
        p.vy += LEAF_GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.spin * dt;
        // Fade in quickly, then fade out after 1s of flight
        const fadeOutStart = 1.0;
        const fadeOutLen = 0.4;
        if (localT < 0.1) {
          p.opacity = localT / 0.1;
        } else if (localT > fadeOutStart) {
          p.opacity = Math.max(0, 1 - (localT - fadeOutStart) / fadeOutLen);
        } else {
          p.opacity = 1;
        }

        const span = spansRef.current[i];
        if (span) {
          span.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rotation}deg)`;
          span.style.opacity = String(p.opacity);
        }
      }

      if (elapsed < LEAF_ANIM_DURATION) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {particlesRef.current.map((p, i) => (
        <span
          key={i}
          ref={(el) => { spansRef.current[i] = el; }}
          className="pointer-events-none select-none"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            fontSize: `${p.size}rem`,
            opacity: 0,
            willChange: "transform, opacity",
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

// --- Reveal animation type (matches SpriteAnimationRow from service) ---

interface RevealAnimation {
  id: string;
  name: string;
  creature_id: string | null;
  sprite_path: string;
  grid_cols: number;
  grid_rows: number;
  frame_sequence: number[];
  frame_size: number;
  fps: number;
  loop: boolean;
  display_width: number | null;
  display_height: number | null;
  frame_offsets: Array<{ x: number; y: number }>;
  frame_mirrors: boolean[];
}

// --- Creature reveal overlay ---

function CreatureReveal({
  animation,
  firstEncounter,
  onComplete,
}: {
  animation: RevealAnimation;
  firstEncounter: boolean;
  onComplete: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onComplete, REVEAL_DURATION);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <motion.div
      key="creature-reveal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onComplete}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 42,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        cursor: "pointer",
      }}
    >
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.15 }}
      >
        <SpriteAnimator
          src={animation.sprite_path}
          grid={[animation.grid_cols, animation.grid_rows]}
          frames={animation.frame_sequence}
          frameSize={animation.frame_size}
          fps={animation.fps}
          loop={animation.loop}
          width={animation.display_width ?? 160}
          height={animation.display_height ?? 160}
          frameOffsets={animation.frame_offsets}
          frameMirrors={animation.frame_mirrors}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-2"
      >
        <p className="text-lg font-semibold text-white/90">
          {animation.name}
        </p>
        {firstEncounter && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.6 }}
            className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white"
          >
            New
          </motion.span>
        )}
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 0.8 }}
        className="text-xs text-white/50"
        style={{ position: "absolute", bottom: "2rem" }}
      >
        Tap to dismiss
      </motion.p>
    </motion.div>
  );
}

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
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{
        duration: 1.2,
        delay: rustle.delay,
        times: [0, 0.15, 0.75, 1],
      }}
      style={{
        position: "absolute",
        left: `${rustle.x}%`,
        top: `${rustle.y}%`,
      }}
      className="pointer-events-none select-none"
    >
      <span className="text-lg italic text-muted-foreground">{rustle.text}</span>
    </motion.div>
  );
}


// --- Main components ---

/** Pawprint trail celebration — triggers on first log of the day */
export function WoodlandReveal() {
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
  const [revealAnim, setRevealAnim] = useState<RevealAnimation | null>(null);
  const [revealIsNew, setRevealIsNew] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const fadeoutTimer = useRef<ReturnType<typeof setTimeout>>();
  const leafTimer = useRef<ReturnType<typeof setTimeout>>();
  const revealPromiseRef = useRef<Promise<{ animation: RevealAnimation | null; firstEncounter: boolean }> | null>(null);

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

  // Pawprints start → prefetch reveal roll + set fadeout timer
  useEffect(() => {
    if (phase !== "pawprints") return;
    clearTimers();
    revealPromiseRef.current = fetch("/api/reveal/roll", {
      method: "POST",
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : { animation: null, firstEncounter: false }))
      .catch(() => ({ animation: null, firstEncounter: false }));
    fadeoutTimer.current = setTimeout(() => setPhase("fadeout"), PAWPRINT_TIMEOUT);
    return clearTimers;
  }, [phase, clearTimers]);

  // Fadeout → idle
  useEffect(() => {
    if (phase !== "fadeout") return;
    const t = setTimeout(() => setPhase("idle"), 600);
    return () => clearTimeout(t);
  }, [phase]);

  // Leaves → consume prefetched reveal → reveal or idle
  useEffect(() => {
    if (phase !== "leaves") return;
    clearTimers();
    leafTimer.current = setTimeout(async () => {
      try {
        const result = await (revealPromiseRef.current ?? Promise.resolve({ animation: null, firstEncounter: false }));
        if (result.animation) {
          setRevealAnim(result.animation);
          setRevealIsNew(result.firstEncounter ?? false);
          setPhase("reveal");
          // Fire audit log — user actually saw the creature
          fetch("/api/reveal/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              animation_id: result.animation.id,
              creature_id: result.animation.creature_id,
              first_encounter: result.firstEncounter ?? false,
            }),
          }).catch(() => {}); // fire-and-forget
          return;
        }
      } catch {
        // Roll failed — fall through to idle
      }
      revealPromiseRef.current = null;
      setPhase("idle");
    }, (LEAF_ANIM_DURATION + 0.05) * 1000);
    return clearTimers;
  }, [phase, clearTimers]);

  // Reveal → idle (auto-dismiss handled inside CreatureReveal)
  const handleRevealComplete = useCallback(() => {
    setRevealAnim(null);
    setRevealIsNew(false);
    revealPromiseRef.current = null;
    setPhase("idle");
  }, []);

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
            {/* Leaf burst — emoji projectiles with gravity */}
            <LeafBurst />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Creature reveal — full-screen overlay after leaves */}
      <AnimatePresence>
        {phase === "reveal" && revealAnim && (
          <CreatureReveal animation={revealAnim} firstEncounter={revealIsNew} onComplete={handleRevealComplete} />
        )}
      </AnimatePresence>

    </div>
  );
}
