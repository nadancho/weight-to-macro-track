"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/auth-provider";
import { ADMIN_UUID } from "@/app/lib/constants";

const CREATURES = [
  { id: "raccoon", name: "Tyson", src: "/sprites/raccoon-sp1-f.png" },
  { id: "ermine", name: "Ermine", src: "/sprites/ermine-sp1.png" },
  { id: "fruit-bat", name: "Fruit Bat", src: "/sprites/fruit-bat-sp1.png" },
  { id: "fox", name: "Fox", src: "/sprites/fox-sp1.png" },
  { id: "fennec", name: "Fennec", src: "/sprites/fennec-sp1.png" },
  { id: "cat", name: "Cat", src: "/sprites/cat-sp1.png" },
  { id: "possum", name: "Possum", src: "/sprites/possum-sp1.png" },
  { id: "skunk", name: "Skunk", src: "/sprites/skunk-sp1.png" },
  { id: "hedgehog", name: "Hedgehog", src: "/sprites/hedgehog-sp1.png" },
];

/** Probability (0–1) that a creature appears on any given page load */
const ENCOUNTER_CHANCE = 0.35;

/** Display height of the woodland strip */
const SCENE_HEIGHT = 140;

/** Creature display size (px) */
const CREATURE_SIZE = 64;

export function OverscrollCreature() {
  const { userId } = useAuth();

  const encounter = useMemo(() => {
    if (userId !== ADMIN_UUID) return null;
    if (Math.random() > ENCOUNTER_CHANCE) return null;
    const creature = CREATURES[Math.floor(Math.random() * CREATURES.length)];
    // Random horizontal position (25-75% to keep creature in the clearing)
    const xPercent = 25 + Math.random() * 50;
    return { creature, xPercent };
  }, [userId]);

  if (!encounter) return null;

  const { creature, xPercent } = encounter;

  return (
    <div
      className="pointer-events-none select-none"
      aria-hidden
      style={{
        height: SCENE_HEIGHT,
        marginTop: -1,
      }}
    >
      <div
        className="mx-auto max-w-4xl relative h-full"
        style={{
          backgroundImage: "url(/woodland-bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
          imageRendering: "pixelated",
        }}
      >
        <img
          src={creature.src}
          alt=""
          style={{
            position: "absolute",
            bottom: 8,
            left: `${xPercent}%`,
            transform: "translateX(-50%)",
            width: CREATURE_SIZE,
            height: CREATURE_SIZE,
            objectFit: "contain",
            imageRendering: "pixelated",
          }}
        />
      </div>
    </div>
  );
}
