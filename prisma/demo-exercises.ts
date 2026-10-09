/**
 * Demo exercises for the demo account, derived from the workout itself so the
 * seed and the production backfill (scripts/backfill-demo-exercises.ts) produce
 * exactly the same rows.
 *
 * Deliberately additive: a workout that already has exercises is left alone, so
 * running this twice changes nothing.
 */
import type { PrismaClient } from '@prisma/client'
import { prepareExercises, type ExerciseInput } from '../src/lib/exercises'

type DemoWorkout = { id: string; name: string; date: Date }

type Block = {
  name: string
  /** Reps per set, heaviest set last. */
  reps: readonly number[]
  /** null for a bodyweight exercise. */
  baseWeight: number | null
  /** Added to the weight (or reps) every other week, so the chart trends up. */
  step: number
}

/** Sessions the demo data logs exercises for; the rest stay cardio-only. */
const TEMPLATES: Readonly<Record<string, readonly Block[]>> = {
  'Push Day': [
    { name: 'Bench Press', reps: [8, 8, 6], baseWeight: 50, step: 2.5 },
    { name: 'Overhead Press', reps: [10, 8, 8], baseWeight: 30, step: 2.5 },
    { name: 'Push Up', reps: [20, 18, 15], baseWeight: null, step: 1 },
  ],
  'Pull Day': [
    { name: 'Barbell Row', reps: [10, 8, 8], baseWeight: 40, step: 2.5 },
    { name: 'Lat Pulldown', reps: [12, 10, 10], baseWeight: 35, step: 2.5 },
    { name: 'Pull Up', reps: [8, 7, 6], baseWeight: null, step: 1 },
  ],
  'Leg Day': [
    { name: 'Squat', reps: [8, 6, 5], baseWeight: 70, step: 5 },
    { name: 'Romanian Deadlift', reps: [10, 8, 8], baseWeight: 55, step: 2.5 },
    { name: 'Leg Press', reps: [12, 12, 10], baseWeight: 90, step: 5 },
  ],
  HIIT: [{ name: 'Burpee', reps: [15, 15, 12], baseWeight: null, step: 1 }],
}

/** Every other week adds one `step`, so progress is visible but not absurd. */
const progression = (weekIndex: number) => Math.floor(weekIndex / 2)

export function demoExercisesFor(workout: DemoWorkout, weekIndex: number): ExerciseInput[] {
  const blocks = TEMPLATES[workout.name]
  if (!blocks) return []

  const bump = progression(weekIndex)
  return blocks.map((block) => ({
    name: block.name,
    sets: block.reps.map((reps, index) => {
      const isLast = index === block.reps.length - 1
      if (block.baseWeight === null) return { reps: reps + bump, weight: null }
      // The last set is the heavy one, so it carries one extra step.
      return { reps, weight: block.baseWeight + bump * block.step + (isLast ? block.step : 0) }
    }),
  }))
}

/**
 * Adds the demo exercises to the demo user's existing workouts. Never deletes,
 * never rewrites a workout that already has exercises.
 */
export async function addDemoExercises(
  prisma: PrismaClient,
  userId: string,
  options: { dryRun?: boolean } = {}
) {
  const workouts = await prisma.workout.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
    select: { id: true, name: true, date: true, _count: { select: { exercises: true } } },
  })

  const first = workouts[0]?.date
  let touched = 0
  let created = 0
  let skipped = 0

  for (const workout of workouts) {
    const inputs = demoExercisesFor(workout, weekIndexOf(workout.date, first))
    if (!inputs.length) continue
    if (workout._count.exercises > 0) {
      skipped += 1
      continue
    }

    const rows = prepareExercises(userId, inputs).map((exercise) => ({
      workoutId: workout.id,
      userId: exercise.userId,
      name: exercise.name,
      canonicalName: exercise.canonicalName,
      sets: exercise.sets,
      order: exercise.order,
      bestWeight: exercise.bestWeight,
      bestWeightReps: exercise.bestWeightReps,
      bestOneRm: exercise.bestOneRm,
      bestReps: exercise.bestReps,
    }))

    if (!options.dryRun) await prisma.exercise.createMany({ data: rows })
    touched += 1
    created += rows.length
  }

  return { workouts: workouts.length, touched, created, skipped }
}

function weekIndexOf(date: Date, first: Date | undefined) {
  if (!first) return 0
  const days = Math.floor((date.getTime() - first.getTime()) / 86_400_000)
  return Math.max(0, Math.floor(days / 7))
}
