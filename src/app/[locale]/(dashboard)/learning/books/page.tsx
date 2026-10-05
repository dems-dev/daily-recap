"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, ConfirmDialog, useFailureToast } from "@/components/common";
import { useJson, sendJson, useInvalidate } from "@/hooks/use-json";
import { type BookDTO, readingProgress } from "@/lib/books";
import { BookDialog } from "@/components/learning/BookDialog";
import { Progress } from "@/components/ui/progress";

export default function BooksPage() {
  const t = useTranslations("Learning");
  const { data, loading } = useJson<{ books: BookDTO[] }>("/api/books");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookDTO | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await sendJson(`/api/books/${deletingId}`, "DELETE");
      invalidate();
    } catch (err) {
      onFail(err);
    }
  };

  const reading = data?.books.filter((b) => b.status === "reading") ?? [];
  const wantToRead = data?.books.filter((b) => b.status === "want-to-read") ?? [];
  const finished = data?.books.filter((b) => b.status === "finished") ?? [];

  const renderBook = (book: BookDTO) => {
    const progress = readingProgress(book);
    return (
      <Card key={book.id} className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg leading-tight">{book.title}</CardTitle>
          <div className="text-sm text-muted-foreground">{book.author ?? "Unknown Author"}</div>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          {book.status === "reading" && progress !== null && (
            <div className="space-y-2 mt-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(progress * 100)}%</span>
                <span>
                  {book.currentPage} / {book.totalPages}
                </span>
              </div>
              <Progress value={progress * 100} className="h-2" />
            </div>
          )}
          {book.status === "finished" && book.rating && (
            <div className="flex items-center gap-1 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < book.rating! ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
                />
              ))}
            </div>
          )}
          {book.status === "finished" && book.review && (
            <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{book.review}</p>
          )}
        </CardContent>
        <CardFooter className="flex gap-2 pt-0 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingBook(book);
              setDialogOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeletingId(book.id)}
          >
            Delete
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader title={t("booksTitle")}>
        <Button
          onClick={() => {
            setEditingBook(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("addBook")}
        </Button>
      </PageHeader>

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : data?.books.length === 0 ? (
        <Card className="flex h-40 flex-col items-center justify-center text-center">
          <BookOpen className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">{t("noBooks")}</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {reading.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="default">Reading</Badge>
                <h2 className="text-xl font-semibold">{t("reading")}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{reading.map(renderBook)}</div>
            </section>
          )}

          {wantToRead.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Up Next</Badge>
                <h2 className="text-xl font-semibold">{t("wantToRead")}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{wantToRead.map(renderBook)}</div>
            </section>
          )}

          {finished.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Finished</Badge>
                <h2 className="text-xl font-semibold">{t("finished")}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{finished.map(renderBook)}</div>
            </section>
          )}
        </div>
      )}

      <BookDialog open={dialogOpen} onOpenChange={setDialogOpen} book={editingBook} />
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title={t("deleteBookTitle")}
        description={t("deleteBookDesc")}
        onConfirm={handleDelete}
      />
    </div>
  );
}
