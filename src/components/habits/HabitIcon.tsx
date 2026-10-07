import {
  Droplet,
  Activity,
  BookOpen,
  Sparkles,
  Dumbbell,
  Apple,
  Moon,
  Pencil,
  Heart,
  Ban,
  Pill,
  Music,
  type LucideIcon,
} from "lucide-react";

/** Custom habit icons (lucide) — consistent on every device, unlike OS emoji. */
export const HABIT_ICON_KEYS = [
  "water",
  "run",
  "read",
  "meditate",
  "workout",
  "eat",
  "sleep",
  "write",
  "gratitude",
  "noSmoke",
  "meds",
  "music",
] as const;

const MAP: Record<string, LucideIcon> = {
  water: Droplet,
  run: Activity,
  read: BookOpen,
  meditate: Sparkles,
  workout: Dumbbell,
  eat: Apple,
  sleep: Moon,
  write: Pencil,
  gratitude: Heart,
  noSmoke: Ban,
  meds: Pill,
  music: Music,
};

// Map the old emoji values (stored on existing habits / in the seed) to keys.
const LEGACY: Record<string, string> = {
  "💧": "water",
  "🏃": "run",
  "📚": "read",
  "🧘": "meditate",
  "💪": "workout",
  "🥗": "eat",
  "😴": "sleep",
  "✍️": "write",
  "✍": "write",
  "🙏": "gratitude",
  "🚭": "noSmoke",
  "💊": "meds",
  "🎸": "music",
};

export function resolveHabitIconKey(value?: string | null): string {
  if (!value) return "water";
  if (MAP[value]) return value;
  if (LEGACY[value]) return LEGACY[value];
  return "water";
}

export function HabitIcon({ icon, className }: { icon?: string | null; className?: string }) {
  const Icon = MAP[resolveHabitIconKey(icon)];
  return <Icon className={className} aria-hidden />;
}
