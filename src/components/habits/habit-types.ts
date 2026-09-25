export type HabitDTO = {
  id: string;
  name: string;
  icon: string | null;
  isActive: boolean;
  days: Record<string, boolean>;
  currentStreak: number;
  bestStreak: number;
  rate30: number;
};

export type HabitsResponse = { today: string; days: string[]; habits: HabitDTO[] };
