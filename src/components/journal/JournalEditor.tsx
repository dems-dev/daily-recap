"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog, useFailureToast } from "@/components/common";
import { sendJson, useInvalidate, useJson } from "@/hooks/use-json";
import { MOODS, type JournalDTO, type Mood } from "@/lib/journal";
import { MoodFace } from "@/components/ui/mood-face";
import { cn } from "@/lib/utils";

type Draft = { mood: Mood | null; title: string; content: string; gratitude: string[]; tags: string };

const GRATITUDE_SLOTS = 3;

function toDraft(entry: JournalDTO | null): Draft {
  const gratitude = [...(entry?.gratitude ?? [])];
  while (gratitude.length < GRATITUDE_SLOTS) gratitude.push("");
  return {
    mood: entry?.mood ?? null,
    title: entry?.title ?? "",
    content: entry?.content ?? "",
    gratitude,
    tags: entry?.tags.join(", ") ?? "",
  };
}

export function MoodPicker({ value, onChange }: { value: Mood | null; onChange: (m: Mood) => void }) {
  const t = useTranslations("Journal");
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("mood")}>
      {MOODS.map((mood) => (
        <button
          key={mood}
          type="button"
          role="radio"
          aria-checked={value === mood}
          onClick={() => onChange(mood)}
          className={cn(
            "flex min-w-16 flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 text-xs transition-colors",
            value === mood ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted"
          )}
        >
          <MoodFace mood={mood} size={28} className={cn("transition-transform", value === mood && "scale-110")} />
          {t(`moods.${mood}`)}
        </button>
      ))}
    </div>
  );
}

/** Load and edit the journal entry of one day. `compact` hides title/tags (used on the recap page). */
export function JournalEditor({ date, compact = false }: { date: string; compact?: boolean }) {
  const t = useTranslations("Journal");
  const tc = useTranslations("Common");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const { data } = useJson<{ date: string; today: string; entry: JournalDTO | null }>(`/api/journal/${date}`);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moodError, setMoodError] = useState(false);

  // Reset the draft when a different day's entry arrives (not on every refetch).
  const dataKey = data ? `${data.date}|${data.entry?.updatedAt ?? "new"}` : null;
  useEffect(() => {
    if (!data || dataKey === loadedFor) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing the editable draft to newly loaded server data
    setDraft(toDraft(data.entry));
    setLoadedFor(dataKey);
  }, [data, dataKey, loadedFor]);

  if (!data || !draft || data.date !== date) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const isFuture = date > data.today;
  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.mood) {
      setMoodError(true);
      return;
    }
    setSaving(true);
    try {
      await sendJson(`/api/journal/${date}`, "PUT", {
        mood: draft.mood,
        title: draft.title,
        content: draft.content,
        gratitude: draft.gratitude.map((g) => g.trim()).filter(Boolean),
        tags: draft.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      toast.add({ title: t("saved"), type: "success" });
      invalidate();
    } catch (err) {
      onFail(err);
    } finally {
      setSaving(false);
    }
  };

  if (isFuture) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("futureDay")}</p>;
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">{t("howWasYourDay")}</p>
        <MoodPicker
          value={draft.mood}
          onChange={(mood) => {
            update({ mood });
            setMoodError(false);
          }}
        />
        {moodError && <p className="text-xs text-destructive">{t("moodRequired")}</p>}
      </div>

      {!compact && (
        <div className="space-y-2">
          <Label htmlFor={`journal-title-${date}`}>{t("titleLabel")}</Label>
          <Input
            id={`journal-title-${date}`}
            value={draft.title}
            maxLength={120}
            onChange={(e) => update({ title: e.target.value })}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`journal-content-${date}`}>{compact ? t("reflection") : t("content")}</Label>
        <Textarea
          id={`journal-content-${date}`}
          rows={compact ? 4 : 8}
          value={draft.content}
          placeholder={t("contentPlaceholder")}
          onChange={(e) => update({ content: e.target.value })}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("gratitude")}</legend>
        {draft.gratitude.map((g, i) => (
          <Input
            key={i}
            value={g}
            maxLength={200}
            placeholder={t("gratitudePlaceholder", { n: i + 1 })}
            aria-label={t("gratitudePlaceholder", { n: i + 1 })}
            onChange={(e) => {
              const gratitude = [...draft.gratitude];
              gratitude[i] = e.target.value;
              update({ gratitude });
            }}
          />
        ))}
      </fieldset>

      {!compact && (
        <div className="space-y-2">
          <Label htmlFor={`journal-tags-${date}`}>{t("tags")}</Label>
          <Input
            id={`journal-tags-${date}`}
            value={draft.tags}
            placeholder={t("tagsPlaceholder")}
            onChange={(e) => update({ tags: e.target.value })}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {data.entry ? (
          <Button type="button" variant="ghost" className="gap-1.5 text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> {tc("delete")}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={saving}>
          {tc("save")}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("deleteTitle")}
        onConfirm={async () => {
          try {
            await sendJson(`/api/journal/${date}`, "DELETE");
            toast.add({ title: tc("deleted"), type: "success" });
            setLoadedFor(null);
            invalidate();
          } catch (err) {
            onFail(err);
          }
        }}
      />
    </form>
  );
}
