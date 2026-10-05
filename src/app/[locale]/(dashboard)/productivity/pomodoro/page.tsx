"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Timer, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, useFailureToast } from "@/components/common";
import { useJson, sendJson, useInvalidate } from "@/hooks/use-json";
import { type PomodoroStats, TIMER_PRESETS } from "@/lib/pomodoro";
import { todayKey } from "@/lib/date";

export default function PomodoroPage() {
  const t = useTranslations("Productivity");
  const { data, loading } = useJson<{ today: string; stats: PomodoroStats }>("/api/pomodoro");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const [timeLeft, setTimeLeft] = useState(TIMER_PRESETS.focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [duration, setDuration] = useState<number>(TIMER_PRESETS.focus);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleComplete = async () => {
    setIsRunning(false);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      await sendJson("/api/pomodoro", "POST", {
        category: "work",
        duration,
        date: todayKey(tz),
      });
      invalidate();
      // Play a notification sound here in a real app
    } catch (err) {
      onFail(err);
    }
  };

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      // Defer completion out of the effect body so we don't call setState synchronously here.
      const id = setTimeout(() => void handleComplete(), 0);
      return () => clearTimeout(id);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, timeLeft]);

  const handleStart = () => setIsRunning(true);
  const handleStop = () => setIsRunning(false);

  const handleReset = (minutes: number) => {
    setIsRunning(false);
    setDuration(minutes);
    setTimeLeft(minutes * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100;

  return (
    <div className="space-y-6">
      <PageHeader title={t("pomodoroTitle")} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Timer Card */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              {t("timer")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center space-y-8 pb-8">
            <div className="flex gap-2">
              <Button
                variant={duration === TIMER_PRESETS.focus ? "default" : "outline"}
                onClick={() => handleReset(TIMER_PRESETS.focus)}
                disabled={isRunning}
              >
                Focus
              </Button>
              <Button
                variant={duration === TIMER_PRESETS.shortBreak ? "default" : "outline"}
                onClick={() => handleReset(TIMER_PRESETS.shortBreak)}
                disabled={isRunning}
              >
                Short Break
              </Button>
              <Button
                variant={duration === TIMER_PRESETS.longBreak ? "default" : "outline"}
                onClick={() => handleReset(TIMER_PRESETS.longBreak)}
                disabled={isRunning}
              >
                Long Break
              </Button>
            </div>

            <div className="relative flex h-64 w-64 items-center justify-center rounded-full border-8 border-muted">
              <div
                className="absolute inset-0 rounded-full border-8 border-primary transition-all duration-1000 ease-linear"
                style={{ clipPath: `polygon(50% 50%, 50% 0%, ${progress}% 0%, ${progress}% 100%, 0% 100%, 0% 0%)` }} // naive circle mask
              />
              <div className="z-10 text-6xl font-bold tracking-tighter tabular-nums">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </div>
            </div>

            <div className="flex gap-4">
              {isRunning ? (
                <Button size="lg" variant="outline" onClick={handleStop} className="h-14 w-32 text-lg">
                  <Square className="mr-2 h-5 w-5" />
                  {t("stop")}
                </Button>
              ) : (
                <Button size="lg" onClick={handleStart} className="h-14 w-32 text-lg">
                  <Play className="mr-2 h-5 w-5" />
                  {t("start")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
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
                  <div className="space-y-1 rounded-lg border p-4">
                    <p className="text-sm font-medium text-muted-foreground">{t("today")}</p>
                    <p className="text-2xl font-bold">{data?.stats.today.minutes} min</p>
                    <p className="text-xs text-muted-foreground">{data?.stats.today.sessions} sessions</p>
                  </div>
                  <div className="space-y-1 rounded-lg border p-4">
                    <p className="text-sm font-medium text-muted-foreground">{t("thisWeek")}</p>
                    <p className="text-2xl font-bold">{data?.stats.week.minutes} min</p>
                    <p className="text-xs text-muted-foreground">{data?.stats.week.sessions} sessions</p>
                  </div>
                </div>

                {data?.stats.byCategory && data.stats.byCategory.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">{t("byCategory")} (Week)</h4>
                    <div className="space-y-2">
                      {data.stats.byCategory.map((cat) => (
                        <div key={cat.category} className="flex items-center justify-between text-sm">
                          <span className="capitalize">{cat.category.replace("-", " ")}</span>
                          <span className="font-medium">{cat.minutes} min</span>
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
