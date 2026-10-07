"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GraduationCap, Plus, Clock, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, ConfirmDialog, useFailureToast } from "@/components/common";
import { EmptyState } from "@/components/ui/empty-state";
import { useJson, sendJson, useInvalidate } from "@/hooks/use-json";
import { type SkillDTO, SKILL_LEVELS } from "@/lib/skills";
import { todayKey } from "@/lib/date";

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default function SkillsPage() {
  const t = useTranslations("Learning");
  const tc = useTranslations("Common");
  const { data, loading } = useJson<{ logs: SkillDTO[] }>("/api/skills");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState<SkillDTO["level"]>("beginner");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Session dialog
  const [sessionSkill, setSessionSkill] = useState<SkillDTO | null>(null);
  const [sessionMinutes, setSessionMinutes] = useState(30);
  const [sessionNotes, setSessionNotes] = useState("");

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCategory("");
    setLevel("beginner");
  };

  const startEdit = (skill: SkillDTO) => {
    setEditingId(skill.id);
    setName(skill.name);
    setCategory(skill.category ?? "");
    setLevel(skill.level);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = { name, category: category || null, level };
      if (editingId) await sendJson(`/api/skills/${editingId}`, "PATCH", payload);
      else await sendJson("/api/skills", "POST", payload);
      resetForm();
      invalidate();
    } catch (err) {
      onFail(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveSession = async () => {
    if (!sessionSkill || sessionMinutes <= 0) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      await sendJson(`/api/skills/${sessionSkill.id}/sessions`, "POST", {
        duration: sessionMinutes,
        notes: sessionNotes || null,
        date: todayKey(tz),
      });
      setSessionSkill(null);
      setSessionNotes("");
      setSessionMinutes(30);
      invalidate();
    } catch (err) {
      onFail(err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("skillsTitle")} />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Form */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="size-5 text-primary" />
              {editingId ? t("updateSkill") : t("addSkill")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="s-name">{t("skillName")}</Label>
              <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("skillNamePlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-cat">
                {t("category")} <span className="text-muted-foreground">({t("categoryPlaceholder")})</span>
              </Label>
              <Input id="s-cat" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-level">{t("level")}</Label>
              <select id="s-level" value={level} onChange={(e) => setLevel(e.target.value as SkillDTO["level"])} className={SELECT_CLASS}>
                {SKILL_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {t(`levels.${lvl}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()} className="flex-1 gap-2">
                <Plus className="size-4" /> {isSubmitting ? "…" : editingId ? tc("save") : t("addSkill")}
              </Button>
              {editingId ? (
                <Button variant="outline" size="icon" onClick={resetForm} aria-label={tc("cancel")}>
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Skills grid */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t("mySkills")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 animate-pulse rounded-xl bg-muted" />
            ) : !data?.logs?.length ? (
              <EmptyState icon={GraduationCap} title={t("noSkills")} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.logs.map((skill) => (
                  <div key={skill.id} className="flex flex-col rounded-xl border border-border/70 p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="truncate font-heading font-semibold">{skill.name}</h4>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="secondary">{t(`levels.${skill.level}`)}</Badge>
                          {skill.category ? <span className="text-xs text-muted-foreground">{skill.category}</span> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => startEdit(skill)} aria-label={tc("edit")}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeletingId(skill.id)} aria-label={tc("delete")}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="mb-3 text-sm text-muted-foreground tabular-nums">
                      <span className="font-medium text-foreground">
                        {t("hm", { h: Math.floor(skill.totalDuration / 60), m: skill.totalDuration % 60 })}
                      </span>{" "}
                      {t("totalTime")}
                    </p>
                    <Button variant="secondary" size="sm" className="mt-auto w-full gap-2" onClick={() => setSessionSkill(skill)}>
                      <Clock className="size-4" /> {t("logSession")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session dialog */}
      <Dialog open={sessionSkill !== null} onOpenChange={(o) => !o && setSessionSkill(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("logSession")}
              {sessionSkill ? ` · ${sessionSkill.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sess-dur">{t("sessionDuration")}</Label>
              <Input
                id="sess-dur"
                type="number"
                min={1}
                max={600}
                value={sessionMinutes}
                onChange={(e) => setSessionMinutes(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sess-notes">{t("sessionNotes")}</Label>
              <Textarea id="sess-notes" value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionSkill(null)}>
              {tc("cancel")}
            </Button>
            <Button onClick={saveSession} disabled={sessionMinutes <= 0}>
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingId !== null}
        onOpenChange={(o) => !o && setDeletingId(null)}
        title={t("deleteSkillTitle")}
        description={t("deleteSkillDesc")}
        onConfirm={async () => {
          if (!deletingId) return;
          try {
            await sendJson(`/api/skills/${deletingId}`, "DELETE");
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
