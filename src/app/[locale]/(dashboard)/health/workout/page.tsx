"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Dumbbell, Pencil, Trash2, Clock, Flame, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, useDateFormat, ConfirmDialog, useFailureToast } from "@/components/common";
import { EmptyState } from "@/components/ui/empty-state";
import { useJson, sendJson, useInvalidate } from "@/hooks/use-json";
import { type WorkoutDTO, WORKOUT_TYPES } from "@/lib/workout";
import { addDays, todayKey } from "@/lib/date";

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default function WorkoutPage() {
  const t = useTranslations("Workout");
  const tc = useTranslations("Common");
  const { data, loading } = useJson<{ logs: WorkoutDTO[] }>("/api/workout");
  const format = useDateFormat();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<WorkoutDTO["type"]>("strength");
  const [duration, setDuration] = useState<number>(45);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setType("strength");
    setDuration(45);
    setNotes("");
  };

  const startEdit = (log: WorkoutDTO) => {
    setEditingId(log.id);
    setName(log.name);
    setType(log.type);
    setDuration(log.duration ?? 0);
    setNotes(log.notes ?? "");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      const payload = { name, type, duration, notes, date: todayKey(tz) };
      if (editingId) await sendJson(`/api/workout/${editingId}`, "PATCH", payload);
      else await sendJson("/api/workout", "POST", payload);
      resetForm();
      invalidate();
    } catch (err) {
      onFail(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const weekStart = useMemo(() => addDays(todayKey(Intl.DateTimeFormat().resolvedOptions().timeZone), -6), []);
  const weekLogs = (data?.logs ?? []).filter((l) => l.date >= weekStart);
  const weekMinutes = weekLogs.reduce((sum, l) => sum + (l.duration ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />

      {/* Weekly stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("thisWeek")}</CardTitle>
            <Dumbbell className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-heading text-2xl font-bold tabular-nums">{t("sessions", { count: weekLogs.length })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalTime")}</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-heading text-2xl font-bold tabular-nums">{t("minLabel", { min: weekMinutes })}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Form */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="size-5 text-primary" />
              {editingId ? t("updateWorkout") : t("logWorkout")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="w-name">{t("name")}</Label>
              <Input id="w-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="w-type">{t("type")}</Label>
              <select id="w-type" value={type} onChange={(e) => setType(e.target.value as WorkoutDTO["type"])} className={SELECT_CLASS}>
                {WORKOUT_TYPES.map((wt) => (
                  <option key={wt} value={wt}>
                    {t(`types.${wt}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="w-duration">{t("duration")}</Label>
              <Input id="w-duration" type="number" min={1} max={300} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="w-notes">{t("notes")}</Label>
              <Textarea id="w-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()} className="flex-1">
                {isSubmitting ? "…" : editingId ? tc("save") : t("save")}
              </Button>
              {editingId ? (
                <Button variant="outline" size="icon" onClick={resetForm} aria-label={tc("cancel")}>
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t("recent")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 animate-pulse rounded-xl bg-muted" />
            ) : !data?.logs?.length ? (
              <EmptyState icon={Dumbbell} title={t("noWorkouts")} />
            ) : (
              <ul className="space-y-3">
                {data.logs.map((log) => (
                  <li key={log.id} className="flex items-start gap-3 rounded-xl border border-border/70 p-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Dumbbell className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{log.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{format(log.date)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t(`types.${log.type}`)}
                        {log.duration ? ` · ${t("minLabel", { min: log.duration })}` : ""}
                      </p>
                      {log.notes ? <p className="mt-1 text-sm">{log.notes}</p> : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => startEdit(log)} aria-label={tc("edit")}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeletingId(log.id)} aria-label={tc("delete")}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deletingId !== null}
        onOpenChange={(o) => !o && setDeletingId(null)}
        title={t("deleteTitle")}
        description={t("deleteDesc")}
        onConfirm={async () => {
          if (!deletingId) return;
          try {
            await sendJson(`/api/workout/${deletingId}`, "DELETE");
            if (editingId === deletingId) resetForm();
            invalidate();
          } catch (err) {
            onFail(err);
          }
        }}
      />
    </div>
  );
}
