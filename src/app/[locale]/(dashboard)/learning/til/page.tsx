"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Lightbulb, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, useDateFormat, ConfirmDialog, useFailureToast } from "@/components/common";
import { useJson, sendJson, useInvalidate } from "@/hooks/use-json";
import type { TilDTO } from "@/lib/til";
import { TilDialog } from "@/components/learning/TilDialog";

export default function TilPage() {
  const t = useTranslations("Learning");
  const { data, loading } = useJson<{ notes: TilDTO[] }>("/api/til");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const format = useDateFormat();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<TilDTO | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : data?.notes.length === 0 ? (
        <Card className="flex h-40 flex-col items-center justify-center text-center">
          <Lightbulb className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">{t("noTil")}</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.notes.map((note) => (
            <Card key={note.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{format(note.date)}</span>
                  {note.source && (
                    <a
                      href={note.source}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      Source <ExternalLink className="h-3 w-3" />
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
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => setDeletingId(note.id)}
                  >
                    Delete
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
