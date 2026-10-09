import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { serverError, unauthorized } from "@/lib/api";
import { getExerciseRecords } from "@/lib/workout-records";

/**
 * GET /api/workout/records - personal records per exercise.
 *
 * The user id comes from the session only; there is deliberately no user
 * parameter on this route.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    return NextResponse.json({ records: await getExerciseRecords(user.id) });
  } catch (error) {
    return serverError(error);
  }
}
