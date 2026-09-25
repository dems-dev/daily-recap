import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export function notFound() {
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}

export function badRequest(message = "Bad request") {
  return NextResponse.json({ message }, { status: 400 });
}

export function validationError(error: ZodError) {
  return NextResponse.json(
    { message: "Validation failed", errors: error.flatten().fieldErrors },
    { status: 400 }
  );
}

export function serverError(error: unknown) {
  console.error(error);
  return NextResponse.json({ message: "Internal server error" }, { status: 500 });
}

/** Request JSON body, or undefined when it is missing or malformed. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
