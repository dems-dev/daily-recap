"use client";

import { useJson } from "@/hooks/use-json";

export type Me = {
  name: string | null;
  email: string;
  locale: string;
  currency: string;
  timezone: string;
  weekStartDay: string;
  reminderEnabled: boolean;
  reminderHour: number;
  createdAt: string;
  today: string;
  /** Server has AI configured. */
  aiAvailable: boolean;
  /** User preference in Settings. */
  aiOptIn: boolean;
  /** Both of the above: show AI features. */
  aiEnabled: boolean;
  pushEnabled: boolean;
};

/** The signed-in user's settings and today's date in their timezone. */
export function useMe(enabled = true) {
  return useJson<Me>(enabled ? "/api/me" : null);
}
