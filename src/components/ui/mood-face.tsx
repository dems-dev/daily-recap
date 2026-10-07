import * as React from "react";
import { cn } from "cn";
import type { Mood } from "@/lib/journal";

/**
 * Custom hand-drawn mood emoticons — consistent across every device (unlike the
 * OS emoji that render differently on Windows/Android/iOS). One rounded face per
 * mood with its own gradient and expression.
 */

type FaceSpec = {
  from: string;
  to: string;
  mouth: string;
  mouthFill?: boolean;
  happyEyes?: boolean;
  blush?: boolean;
};

const FACES: Record<Mood, FaceSpec> = {
  great: { from: "#34d399", to: "#059669", mouth: "M7 13.5 Q12 19.5 17 13.5 Z", mouthFill: true, happyEyes: true, blush: true },
  good: { from: "#4ade80", to: "#16a34a", mouth: "M8 14 Q12 18 16 14", happyEyes: true, blush: true },
  okay: { from: "#fbbf24", to: "#f59e0b", mouth: "M8.5 15 L15.5 15" },
  bad: { from: "#fb923c", to: "#ea580c", mouth: "M8 15.8 Q12 13.4 16 15.8" },
  terrible: { from: "#f87171", to: "#dc2626", mouth: "M7.8 16.2 Q12 12.8 16.2 16.2" },
};

const INK = "rgba(20,14,6,0.72)";

export function MoodFace({
  mood,
  score,
  size = 24,
  className,
}: {
  mood?: Mood;
  score?: number;
  size?: number;
  className?: string;
}) {
  const uid = React.useId();
  const resolved: Mood =
    mood ??
    (["terrible", "bad", "okay", "good", "great"][Math.max(0, Math.min(4, Math.round((score ?? 3) - 1)))] as Mood);
  const f = FACES[resolved] ?? FACES.okay;
  const gid = `mf-${uid}`;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("inline-block shrink-0 align-middle", className)}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={f.from} />
          <stop offset="100%" stopColor={f.to} />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill={`url(#${gid})`} />
      <circle cx="12" cy="12" r="11" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />

      {f.blush ? (
        <>
          <circle cx="7" cy="14" r="1.6" fill="rgba(255,255,255,0.28)" />
          <circle cx="17" cy="14" r="1.6" fill="rgba(255,255,255,0.28)" />
        </>
      ) : null}

      {f.happyEyes ? (
        <>
          <path d="M6.6 10.2 Q8.5 8.6 10.4 10.2" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M13.6 10.2 Q15.5 8.6 17.4 10.2" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="8.6" cy="10" r="1.25" fill={INK} />
          <circle cx="15.4" cy="10" r="1.25" fill={INK} />
        </>
      )}

      <path
        d={f.mouth}
        fill={f.mouthFill ? INK : "none"}
        stroke={INK}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Recharts custom axis tick that renders a MoodFace instead of a text label.
 * Pass as `tick={<MoodAxisTick orientation="y" />}` — recharts injects x/y/payload.
 */
export function MoodAxisTick({
  x,
  y,
  payload,
  orientation = "y",
  size = 18,
}: {
  x?: number;
  y?: number;
  payload?: { value?: number };
  orientation?: "x" | "y";
  size?: number;
}) {
  const px = x ?? 0;
  const py = y ?? 0;
  const tx = orientation === "y" ? px - size - 2 : px - size / 2;
  const ty = orientation === "y" ? py - size / 2 : py + 2;
  return (
    <g transform={`translate(${tx}, ${ty})`}>
      <MoodFace score={payload?.value} size={size} />
    </g>
  );
}
