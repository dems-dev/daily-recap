"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, useDateFormat, useFailureToast } from "@/components/common";
import { useJson, sendJson, useInvalidate } from "@/hooks/use-json";
import { type WorkoutDTO, WORKOUT_TYPES } from "@/lib/workout";
import { todayKey } from "@/lib/date";

export default function WorkoutPage() {
  const t = useTranslations("Navigation");
  const { data, loading } = useJson<{ logs: WorkoutDTO[] }>("/api/workout");
  const format = useDateFormat();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const [name, setName] = useState("");
  const [type, setType] = useState<WorkoutDTO["type"]>("strength");
  const [duration, setDuration] = useState<number>(45);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      await sendJson("/api/workout", "POST", {
        name,
        type,
        duration,
        notes,
        date: todayKey(tz),
      });
      setName("");
      setNotes("");
      invalidate();
    } catch (err) {
      onFail(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("workout")} />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Log Workout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                placeholder="e.g. Morning Run, Push Day"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WorkoutDTO["type"])}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {WORKOUT_TYPES.map((tType) => (
                  <option key={tType} value={tType} className="capitalize">
                    {tType.replace("-", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="300"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                placeholder="How did it feel?"
              />
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()} className="w-full">
              {isSubmitting ? "..." : "Save Workout"}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card col-span-2">
          <CardHeader>
            <CardTitle>Recent Workouts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 animate-pulse rounded-xl bg-muted" />
            ) : !data?.logs?.length ? (
              <p className="text-muted-foreground text-sm">No workouts logged yet.</p>
            ) : (
              <div className="space-y-4">
                {data.logs.map((log) => (
                  <div key={log.id} className="flex flex-col space-y-1 rounded-lg border p-4 bg-card/50">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{log.name}</span>
                      <span className="text-sm text-muted-foreground">{format(log.date)}</span>
                    </div>
                    <div className="text-sm capitalize text-muted-foreground">
                      {log.type} • {log.duration} minutes
                    </div>
                    {log.notes && <p className="text-sm text-foreground mt-2">{log.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
