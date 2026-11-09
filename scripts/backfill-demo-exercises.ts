/**
 * Adds the demo exercises to the demo account's existing workout sessions, so
 * Rekor Pribadi has something to show. Separate from `prisma db seed` on
 * purpose: the seed resets the demo user's data, this one only ever inserts.
 *
 *   npx tsx scripts/backfill-demo-exercises.ts            # dry run, prints what it would add
 *   npx tsx scripts/backfill-demo-exercises.ts --apply    # writes
 *
 * It is idempotent: a workout that already has exercises is skipped, nothing is
 * ever deleted or overwritten. `DATABASE_URL` decides which database is hit, so
 * check the host it prints before passing --apply.
 */
import { PrismaClient } from "@prisma/client";
import { addDemoExercises } from "../prisma/demo-exercises";

const DEMO_EMAIL = "demo@dailyrecap.com";

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const host = new URL(url.replace(/^postgres(ql)?:/, "https:")).host;
  console.log(`${apply ? "APPLY" : "DRY RUN"} against ${host}`);

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL }, select: { id: true } });
    if (!user) throw new Error(`no ${DEMO_EMAIL} account in this database`);

    const before = await prisma.exercise.count({ where: { userId: user.id } });
    const result = await addDemoExercises(prisma, user.id, { dryRun: !apply });
    const after = await prisma.exercise.count({ where: { userId: user.id } });

    console.log(
      `workouts: ${result.workouts} | sessions filled: ${result.touched} | exercises ${
        apply ? "created" : "to create"
      }: ${result.created} | already had exercises (skipped): ${result.skipped}`
    );
    console.log(`exercise rows for the demo user: ${before} -> ${after}`);
    if (!apply) console.log("Nothing was written. Re-run with --apply to write.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
