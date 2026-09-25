import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api";
import { dateToKey, todayKey } from "@/lib/date";
import { toCsv } from "@/lib/csv";

/**
 * Download your data: GET /api/me/export?format=json (everything)
 * or ?format=csv (transactions, for spreadsheets).
 */
export async function GET(req: Request) {
  try {
    const current = await getCurrentUser();
    if (!current) return unauthorized();

    const format = new URL(req.url).searchParams.get("format") ?? "json";
    if (format !== "json" && format !== "csv") return badRequest("Invalid format");
    const stamp = todayKey(current.timezone);

    if (format === "csv") {
      const rows = await prisma.finance.findMany({ where: { userId: current.id }, orderBy: { date: "asc" } });
      const csv = toCsv(
        ["date", "type", "amount", "category", "description", "recurring"],
        rows.map((f) => [dateToKey(f.date), f.type, f.amount, f.category, f.description, f.recurringId ? "yes" : "no"])
      );
      return new NextResponse("﻿" + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="daily-recap-transactions-${stamp}.csv"`,
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: current.id },
      include: {
        finances: true,
        recurringTransactions: true,
        budgets: true,
        savingsGoals: true,
        todos: true,
        habits: { include: { logs: true } },
        journals: true,
        goals: { include: { milestones: true } },
        workouts: { include: { exercises: true } },
        meals: true,
        sleepLogs: true,
        waterLogs: true,
        bodyMetrics: true,
        meditationLogs: true,
        pomodoroSessions: true,
        books: true,
        skills: { include: { sessions: true } },
        tilNotes: true,
      },
    });
    if (!user) return notFound();
    const { password: _password, ...profile } = user;
    void _password; // never exported

    const body = JSON.stringify(
      { exportedAt: new Date().toISOString(), app: "daily-recap", version: 1, user: profile },
      null,
      2
    );
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="daily-recap-export-${stamp}.json"`,
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
