"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Lightbulb, Plus, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader, useDateFormat, ConfirmDialog, useFailureToast } from "@/components/common";
import { EmptyState } from "@/components/ui/empty-state";
import { useJson, sendJson, useInvalidate } from "@/hooks/use-json";
import type { TilDTO } from "@/lib/til";
import { TilDialog } from "@/components/learning/TilDialog";

export default function TilPage() {
  const t = useTranslations("Learning");
  const tc = useTranslations("Common");
  const { data, loading } = useJson<{ notes: TilDTO[] }>("/api/til");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const format = useDateFormat();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<TilDTO | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const notes = useMemo(() => data?.notes ?? [], [data]);
  const allTags = useMemo(() => Array.from(new Set(notes.flatMap((n) => n.tags))).sort(), [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (activeTag && !n.tags.includes(activeTag)) return false;
      if (q && !n.content.toLowerCase().includes(q) && !n.tags.some((tag) => tag.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [notes, query, activeTag]);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await sendJson(`/api/til/${deletingId}`, "DELETE");
      invalidate();
    } catch (err) {
      onFail(err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("tilTitle")}>
        <Button
          onClick={() => {
            setEditingNote(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("addTil")}
        </Button>
      </PageHeader>

      {/* Search + tag filter */}
      {!loading && notes.length > 0 ? (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("tilSearch")} className="pl-9" />
          </div>
          {allTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  activeTag === null ? "border-primary bg-primary/10 font-medium text-primary" : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {t("tilAllTags")}
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag((cur) => (cur === tag ? null : tag))}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                    activeTag === tag ? "border-primary bg-primary/10 font-medium text-primary" : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState icon={Lightbulb} title={t("noTil")} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title={t("tilNoResults")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => (
            <Card key={note.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{format(note.date)}</span>
                  {note.source && (
                    <a
                      href={note.source}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                    >
                      {t("tilSource")} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <p className="whitespace-pre-wrap text-sm">{note.content}</p>
              </CardContent>
              <CardFooter className="flex items-center justify-between pt-0">
                <div className="flex flex-wrap gap-1">
                  {note.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => {
                      setEditingNote(note);
                      setDialogOpen(true);
                    }}
                  >
                    {tc("edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => setDeletingId(note.id)}
                  >
                    {tc("delete")}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <TilDialog open={dialogOpen} onOpenChange={setDialogOpen} note={editingNote} />
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title={t("deleteTilTitle")}
        description={t("deleteTilDesc")}
        onConfirm={handleDelete}
      />
    </div>
  );
}
