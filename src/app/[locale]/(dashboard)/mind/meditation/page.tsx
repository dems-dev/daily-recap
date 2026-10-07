"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Brain, Play, Pause, RotateCcw, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ProgressRing } from "@/components/ui/progress-ring";
import { PageHeader, useDateFormat, ConfirmDialog, useFailureToast } from "@/components/common";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { useJson, sendJson, useInvalidate } from "@/hooks/use-json";
import { type MeditationDTO, MEDITATION_TYPES } from "@/lib/meditation";
import { addDays, todayKey } from "@/lib/date";

const PRESETS = [5, 10, 15, 20];
const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default function MeditationPage() {
  const t = useTranslations("Meditation");
  const tc = useTranslations("Common");
  const { data, loading } = useJson<{ logs: MeditationDTO[] }>("/api/meditation");
  const format = useDateFormat();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const [minutes, setMinutes] = useState(10);
  const [type, setType] = useState<MeditationDTO["type"]>("guided");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const loggedRef = useRef(false);

  const total = minutes * 60;
  const active = secondsLeft > 0 || running;

  const logSession = async (min: number) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      await sendJson("/api/meditation", "POST", { type, duration: min, notes: null, date: todayKey(tz) });
      invalidate();
    } catch (err) {
      onFail(err);
    }
  };

  // Countdown ticker. setState happens in the interval callback, not in the effect body.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          setRunning(false);
          if (!loggedRef.current) {
            loggedRef.current = true;
            toast.add({ title: t("completeTitle"), description: t("completeBody", { min: minutes }), type: "success" });
            logSession(minutes);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const startPause = () => {
    if (running) {
      setRunning(false);
      return;
    }
    if (secondsLeft === 0) {
      setSecondsLeft(total);
      loggedRef.current = false;
    }
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    setSecondsLeft(0);
    loggedRef.current = false;
  };

  const mm = String(Math.floor((secondsLeft || total) / 60)).padStart(2, "0");
  const ss = String((secondsLeft || total) % 60).padStart(2, "0");
  const percent = total > 0 ? ((total - (secondsLeft || total)) / total) * 100 : 0;

  const weekStart = useMemo(() => addDays(todayKey(Intl.DateTimeFormat().resolvedOptions().timeZone), -6), []);
  const weekLogs = (data?.logs ?? []).filter((l) => l.date >= weekStart);
  const weekMinutes = weekLogs.reduce((sum, l) => sum + l.duration, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Timer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="size-5 text-primary" />
              {t("timer")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5">
            <ProgressRing value={percent} size={180} stroke={14} trackClass="text-muted" progressClass="text-primary">
              <div className="font-heading text-4xl font-bold tabular-nums">
                {mm}:{ss}
              </div>
            </ProgressRing>

            {!active ? (
              <>
                <div className="flex flex-wrap justify-center gap-2">
                  {PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMinutes(m)}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        minutes === m ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted"
                      }`}
                    >
                      {t("minUnit", { min: m })}
                    </button>
                  ))}
                </div>
                <div className="w-full max-w-xs space-y-1.5">
                  <Label htmlFor="m-type">{t("type")}</Label>
                  <select id="m-type" value={type} onChange={(e) => setType(e.target.value as MeditationDTO["type"])} className={SELECT_CLASS}>
                    {MEDITATION_TYPES.map((mt) => (
                      <option key={mt} value={mt}>
                        {t(`types.${mt}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}

            <div className="flex gap-2">
              <Button onClick={startPause} className="gap-2">
                {running ? <Pause className="size-4" /> : <Play className="size-4" />}
                {running ? t("pause") : secondsLeft > 0 ? t("resume") : t("start")}
              </Button>
              {active ? (
                <Button variant="outline" onClick={reset} className="gap-2">
                  <RotateCcw className="size-4" /> {t("reset")}
                </Button>
              ) : (
                <Button variant="outline" onClick={() => logSession(minutes)} disabled={running}>
                  {t("logWithoutTimer")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats + recent */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("thisWeek")}</CardTitle>
                <Brain className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-heading text-2xl font-bold tabular-nums">{t("sessions", { count: weekLogs.length })}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalMinutes")}</CardTitle>
                <Clock className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-heading text-2xl font-bold tabular-nums">{t("minUnit", { min: weekMinutes })}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("recent")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-40 animate-pulse rounded-xl bg-muted" />
              ) : !data?.logs?.length ? (
                <EmptyState icon={Brain} title={t("noSessions")} />
              ) : (
                <ul className="space-y-2">
                  {data.logs.map((log) => (
                    <li key={log.id} className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Brain className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {t(`types.${log.type}`)} · {t("minUnit", { min: log.duration })}
                        </p>
                        <p className="text-xs text-muted-foreground">{format(log.date)}</p>
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeletingId(log.id)} aria-label={tc("delete")}>
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deletingId !== null}
        onOpenChange={(o) => !o && setDeletingId(null)}
        title={t("deleteTitle")}
        description={t("deleteDesc")}
        onConfirm={async () => {
          if (!deletingId) return;
          try {
            await sendJson(`/api/meditation/${deletingId}`, "DELETE");
            invalidate();
          } catch (err) {
            onFail(err);
          }
        }}
      />
    </div>
  );
}
