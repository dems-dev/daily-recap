"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, useDateFormat, useFailureToast } from "@/components/common";
import { useJson, sendJson, useInvalidate } from "@/hooks/use-json";
import { type MeditationDTO, MEDITATION_TYPES } from "@/lib/meditation";
import { todayKey } from "@/lib/date";

export default function MeditationPage() {
  const t = useTranslations("Navigation"); // using Navigation for generic words, or maybe Mind
  const { data, loading } = useJson<{ logs: MeditationDTO[] }>("/api/meditation");
  const format = useDateFormat();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const [duration, setDuration] = useState<number>(10);
  const [type, setType] = useState<MeditationDTO["type"]>("guided");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      await sendJson("/api/meditation", "POST", {
        type,
        duration,
        notes,
        date: todayKey(tz),
      });
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
      <PageHeader title={t("meditation")} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Log Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="180"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MeditationDTO["type"])}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {MEDITATION_TYPES.map((tType) => (
                  <option key={tType} value={tType} className="capitalize">
                    {tType.replace("-", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                placeholder="How was the session?"
              />
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting || duration < 1} className="w-full">
              {isSubmitting ? "..." : "Save"}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 animate-pulse rounded-xl bg-muted" />
            ) : !data?.logs?.length ? (
              <p className="text-muted-foreground text-sm">No sessions logged.</p>
            ) : (
              <div className="space-y-4">
                {data.logs.map((log) => (
                  <div key={log.id} className="flex flex-col space-y-1 rounded-lg border p-4 bg-card/50">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold capitalize">{log.type.replace("-", " ")}</span>
                      <span className="text-sm text-muted-foreground">{format(log.date)}</span>
                    </div>
                    <div className="text-sm">
                      {log.duration} minutes
                    </div>
                    {log.notes && <p className="text-sm text-muted-foreground mt-2">{log.notes}</p>}
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
