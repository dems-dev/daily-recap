"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Timer, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, useFailureToast } from "@/components/common";
import { toast } from "@/components/ui/toast";
import { useJson, sendJson, useInvalidate } from "@/hooks/use-json";
import { type PomodoroStats, type PomodoroCategory, POMODORO_CATEGORIES, TIMER_PRESETS } from "@/lib/pomodoro";
import { todayKey } from "@/lib/date";

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const R = 45;
const CIRC = 2 * Math.PI * R;

/** A short pleasant three-note chime via Web Audio — no asset needed. */
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t0 = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
      o.start(t0);
      o.stop(t0 + 0.47);
    });
    setTimeout(() => ctx.close(), 1600);
  } catch {
    /* audio not available */
  }
}

export default function PomodoroPage() {
  const t = useTranslations("Productivity");
  const { data, loading } = useJson<{ today: string; stats: PomodoroStats }>("/api/pomodoro");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const [timeLeft, setTimeLeft] = useState(TIMER_PRESETS.focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [duration, setDuration] = useState<number>(TIMER_PRESETS.focus);
  const [category, setCategory] = useState<PomodoroCategory>("work");
  const [focusLabel, setFocusLabel] = useState("");
  const isBreak = duration !== TIMER_PRESETS.focus;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleComplete = async () => {
    setIsRunning(false);
    playChime();
    // Only focus sessions are logged (breaks aren't "focus time").
    if (isBreak) return;
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(t("completeTitle"), { body: t("completeBody", { min: duration }) });
      }
    } catch {
      /* ignore */
    }
    toast.add({ title: t("completeTitle"), description: t("completeBody", { min: duration }), type: "success" });
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      await sendJson("/api/pomodoro", "POST", {
        category,
        label: focusLabel.trim() || null,
        duration,
        date: todayKey(tz),
      });
      invalidate();
    } catch (err) {
      onFail(err);
    }
  };

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      const id = setTimeout(() => void handleComplete(), 0);
      return () => clearTimeout(id);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, timeLeft]);

  const handleStart = () => {
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
    } catch {
      /* ignore */
    }
    setIsRunning(true);
  };
  const handleStop = () => setIsRunning(false);
  const handleReset = (minutes: number) => {
    setIsRunning(false);
    setDuration(minutes);
    setTimeLeft(minutes * 60);
  };

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const progress = (duration * 60 - timeLeft) / (duration * 60);

  const PRESETS: [string, number][] = [
    [t("focus"), TIMER_PRESETS.focus],
    [t("shortBreak"), TIMER_PRESETS.shortBreak],
    [t("longBreak"), TIMER_PRESETS.longBreak],
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("pomodoroTitle")} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Timer */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="size-5 text-primary" />
              {t("timer")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center gap-6 pb-8">
            <div className="flex flex-wrap justify-center gap-2">
              {PRESETS.map(([label, mins]) => (
                <Button key={mins} variant={duration === mins ? "default" : "outline"} size="sm" onClick={() => handleReset(mins)} disabled={isRunning}>
                  {label}
                </Button>
              ))}
            </div>

            <div className="relative grid place-items-center">
              <svg viewBox="0 0 100 100" className="size-60 -rotate-90">
                <circle cx="50" cy="50" r={R} fill="none" strokeWidth="6" className="text-muted" stroke="currentColor" />
                <circle
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className="text-primary"
                  stroke="currentColor"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - progress)}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="absolute font-heading text-5xl font-bold tabular-nums">
                {mm}:{ss}
              </div>
            </div>

            {!isRunning && !isBreak ? (
              <div className="w-full max-w-xs space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p-cat">{t("categoryLabel")}</Label>
                  <select id="p-cat" value={category} onChange={(e) => setCategory(e.target.value as PomodoroCategory)} className={SELECT_CLASS}>
                    {POMODORO_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {t(`cat.${c}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-label">
                    {t("focusOn")} <span className="text-muted-foreground">({t("focusOnPlaceholder")})</span>
                  </Label>
                  <Input id="p-label" value={focusLabel} onChange={(e) => setFocusLabel(e.target.value)} />
                </div>
              </div>
            ) : null}

            <div className="flex gap-4">
              {isRunning ? (
                <Button size="lg" variant="outline" onClick={handleStop} className="h-14 w-32 text-lg">
                  <Square className="mr-2 size-5" /> {t("stop")}
                </Button>
              ) : (
                <Button size="lg" onClick={handleStart} className="h-14 w-32 text-lg">
                  <Play className="mr-2 size-5" /> {t("start")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{t("stats")}</CardTitle>
            <CardDescription>{t("statsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 animate-pulse rounded-xl bg-muted" />
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 rounded-xl border p-4">
                    <p className="text-sm font-medium text-muted-foreground">{t("today")}</p>
                    <p className="font-heading text-2xl font-bold tabular-nums">{t("minUnit", { min: data?.stats.today.minutes ?? 0 })}</p>
                    <p className="text-xs text-muted-foreground">{t("sessionsCount", { count: data?.stats.today.sessions ?? 0 })}</p>
                  </div>
                  <div className="space-y-1 rounded-xl border p-4">
                    <p className="text-sm font-medium text-muted-foreground">{t("thisWeek")}</p>
                    <p className="font-heading text-2xl font-bold tabular-nums">{t("minUnit", { min: data?.stats.week.minutes ?? 0 })}</p>
                    <p className="text-xs text-muted-foreground">{t("sessionsCount", { count: data?.stats.week.sessions ?? 0 })}</p>
                  </div>
                </div>

                {data?.stats.byCategory && data.stats.byCategory.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">
                      {t("byCategory")} · {t("weekSuffix")}
                    </h4>
                    <div className="space-y-2">
                      {data.stats.byCategory.map((c) => (
                        <div key={c.category} className="flex items-center justify-between text-sm">
                          <span>{POMODORO_CATEGORIES.includes(c.category as PomodoroCategory) ? t(`cat.${c.category}`) : c.category}</span>
                          <span className="font-medium tabular-nums">{t("minUnit", { min: c.minutes })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
