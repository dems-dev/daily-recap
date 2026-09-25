import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { DEFAULT_TIMEZONE, dateKeyToDate, monthKeyOf, parseMonthKey, todayKey } from '../src/lib/date'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('demo1234', 10)

  const user = await prisma.user.upsert({
    where: { email: 'demo@dailyrecap.com' },
    update: {},
    create: {
      email: 'demo@dailyrecap.com',
      name: 'Demo User',
      password: hashedPassword,
      locale: 'id',
      currency: 'IDR',
      timezone: DEFAULT_TIMEZONE,
      weekStartDay: 'monday',
      theme: 'system',
    },
  })

  console.log(`Demo user ready: ${user.email}`)

  // Reset the demo user's data so the seed can be re-run without duplicates.
  await Promise.all([
    prisma.finance.deleteMany({ where: { userId: user.id } }),
    prisma.budget.deleteMany({ where: { userId: user.id } }),
    prisma.savingsGoal.deleteMany({ where: { userId: user.id } }),
    prisma.workout.deleteMany({ where: { userId: user.id } }),
    prisma.todo.deleteMany({ where: { userId: user.id } }),
  ])

  // Calendar dates are stored as UTC midnight of the user's local date (see src/lib/date.ts).
  const today = todayKey(user.timezone)
  const month = monthKeyOf(today)
  const { year, month: monthNum } = parseMonthKey(month)
  const day = (d: number) => dateKeyToDate(`${month}-${String(Math.min(d, Number(today.slice(8)))).padStart(2, '0')}`)

  await prisma.finance.createMany({
    data: [
      { userId: user.id, type: 'income', amount: 15000000, category: 'salary', description: 'Gaji bulanan', date: day(1) },
      { userId: user.id, type: 'expense', amount: 2500000, category: 'bills', description: 'Sewa kos', date: day(2) },
      { userId: user.id, type: 'expense', amount: 350000, category: 'transport', description: 'Bensin & tol', date: day(5) },
      { userId: user.id, type: 'expense', amount: 420000, category: 'shopping', description: 'Belanja bulanan', date: day(8) },
      { userId: user.id, type: 'expense', amount: 150000, category: 'entertainment', description: 'Nonton', date: day(12) },
      { userId: user.id, type: 'expense', amount: 85000, category: 'food', description: 'Makan malam', date: day(15) },
      { userId: user.id, type: 'income', amount: 1200000, category: 'freelance', description: 'Proyek desain', date: day(18) },
      { userId: user.id, type: 'expense', amount: 50000, category: 'food', description: 'Makan siang', date: day(31) },
    ],
  })

  await prisma.budget.createMany({
    data: [
      { userId: user.id, category: 'food', amount: 3000000, month: monthNum, year },
      { userId: user.id, category: 'entertainment', amount: 100000, month: monthNum, year },
    ],
  })

  await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      name: 'Dana darurat',
      targetAmount: 20000000,
      currentAmount: 6500000,
      deadline: dateKeyToDate(`${year + 1}-06-30`),
    },
  })

  const workout = await prisma.workout.create({
    data: {
      userId: user.id,
      name: 'Push Day',
      type: 'Strength',
      duration: 60,
      date: dateKeyToDate(today),
    },
  })

  await prisma.exercise.create({
    data: {
      workoutId: workout.id,
      name: 'Bench Press',
      sets: JSON.stringify([{ reps: 10, weight: 60 }, { reps: 8, weight: 65 }]),
      order: 1,
    },
  })

  await prisma.todo.createMany({
    data: [
      { userId: user.id, title: 'Beli sayur', category: 'errands', priority: 'medium' },
      { userId: user.id, title: 'Meeting client', category: 'work', priority: 'high', dueDate: dateKeyToDate(today) },
    ],
  })

  console.log('Dummy data seeded!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
