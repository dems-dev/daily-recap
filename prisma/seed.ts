/**
 * Demo data: ~90 days of realistic life-tracking for demo@dailyrecap.com / demo1234.
 * Deterministic (seeded PRNG) and idempotent — re-running resets only the demo user's data.
 *
 * Patterns are built in on purpose so the analytics have something to find:
 * mood follows how many habits were kept, low-mood days bring impulse spending,
 * Saturdays are shopping days and Tuesdays are the most productive.
 */
import { PrismaClient, type Prisma } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import {
  DEFAULT_TIMEZONE,
  addDays,
  dateKeyToDate,
  dayBoundsInTz,
  monthKeyOf,
  parseMonthKey,
  shiftMonth,
  todayKey,
} from '../src/lib/date'

const prisma = new PrismaClient()
const DAYS = 90

// mulberry32 — small deterministic PRNG
let seed = 20260925
function rand() {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const chance = (p: number) => rand() < p
const between = (min: number, max: number) => min + rand() * (max - min)
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]
const roundTo = (x: number, step: number) => Math.round(x / step) * step

const MOODS = ['terrible', 'bad', 'okay', 'good', 'great'] as const

const HABITS = [
  { name: 'Minum 8 gelas air', icon: '💧', p: 0.85 },
  { name: 'Olahraga 30 menit', icon: '🏃', p: 0.5 },
  { name: 'Baca buku 20 halaman', icon: '📚', p: 0.6 },
  { name: 'Meditasi', icon: '🧘', p: 0.45 },
]

const TODO_TITLES = [
  'Balas email klien', 'Review pull request', 'Siapkan slide meeting', 'Bayar tagihan listrik', 'Beli sayur',
  'Telepon ibu', 'Update laporan mingguan', 'Rapikan meja kerja', 'Belajar Next.js', 'Servis motor',
  'Kirim invoice', 'Cuci baju', 'Jadwalkan dokter gigi', 'Perpanjang SIM', 'Riset liburan akhir tahun',
  'Tulis blog post', 'Beli kado ulang tahun', 'Backup laptop', 'Bersihkan kulkas', 'Rencanakan menu minggu depan',
]

const REFLECTIONS: Record<(typeof MOODS)[number], string[]> = {
  great: [
    'Hari yang sangat produktif. Semua tugas penting selesai dan masih sempat olahraga sore.',
    'Senang sekali hari ini — presentasi berjalan lancar dan dapat masukan positif.',
    'Pagi lari, siang fokus kerja, malam ngobrol lama dengan keluarga. Hari yang lengkap.',
  ],
  good: [
    'Hari yang cukup baik. Kerjaan lancar walau ada sedikit revisi.',
    'Berhasil menjaga kebiasaan pagi. Energi terasa lebih stabil.',
    'Makan siang bareng teman lama, jadi semangat lagi.',
  ],
  okay: [
    'Biasa saja. Banyak meeting, sedikit waktu untuk kerja fokus.',
    'Agak lelah, tapi tugas utama tetap selesai.',
    'Hari yang datar. Besok mau mulai lebih pagi.',
  ],
  bad: [
    'Kurang tidur dan jadi mudah terdistraksi. Sempat belanja online yang sebenarnya tidak perlu.',
    'Deadline menumpuk, rasanya kewalahan. Perlu atur prioritas lebih baik.',
    'Hari yang berat. Lupa minum air dan tidak sempat olahraga.',
  ],
  terrible: [
    'Hari yang buruk. Semua terasa berantakan, akhirnya pesan makanan mahal untuk menghibur diri.',
    'Capek sekali secara mental. Besok harus lebih pelan-pelan.',
  ],
}

