"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GraduationCap, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, useFailureToast } from "@/components/common";
import { useJson, sendJson, useInvalidate } from "@/hooks/use-json";
import { type SkillDTO, SKILL_LEVELS } from "@/lib/skills";
import { todayKey } from "@/lib/date";

export default function SkillsPage() {
  const t = useTranslations("Navigation");
  const { data, loading } = useJson<{ logs: SkillDTO[] }>("/api/skills");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const [name, setName] = useState("");
  const [level, setLevel] = useState<SkillDTO["level"]>("beginner");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSkill = async () => {
    setIsSubmitting(true);
    try {
      await sendJson("/api/skills", "POST", { name, level });
      setName("");
      invalidate();
    } catch (err) {
      onFail(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogSession = async (skillId: string) => {
    const durationStr = prompt("How many minutes did you practice?");
    if (!durationStr) return;
    const duration = parseInt(durationStr, 10);
    if (isNaN(duration) || duration <= 0) return;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      await sendJson(`/api/skills/${skillId}/sessions`, "POST", {
        duration,
        date: todayKey(tz),
      });
      invalidate();
    } catch (err) {
      onFail(err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("skills")} />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Add Skill
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Skill Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                placeholder="e.g. Spanish, React, Guitar"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as SkillDTO["level"])}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {SKILL_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl} className="capitalize">
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleAddSkill} disabled={isSubmitting || !name.trim()} className="w-full">
              <Plus className="mr-2 h-4 w-4" /> {isSubmitting ? "..." : "Add Skill"}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card col-span-2">
          <CardHeader>
            <CardTitle>My Skills</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 animate-pulse rounded-xl bg-muted" />
            ) : !data?.logs?.length ? (
              <p className="text-muted-foreground text-sm">No skills tracked yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.logs.map((skill) => (
                  <div key={skill.id} className="flex flex-col rounded-lg border p-4 bg-card/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{skill.name}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{skill.level}</p>
                      </div>
                      <div className="flex flex-col items-end text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{Math.floor(skill.totalDuration / 60)}h {skill.totalDuration % 60}m</span>
                        total
                      </div>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="mt-auto w-full"
                      onClick={() => handleLogSession(skill.id)}
                    >
                      <Clock className="mr-2 h-4 w-4" /> Log Session
                    </Button>
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
