import { z } from "zod";
import { isDateKey, type DateKey } from "@/lib/date";

export const BOOK_STATUSES = ["want-to-read", "reading", "finished"] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];

export const bookSchema = z.object({
  title: z.string().trim().min(1, "required").max(200, "tooLong"),
  author: z.string().trim().max(200, "tooLong").nullish(),
  totalPages: z.number().int().min(1, "positive").max(99999, "tooLarge").nullish(),
  status: z.enum(BOOK_STATUSES),
});
export type BookInput = z.infer<typeof bookSchema>;

export const bookPatchSchema = z.object({
  title: z.string().trim().min(1, "required").max(200, "tooLong").optional(),
  author: z.string().trim().max(200, "tooLong").nullish(),
  totalPages: z.number().int().min(1, "positive").max(99999, "tooLarge").nullish(),
  currentPage: z.number().int().min(0).max(99999, "tooLarge").optional(),
  status: z.enum(BOOK_STATUSES).optional(),
  rating: z.number().int().min(1).max(5).nullish(),
  review: z.string().trim().max(5000, "tooLong").nullish(),
  startDate: z.string().refine(isDateKey, "invalidDate").nullish(),
  finishDate: z.string().refine(isDateKey, "invalidDate").nullish(),
});

export type BookDTO = {
  id: string;
  title: string;
  author: string | null;
  totalPages: number | null;
  currentPage: number;
  status: BookStatus;
  rating: number | null;
  review: string | null;
  startDate: DateKey | null;
  finishDate: DateKey | null;
};

export function serializeBook(book: {
  id: string;
  title: string;
  author: string | null;
  totalPages: number | null;
  currentPage: number;
  status: string;
  rating: number | null;
  review: string | null;
  startDate: Date | null;
  finishDate: Date | null;
}): BookDTO {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    totalPages: book.totalPages,
    currentPage: book.currentPage,
    status: book.status as BookStatus,
    rating: book.rating,
    review: book.review,
    startDate: book.startDate?.toISOString().slice(0, 10) ?? null,
    finishDate: book.finishDate?.toISOString().slice(0, 10) ?? null,
  };
}

export function readingProgress(book: BookDTO): number | null {
  if (!book.totalPages || book.totalPages === 0) return null;
  return Math.min(1, book.currentPage / book.totalPages);
}
