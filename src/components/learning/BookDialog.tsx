"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { FieldError, useFailureToast } from "@/components/common";
import { sendJson, useInvalidate } from "@/hooks/use-json";
import { bookSchema, bookPatchSchema, type BookDTO } from "@/lib/books";

export function BookDialog({
  open,
  onOpenChange,
  book,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book?: BookDTO | null;
}) {
  const t = useTranslations("Learning");
  const tc = useTranslations("Common");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const schema = book ? bookPatchSchema : bookSchema;
  type FormValues = Partial<BookDTO>;

  const { register, control, handleSubmit, reset, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema as typeof bookSchema) as unknown as Resolver<FormValues>,
  });

  const status = useWatch({ control, name: "status" });

  useEffect(() => {
    if (open) {
      reset(
        book
          ? { ...book }
          : { title: "", author: "", totalPages: undefined, currentPage: 0, status: "want-to-read" }
      );
    }
  }, [open, book, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (book) await sendJson(`/api/books/${book.id}`, "PATCH", values);
      else await sendJson("/api/books", "POST", values);
      toast.add({ title: tc("saved"), type: "success" });
      onOpenChange(false);
      invalidate();
    } catch (err) {
      onFail(err);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{book ? t("editBook") : t("addBook")}</DialogTitle>
        </DialogHeader>
        <form id="book-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="book-title">{t("bookTitle")}</Label>
            <Input id="book-title" autoFocus aria-invalid={!!formState.errors.title} {...register("title")} />
            <FieldError message={formState.errors.title?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="book-author">{t("author")}</Label>
            <Input id="book-author" aria-invalid={!!formState.errors.author} {...register("author")} />
            <FieldError message={formState.errors.author?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="book-status">{t("status")}</Label>
              <Select value={status} onValueChange={(val: string | null) => val && setValue("status", val as BookDTO["status"])}>
                <SelectTrigger id="book-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="want-to-read">{t("wantToRead")}</SelectItem>
                  <SelectItem value="reading">{t("reading")}</SelectItem>
                  <SelectItem value="finished">{t("finished")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="book-total">{t("totalPages")}</Label>
              <Input
                id="book-total"
                type="number"
                aria-invalid={!!formState.errors.totalPages}
                {...register("totalPages", { valueAsNumber: true })}
              />
              <FieldError message={formState.errors.totalPages?.message} />
            </div>
          </div>

          {status === "reading" && book && (
            <div className="space-y-2">
              <Label htmlFor="book-current">{t("currentPage")}</Label>
              <Input
                id="book-current"
                type="number"
                aria-invalid={!!formState.errors.currentPage}
                {...register("currentPage", { valueAsNumber: true })}
              />
              <FieldError message={formState.errors.currentPage?.message} />
            </div>
          )}

          {status === "finished" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="book-rating">{t("rating")}</Label>
                <Select
                  value={formState.defaultValues?.rating?.toString()}
                  onValueChange={(val) => setValue("rating", Number(val))}
                >
                  <SelectTrigger id="book-rating">
                    <SelectValue placeholder="1-5 stars" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <SelectItem key={r} value={r.toString()}>
                        {r} Star{r > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="book-review">{t("review")}</Label>
                <Textarea id="book-review" aria-invalid={!!formState.errors.review} {...register("review")} />
                <FieldError message={formState.errors.review?.message} />
              </div>
            </>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button type="submit" form="book-form" disabled={formState.isSubmitting}>
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
