"use client";

import { useEffect, useState } from "react";

type Phase = "walking" | "flexing" | "done";

export function Raccoon() {
  const [phase, setPhase] = useState<Phase>("walking");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("flexing"), 2500);
    const t2 = setTimeout(() => setPhase("done"), 4100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      aria-hidden
      className={`raccoon-container ${phase === "walking" ? "raccoon-walk-in" : ""}`}
      style={phase === "flexing" ? { transform: "translateX(36px)" } : undefined}
    >
      <div className="raccoon-clip">
        <div className={`raccoon-sprite ${phase === "walking" ? "raccoon-walk" : "raccoon-flex"}`} />
      </div>
    </div>
  );
}