const GRATITUDE = [
  'Kopi pagi', 'Keluarga sehat', 'Cuaca cerah', 'Teman yang suportif', 'Bisa olahraga', 'Makan enak',
  'Kerjaan selesai tepat waktu', 'Tidur nyenyak', 'Obrolan hangat dengan pasangan', 'Buku bagus',
]

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

  // Reset the demo user's data so the seed can be re-run.
  const where = { where: { userId: user.id } }
  await prisma.finance.deleteMany(where)
  await prisma.recurringTransaction.deleteMany(where)
  await prisma.budget.deleteMany(where)
  await prisma.savingsGoal.deleteMany(where)
  await prisma.workout.deleteMany(where)
  await prisma.todo.deleteMany(where)
  await prisma.habit.deleteMany(where)
  await prisma.journal.deleteMany(where)

  const tz = user.timezone
  const today = todayKey(tz)
  const start = addDays(today, -(DAYS - 1))
  /** A real instant at local hour `h` on calendar day `key`. */
  const at = (key: string, h: number) => new Date(dayBoundsInTz(key, tz).start.getTime() + h * 3_600_000)

  // Habits, created on the first day.
  const habits = []
  for (const h of HABITS) {
    habits.push({ ...h, row: await prisma.habit.create({ data: { userId: user.id, name: h.name, icon: h.icon, createdAt: at(start, 8) } }) })
  }

  // Rent as a recurring rule (materialized the first time finance data is read).
  const rentAnchor = `${shiftMonth(monthKeyOf(start), 0)}-02`
  await prisma.recurringTransaction.create({
    data: {
      userId: user.id, type: 'expense', amount: 2_500_000, category: 'bills', description: 'Sewa kos',
      frequency: 'monthly', anchorDate: dateKeyToDate(rentAnchor), nextDate: dateKeyToDate(rentAnchor),
    },
  })
  await prisma.recurringTransaction.create({
    data: {
      userId: user.id, type: 'expense', amount: 186_000, category: 'bills', description: 'Internet rumah',
      frequency: 'monthly', anchorDate: dateKeyToDate(`${monthKeyOf(start)}-10`), nextDate: dateKeyToDate(`${monthKeyOf(start)}-10`),
    },
  })

  const finances: Prisma.FinanceCreateManyInput[] = []
  const habitLogs: { habitId: string; date: Date; completed: boolean; createdAt: Date; updatedAt: Date }[] = []
  const todos: Prisma.TodoCreateManyInput[] = []
  const journals: Prisma.JournalCreateManyInput[] = []

  for (let day = start; day <= today; day = addDays(day, 1)) {
    const date = dateKeyToDate(day)
    const weekday = date.getUTCDay()
    const isWeekend = weekday === 0 || weekday === 6
    const isToday = day === today

    // Habits (today: only the morning ones so far)
    let kept = 0
    for (const h of habits) {
      const p = h.name.startsWith('Olahraga') && isWeekend ? h.p + 0.2 : h.p
      if ((!isToday || h.icon === '💧') && chance(p)) {
        kept++
        habitLogs.push({ habitId: h.row.id, date, completed: true, createdAt: at(day, 20), updatedAt: at(day, 20) })
      }
    }
    const habitScore = kept / habits.length

    // Mood follows habits, with noise and a small weekend lift.
    const moodScore = Math.max(1, Math.min(5, Math.round(1.6 + 3 * habitScore + between(-0.9, 0.9) + (isWeekend ? 0.4 : 0))))
    const mood = MOODS[moodScore - 1]

    // Money
    const tx = (type: 'income' | 'expense', amount: number, category: string, description: string, hour: number) =>
      finances.push({ userId: user.id, type, amount, category, description, date, createdAt: at(day, hour), updatedAt: at(day, hour) })

    if (day.endsWith('-01')) tx('income', 12_500_000, 'salary', 'Gaji bulanan', 9)
    if (day.endsWith('-15') && chance(0.7)) tx('income', roundTo(between(1_000_000, 3_500_000), 50_000), 'freelance', 'Proyek desain web', 16)
    tx('expense', roundTo(between(25_000, 60_000), 1_000), 'food', pick(['Makan siang', 'Nasi padang', 'Bakso', 'Makan siang kantor']), 12)
    if (chance(0.55)) tx('expense', roundTo(between(18_000, 35_000), 1_000), 'food', pick(['Kopi susu', 'Kopi', 'Es kopi']), 10)
    if (chance(0.6)) tx('expense', roundTo(between(30_000, 90_000), 1_000), 'food', 'Makan malam', 19)
    if (!isWeekend && chance(0.7)) tx('expense', roundTo(between(15_000, 45_000), 1_000), 'transport', pick(['Gojek ke kantor', 'Bensin', 'KRL']), 8)
    if (weekday === 6) tx('expense', roundTo(between(250_000, 650_000), 5_000), 'shopping', pick(['Belanja bulanan', 'Belanja baju', 'Supermarket']), 14)
    if (weekday === 0 && chance(0.5)) tx('expense', roundTo(between(60_000, 180_000), 5_000), 'entertainment', pick(['Nonton bioskop', 'Karaoke', 'Main game']), 17)
    if (moodScore <= 2 && chance(0.7)) tx('expense', roundTo(between(150_000, 450_000), 5_000), pick(['shopping', 'food', 'entertainment']), pick(['Belanja online', 'Pesan makanan', 'Beli game']), 21)
    if (chance(0.06)) tx('expense', roundTo(between(50_000, 250_000), 5_000), 'health', pick(['Obat', 'Vitamin', 'Dokter']), 11)

    // Tasks: Tuesdays are the productive day.
    const done = Math.max(0, Math.round((weekday === 2 ? between(4, 7) : between(0.5, 3.5)) * (isWeekend ? 0.5 : 1)))
    for (let i = 0; i < done; i++) {
      const hour = 9 + i * 2
      if (isToday && hour > 13) break
      todos.push({
        userId: user.id, title: pick(TODO_TITLES), priority: pick(['high', 'medium', 'low', null]),
        category: pick(['work', 'work', 'personal', 'errands']), isCompleted: true,
        completedAt: at(day, hour), dueDate: chance(0.5) ? date : null, createdAt: at(addDays(day, -1), 18),
      })
    }

    // Journal on ~80% of past days; today is left empty so the recap prompt shows.
    if (!isToday && chance(0.82)) {
      journals.push({
        userId: user.id, date, mood,
        content: pick(REFLECTIONS[mood]),
        gratitude: JSON.stringify(Array.from({ length: 1 + Math.floor(rand() * 3) }, () => pick(GRATITUDE)).filter((g, i, a) => a.indexOf(g) === i)),
        tags: JSON.stringify(isWeekend ? ['akhir-pekan'] : ['kerja']),
        createdAt: at(day, 21), updatedAt: at(day, 21),
      })
    }
  }

  // Open tasks: overdue, today, upcoming.
  todos.push(
    { userId: user.id, title: 'Perpanjang STNK', priority: 'high', category: 'errands', dueDate: dateKeyToDate(addDays(today, -2)), createdAt: at(addDays(today, -6), 9) },
    { userId: user.id, title: 'Meeting client', priority: 'high', category: 'work', dueDate: dateKeyToDate(today), createdAt: at(addDays(today, -1), 9) },
    { userId: user.id, title: 'Beli sayur', priority: 'medium', category: 'errands', createdAt: at(today, 7) },
    { userId: user.id, title: 'Siapkan materi presentasi', priority: 'medium', category: 'work', dueDate: dateKeyToDate(addDays(today, 2)), createdAt: at(today, 8) },
    { userId: user.id, title: 'Booking tiket mudik', priority: 'low', category: 'personal', dueDate: dateKeyToDate(addDays(today, 10)), createdAt: at(today, 8) },
  )

  await prisma.finance.createMany({ data: finances })
  await prisma.habitLog.createMany({ data: habitLogs })
  await prisma.todo.createMany({ data: todos })
  await prisma.journal.createMany({ data: journals })

  const { year, month } = parseMonthKey(monthKeyOf(today))
  await prisma.budget.createMany({
    data: [
      { userId: user.id, category: 'food', amount: 3_000_000, month, year },
      { userId: user.id, category: 'shopping', amount: 1_500_000, month, year },
      { userId: user.id, category: 'entertainment', amount: 400_000, month, year },
      { userId: user.id, category: 'transport', amount: 600_000, month, year },
    ],
  })

  await prisma.savingsGoal.createMany({
    data: [
      { userId: user.id, name: 'Dana darurat', targetAmount: 30_000_000, currentAmount: 12_750_000, deadline: dateKeyToDate(`${year + 1}-06-30`) },
      { userId: user.id, name: 'Laptop baru', targetAmount: 18_000_000, currentAmount: 4_200_000, deadline: dateKeyToDate(`${year}-12-31`) },
    ],
  })

  console.log(
    `Seeded ${DAYS} days: ${finances.length} transactions, ${habitLogs.length} habit check-ins, ${todos.length} tasks, ${journals.length} journal entries.`
  )
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
