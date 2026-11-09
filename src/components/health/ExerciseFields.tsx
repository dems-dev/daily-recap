"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Copy, Dumbbell, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EXERCISE_PRESETS,
  normalizeExerciseName,
  type ExerciseInput,
  type ExerciseRecord,
} from "@/lib/exercises";

/** Sets are held as strings while typing, so a half-typed number is not a NaN. */
export type ExerciseDraft = { name: string; sets: Array<{ reps: string; weight: string }> };

const emptySet = () => ({ reps: "", weight: "" });

export const emptyExerciseDraft = (): ExerciseDraft => ({ name: "", sets: [emptySet()] });

export function draftToEditable(exercise: {
  name: string;
  sets: Array<{ reps: number; weight?: number | null }>;
}): ExerciseDraft {
  return {
    name: exercise.name,
    sets: exercise.sets.length
      ? exercise.sets.map((set) => ({
          reps: String(set.reps),
          weight: set.weight === null || set.weight === undefined ? "" : String(set.weight),
        }))
      : [emptySet()],
  };
}

/** Drops half-filled rows, so an empty extra set never blocks a save. */
export function draftsToInput(drafts: readonly ExerciseDraft[]): ExerciseInput[] {
  return drafts.flatMap((draft) => {
    const name = draft.name.trim();
    if (!name) return [];
    const sets = draft.sets.flatMap((set) => {
      const reps = Number.parseInt(set.reps, 10);
      if (!Number.isFinite(reps) || reps < 1) return [];
      const weightRaw = set.weight.trim().replace(",", ".");
      const weight = weightRaw === "" ? null : Number.parseFloat(weightRaw);
      return [{ reps, weight: weight !== null && Number.isFinite(weight) ? weight : null }];
    });
    return sets.length ? [{ name, sets }] : [];
  });
}

const NUMBER_CLASS = "h-9 w-20 tabular-nums";

export function ExerciseFields({
  value,
  onChange,
  records,
}: {
  value: ExerciseDraft[];
  onChange: (next: ExerciseDraft[]) => void;
  records: readonly ExerciseRecord[];
}) {
  const t = useTranslations("Workout");

  const byName = useMemo(() => {
    const map = new Map<string, ExerciseRecord>();
    for (const record of records) map.set(record.canonicalName, record);
    return map;
  }, [records]);

  const update = (index: number, next: ExerciseDraft) =>
    onChange(value.map((draft, i) => (i === index ? next : draft)));

  /** "Terakhir: 60 kg × 8 repetisi" for an exercise that has been logged before. */
  const lastHint = (name: string) => {
    const record = byName.get(normalizeExerciseName(name));
    if (!record) return null;
    if (!record.bodyweight && record.lastWeight !== null) {
      return t("exercises.last", {
        detail: t("exercises.lastWeighted", {
          weight: record.lastWeight,
          reps: record.lastWeightReps ?? 1,
        }),
      });
    }
    if (record.lastReps !== null) {
      return t("exercises.last", { detail: t("exercises.lastReps", { reps: record.lastReps }) });
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-2">
          <Dumbbell className="size-4 text-muted-foreground" />
          {t("exercises.title")}
        </Label>
        <Button variant="outline" size="sm" onClick={() => onChange([...value, emptyExerciseDraft()])}>
          <Plus className="size-4" />
          {t("exercises.add")}
        </Button>
      </div>

      <datalist id="exercise-presets">
        {EXERCISE_PRESETS.map((preset) => (
          <option key={preset.id} value={t(`exercisePresets.${preset.id}`)} />
        ))}
      </datalist>

      {!value.length ? (
        <p className="text-xs text-muted-foreground">{t("exercises.none")}</p>
      ) : null}

      {value.map((draft, index) => {
        const hint = lastHint(draft.name);
        return (
          <div key={index} className="space-y-2 rounded-xl border border-border/70 p-3">
            <div className="flex items-center gap-2">
              <Input
                list="exercise-presets"
                value={draft.name}
                placeholder={t("exercises.namePlaceholder")}
                onChange={(e) => update(index, { ...draft, name: e.target.value })}
                aria-label={t("exercises.title")}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("exercises.remove")}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <X className="size-4" />
              </Button>
            </div>

            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

            <div className="space-y-2">
              {draft.sets.map((set, setIndex) => (
                <div key={setIndex} className="flex flex-wrap items-center gap-2">
                  <span className="w-12 shrink-0 text-xs text-muted-foreground">
                    {t("exercises.setLabel", { number: setIndex + 1 })}
                  </span>
                  <Input
                    className={NUMBER_CLASS}
                    type="number"
                    min={1}
                    max={500}
                    inputMode="numeric"
                    value={set.reps}
                    placeholder={t("exercises.reps")}
                    aria-label={t("exercises.reps")}
                    onChange={(e) =>
                      update(index, {
                        ...draft,
                        sets: draft.sets.map((s, i) => (i === setIndex ? { ...s, reps: e.target.value } : s)),
                      })
                    }
                  />
                  <span className="text-xs text-muted-foreground">×</span>
                  <Input
                    className={NUMBER_CLASS}
                    type="number"
                    min={0}
                    max={1000}
                    step="0.5"
                    inputMode="decimal"
                    value={set.weight}
                    placeholder={t("exercises.bodyweight")}
                    aria-label={t("exercises.weight")}
                    onChange={(e) =>
                      update(index, {
                        ...draft,
                        sets: draft.sets.map((s, i) =>
                          i === setIndex ? { ...s, weight: e.target.value } : s
                        ),
                      })
                    }
                  />
                  <span className="text-xs text-muted-foreground">kg</span>
                  {draft.sets.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("exercises.removeSet")}
                      onClick={() =>
                        update(index, { ...draft, sets: draft.sets.filter((_, i) => i !== setIndex) })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => update(index, { ...draft, sets: [...draft.sets, emptySet()] })}
              >
                <Plus className="size-4" />
                {t("exercises.addSet")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!draft.sets.length}
                onClick={() =>
                  update(index, {
                    ...draft,
                    sets: [...draft.sets, { ...draft.sets[draft.sets.length - 1] }],
                  })
                }
              >
                <Copy className="size-4" />
                {t("exercises.duplicateSet")}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">{t("exercises.weightHint")}</p>
          </div>
        );
      })}
    </div>
  );
}
