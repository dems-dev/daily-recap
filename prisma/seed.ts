/**
 * Demo data: ~90 days of realistic life-tracking for demo@dailyrecap.com / demo1234.
 * Deterministic (seeded PRNG) and idempotent — re-running resets only the demo user's data.
 *
 * Patterns are built in on purpose so the analytics have something to find:
 * mood follows how many habits were kept, low-mood days bring impulse spending,
 * Saturdays are shopping days and Tuesdays are the most productive; short nights
 * lower the next day's mood and output.
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
import { sleepWindow } from '../src/lib/sleep'
import { periodRange } from '../src/lib/recap'

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

// ---- Extended demo pools (so every page has rich examples) ----
// [name, calories, protein(g), carbs(g), fat(g)]
const BREAKFASTS: [string, number, number, number, number][] = [
  ['Nasi uduk + telur', 450, 14, 60, 16], ['Bubur ayam', 380, 16, 55, 9],
  ['Roti bakar + kopi', 320, 9, 42, 12], ['Oatmeal + pisang', 300, 10, 52, 6],
  ['Lontong sayur', 420, 11, 58, 15],
]
const LUNCHES: [string, number, number, number, number][] = [
  ['Ayam bakar + nasi', 620, 45, 70, 18], ['Nasi padang', 780, 32, 85, 34],
  ['Gado-gado', 480, 18, 48, 24], ['Soto ayam + nasi', 520, 28, 62, 16],
  ['Mie ayam bakso', 560, 24, 72, 18],
]
const DINNERS: [string, number, number, number, number][] = [
  ['Pecel lele + nasi', 650, 38, 66, 26], ['Capcay + nasi', 430, 20, 55, 14],
  ['Sate ayam + lontong', 590, 36, 58, 22], ['Ikan goreng + sayur', 480, 34, 40, 18],
  ['Tumis brokoli + ayam', 410, 40, 28, 15],
]
const SNACKS: [string, number, number, number, number][] = [
  ['Kopi susu', 180, 4, 22, 8], ['Pisang goreng', 220, 3, 34, 9],
  ['Yogurt + granola', 190, 8, 26, 6], ['Buah potong', 110, 2, 26, 1],
]
const FOCUS_LABELS = ['Kerjakan laporan', 'Belajar Next.js', 'Review kode', 'Desain UI', 'Tulis artikel', 'Riset fitur', 'Balas email', 'Perbaiki bug']
const POMO_CATS = ['work', 'work', 'study', 'side-project', 'creative'] as const
const WORKOUT_NAMES = ['Morning Run', 'Push Day', 'Leg Day', 'Pull Day', 'Bersepeda', 'Renang', 'HIIT', 'Yoga flow', 'Jalan santai']
const WORKOUT_TYPES = ['cardio', 'strength', 'strength', 'cardio', 'sports', 'flexibility'] as const
const MED_TYPES = ['guided', 'breathing', 'silent', 'body-scan', 'yoga'] as const
const TIL_NOTES: { content: string; tags: string[]; source?: string }[] = [
  { content: 'useMemo hanya menghitung ulang saat dependensinya berubah — pakai untuk kalkulasi mahal, bukan semuanya.', tags: ['react', 'performa'] },
  { content: 'Di PostgreSQL, index parsial bisa mempercepat query untuk subset baris yang sering diakses.', tags: ['database', 'sql'] },
  { content: 'CSS gap bekerja di flexbox, bukan cuma grid. Tidak perlu margin lagi untuk jarak antar item.', tags: ['css'] },
  { content: 'Teknik Pomodoro: 25 menit fokus, 5 menit istirahat. Setelah 4 siklus, istirahat panjang 15-30 menit.', tags: ['produktivitas'] },
  { content: 'Protein ~1.6–2.0 g/kg berat badan membantu menjaga massa otot saat defisit kalori.', tags: ['kesehatan', 'nutrisi'] },
  { content: 'Git: `git restore --staged <file>` untuk unstage tanpa kehilangan perubahan.', tags: ['git'] },
  { content: 'Tidur 7–9 jam meningkatkan konsolidasi memori dan mood keesokan harinya.', tags: ['kesehatan', 'tidur'] },
  { content: 'Next.js App Router: Server Components default; tambahkan "use client" hanya saat butuh interaktivitas.', tags: ['nextjs', 'react'], source: 'https://nextjs.org/docs' },
  { content: 'Aturan 50/30/20 untuk budget: 50% kebutuhan, 30% keinginan, 20% tabungan.', tags: ['keuangan'] },
  { content: 'Latihan beban progresif: naikkan beban/repetisi sedikit tiap minggu untuk terus berkembang.', tags: ['kesehatan', 'olahraga'] },
  { content: 'Bahasa Inggris: "a lot" selalu dua kata. "alot" bukan kata yang benar.', tags: ['bahasa', 'inggris'] },
  { content: 'Debounce input pencarian ~300ms untuk mengurangi request yang tidak perlu.', tags: ['react', 'performa'] },
]

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
  await prisma.sleepLog.deleteMany(where)
  await prisma.weeklyPriority.deleteMany(where)
  await prisma.wishlistItem.deleteMany(where)
  await prisma.waterLog.deleteMany(where)
  await prisma.meal.deleteMany(where)
  await prisma.bodyMetric.deleteMany(where)
  await prisma.meditationLog.deleteMany(where)
  await prisma.pomodoroSession.deleteMany(where)
  await prisma.skill.deleteMany(where)
  await prisma.book.deleteMany(where)
  await prisma.tilNote.deleteMany(where)
  await prisma.goal.deleteMany(where)

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
  const sleeps: Prisma.SleepLogCreateManyInput[] = []
  const waters: Prisma.WaterLogCreateManyInput[] = []
  const meals: Prisma.MealCreateManyInput[] = []
  const pomodoros: Prisma.PomodoroSessionCreateManyInput[] = []
  const workouts: Prisma.WorkoutCreateManyInput[] = []
  const meditations: Prisma.MeditationLogCreateManyInput[] = []
  const bodyMetrics: Prisma.BodyMetricCreateManyInput[] = []
  let dayIdx = 0
  const hhmm = (minutes: number) => {
    const m = ((Math.round(minutes) % 1440) + 1440) % 1440
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  }

  for (let day = start; day <= today; day = addDays(day, 1)) {
    const date = dateKeyToDate(day)
    const weekday = date.getUTCDay()
    const isWeekend = weekday === 0 || weekday === 6
    const isToday = day === today

    // Sleep (the night that ended this morning): ~6h50 on average, longer on weekends, some short nights.
    const shortNight = chance(0.2)
    const sleepMinutes = Math.round(
      shortNight ? between(290, 355) : between(370, 470) + (isWeekend ? 35 : 0)
    )
    if (chance(0.9)) {
      const bedMinute = 23 * 60 + between(-50, shortNight ? 90 : 40)
      const win = sleepWindow(day, hhmm(bedMinute), hhmm(bedMinute + sleepMinutes), tz)
      sleeps.push({
        userId: user.id, date, bedtime: win.bedtime, wakeTime: win.wakeTime, duration: win.duration,
        quality: Math.max(1, Math.min(5, Math.round((sleepMinutes - 240) / 60 + between(-0.8, 0.8)))),
      })
    }
    const sleepEffect = sleepMinutes >= 420 ? 0.5 : sleepMinutes < 360 ? -0.8 : 0

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
    const moodScore = Math.max(1, Math.min(5, Math.round(1.6 + 3 * habitScore + sleepEffect + between(-0.9, 0.9) + (isWeekend ? 0.4 : 0))))
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
    const done = Math.max(0, Math.round((weekday === 2 ? between(4, 7) : between(0.5, 3.5)) * (isWeekend ? 0.5 : 1) * (sleepMinutes < 360 ? 0.55 : 1)))
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

    // Water
    waters.push({ userId: user.id, date, glasses: isToday ? Math.round(between(1, 4)) : Math.round(between(4, 8)), target: 8, createdAt: at(day, 21), updatedAt: at(day, 21) })

    // Meals
    const addMeal = (type: string, m: [string, number, number, number, number], hour: number) =>
      meals.push({ userId: user.id, date, type, name: m[0], calories: m[1], protein: m[2], carbs: m[3], fat: m[4], createdAt: at(day, hour), updatedAt: at(day, hour) })
    if (chance(0.9)) addMeal('breakfast', pick(BREAKFASTS), 7)
    if (!isToday || chance(0.5)) addMeal('lunch', pick(LUNCHES), 12)
    if (!isToday) addMeal('dinner', pick(DINNERS), 19)
    if (chance(0.4)) addMeal('snack', pick(SNACKS), 16)

    // Pomodoro focus sessions on weekdays
    if (!isWeekend) {
      const n = Math.max(0, Math.round((sleepMinutes < 360 ? between(1, 3) : between(2, 5)) * (weekday === 2 ? 1.3 : 1)))
      for (let i = 0; i < n; i++) {
        const hour = 9 + i * 2
        if (isToday && hour > 13) break
        pomodoros.push({ userId: user.id, date, category: pick(POMO_CATS), label: pick(FOCUS_LABELS), duration: 25, isCompleted: true, createdAt: at(day, hour), updatedAt: at(day, hour) })
      }
    }

    // Workout ~3x/week
    if (!isToday && chance(isWeekend ? 0.55 : 0.3)) {
      workouts.push({ userId: user.id, date, name: pick(WORKOUT_NAMES), type: pick(WORKOUT_TYPES), duration: Math.round(between(30, 75)), notes: null, createdAt: at(day, isWeekend ? 8 : 18), updatedAt: at(day, 18) })
    }

    // Meditation ~40%
    if (!isToday && chance(0.4)) {
      meditations.push({ userId: user.id, date, type: pick(MED_TYPES), duration: pick([5, 10, 15, 20]), notes: null, createdAt: at(day, 6), updatedAt: at(day, 6) })
    }

    // Body metrics weekly (weight trending down over the period), plus today.
    if (dayIdx % 7 === 0 || isToday) {
      const prog = dayIdx / DAYS
      bodyMetrics.push({
        userId: user.id, date,
        weight: roundTo(82 - prog * 5 + between(-0.4, 0.4), 0.1),
        bodyFat: roundTo(21 - prog * 3 + between(-0.4, 0.4), 0.1),
        height: 178, notes: null,
        createdAt: at(day, 7), updatedAt: at(day, 7),
      })
    }
    dayIdx++
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
  await prisma.sleepLog.createMany({ data: sleeps })

  // Weekly priorities: past weeks mostly done, this week in progress.
  const PRIORITY_POOL = [
    'Selesaikan laporan bulanan', 'Olahraga 3x', 'Rapikan keuangan', 'Kirim proposal klien', 'Belajar Next.js 1 jam/hari',
    'Telepon orang tua', 'Baca 1 buku', 'Beres-beres kamar', 'Siapkan presentasi', 'Tidur sebelum jam 23',
  ]
  const priorities: Prisma.WeeklyPriorityCreateManyInput[] = []
  for (let d = periodRange('week', start, 'monday').start; d <= today; d = addDays(d, 7)) {
    const week = periodRange('week', d, 'monday')
    const isCurrent = week.start <= today && today <= week.end
    for (let i = 0; i < 3; i++) {
      const isDone = isCurrent ? i === 0 : chance(0.7)
      priorities.push({
        userId: user.id, weekStart: dateKeyToDate(week.start), title: pick(PRIORITY_POOL), order: i,
        isDone, doneAt: isDone ? at(addDays(week.start, 2 + i), 18) : null, createdAt: at(addDays(week.start, -1), 20),
      })
    }
  }
  await prisma.weeklyPriority.createMany({ data: priorities })

  // Wishlist: a couple still waiting, several skipped (money saved), one bought.
  const wish = (name: string, price: number, category: string, addedDaysAgo: number, wait: number, status: string, note?: string) => ({
    userId: user.id, name, price, category, note: note ?? null, status,
    addedOn: dateKeyToDate(addDays(today, -addedDaysAgo)),
    waitUntil: dateKeyToDate(addDays(today, wait - addedDaysAgo)),
    decidedOn: status === 'waiting' ? null : dateKeyToDate(addDays(today, wait - addedDaysAgo)),
  })
  await prisma.wishlistItem.createMany({
    data: [
      wish('Sepatu lari', 850_000, 'shopping', 3, 7, 'waiting', 'Sepatu lama sudah tipis'),
      wish('Keyboard mekanik', 1_250_000, 'shopping', 8, 7, 'waiting', 'Lebih nyaman untuk kerja'),
      wish('Jaket denim', 450_000, 'shopping', 30, 7, 'skipped'),
      wish('Langganan streaming tambahan', 120_000, 'entertainment', 45, 7, 'skipped'),
      wish('Headphone baru', 1_800_000, 'shopping', 60, 14, 'skipped', 'Yang lama masih bagus'),
      wish('Buku desain', 320_000, 'education', 20, 7, 'bought'),
    ],
  })

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

  // Extended modules
  await prisma.waterLog.createMany({ data: waters })
  await prisma.meal.createMany({ data: meals })
  await prisma.pomodoroSession.createMany({ data: pomodoros })
  await prisma.workout.createMany({ data: workouts })
  await prisma.meditationLog.createMany({ data: meditations })
  await prisma.bodyMetric.createMany({ data: bodyMetrics })

  // Skills + practice sessions
  const skillDefs = [
    { name: 'Bahasa Inggris', category: 'Bahasa', level: 'intermediate', sessions: 16 },
    { name: 'React & Next.js', category: 'Programming', level: 'intermediate', sessions: 22 },
    { name: 'Gitar', category: 'Musik', level: 'beginner', sessions: 9 },
  ]
  for (const s of skillDefs) {
    const skill = await prisma.skill.create({ data: { userId: user.id, name: s.name, category: s.category, level: s.level, createdAt: at(start, 9) } })
    const sess: Prisma.SkillSessionCreateManyInput[] = []
    for (let i = 0; i < s.sessions; i++) {
      const d = addDays(today, -Math.floor(rand() * DAYS))
      sess.push({ skillId: skill.id, duration: pick([20, 30, 45, 60]), notes: null, date: dateKeyToDate(d), createdAt: at(d, 20), updatedAt: at(d, 20) })
    }
    await prisma.skillSession.createMany({ data: sess })
  }

  // Books
  const bookDate = (daysAgo: number) => dateKeyToDate(addDays(today, -daysAgo))
  await prisma.book.createMany({
    data: [
      { userId: user.id, title: 'Atomic Habits', author: 'James Clear', status: 'finished', totalPages: 320, currentPage: 320, rating: 5, review: 'Kebiasaan kecil 1% tiap hari berdampak besar. Praktis dan mudah diterapkan.', startDate: bookDate(80), finishDate: bookDate(55) },
      { userId: user.id, title: 'Deep Work', author: 'Cal Newport', status: 'finished', totalPages: 280, currentPage: 280, rating: 4, review: 'Fokus tanpa gangguan adalah keunggulan di era distraksi.', startDate: bookDate(50), finishDate: bookDate(28) },
      { userId: user.id, title: 'The Pragmatic Programmer', author: 'Hunt & Thomas', status: 'reading', totalPages: 352, currentPage: 150, startDate: bookDate(20) },
      { userId: user.id, title: 'Sapiens', author: 'Yuval Noah Harari', status: 'reading', totalPages: 498, currentPage: 210, startDate: bookDate(14) },
      { userId: user.id, title: 'Clean Code', author: 'Robert C. Martin', status: 'want-to-read', totalPages: 464, currentPage: 0 },
    ],
  })

  // TIL notes
  await prisma.tilNote.createMany({
    data: TIL_NOTES.map((n, i) => {
      const d = addDays(today, -(i * 6 + 2))
      return { userId: user.id, content: n.content, tags: JSON.stringify(n.tags), source: n.source ?? null, date: dateKeyToDate(d), createdAt: at(d, 21), updatedAt: at(d, 21) }
    }),
  })

  // Goals + milestones
  const goalDefs: { title: string; description: string; category: string; type: string; target: number; milestones: [string, boolean][] }[] = [
    { title: 'Lari 10K tanpa berhenti', description: 'Latihan lari rutin 3x seminggu menuju 10K.', category: 'health', type: 'short-term', target: 45, milestones: [['Lari 3K', true], ['Lari 5K', true], ['Lari 8K', false], ['Lari 10K', false]] },
    { title: 'Kuasai Next.js 16', description: 'Bangun satu proyek nyata dengan App Router.', category: 'learning', type: 'short-term', target: 25, milestones: [['Selesai dokumentasi dasar', true], ['Bangun fitur auth', true], ['Deploy ke produksi', false]] },
    { title: 'Dana darurat 6 bulan', description: 'Kumpulkan dana darurat setara 6x pengeluaran.', category: 'finance', type: 'long-term', target: 200, milestones: [['Capai 1 bulan', true], ['Capai 3 bulan', false], ['Capai 6 bulan', false]] },
  ]
  for (const g of goalDefs) {
    const goal = await prisma.goal.create({
      data: { userId: user.id, title: g.title, description: g.description, category: g.category, type: g.type, targetDate: dateKeyToDate(addDays(today, g.target)), createdAt: at(addDays(today, -30), 9) },
    })
    await prisma.milestone.createMany({
      data: g.milestones.map(([title, done], i) => ({ goalId: goal.id, title, isCompleted: done, completedAt: done ? at(addDays(today, -20 + i * 3), 18) : null, order: i })),
    })
  }

  console.log(
    `Extended: ${meals.length} meals, ${workouts.length} workouts, ${pomodoros.length} focus sessions, ${meditations.length} meditations, ${bodyMetrics.length} body metrics, ${skillDefs.length} skills, 5 books, ${TIL_NOTES.length} TIL notes, ${goalDefs.length} goals.`
  )
  console.log(
    `Seeded ${DAYS} days: ${finances.length} transactions, ${habitLogs.length} habit check-ins, ${todos.length} tasks, ${journals.length} journal entries, ${sleeps.length} nights, ${priorities.length} priorities.`
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
