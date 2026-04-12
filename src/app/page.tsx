import Link from "next/link";

const exercises = [
  {
    id: 'push-up',
    name: 'Push-up',
    nameLocal: 'วิดพื้น',
    emoji: '💪',
    difficulty: 'เริ่มต้น',
    muscleGroups: ['หน้าอก', 'ไหล่', 'แขน'],
    available: true,
    gradient: 'from-rose-500/20 to-orange-500/20',
    border: 'border-rose-500/30',
    accent: 'text-rose-400',
  },
  {
    id: 'handstand',
    name: 'Handstand',
    nameLocal: 'ยืนมือ',
    emoji: '🤸',
    difficulty: 'ยาก',
    muscleGroups: ['ไหล่', 'แขน', 'แกนกลาง'],
    available: true,
    isTimeBased: true,
    gradient: 'from-violet-500/20 to-purple-500/20',
    border: 'border-violet-500/30',
    accent: 'text-violet-400',
  },
  {
    id: 'pull-up',
    name: 'Pull-up',
    nameLocal: 'ดึงข้อ',
    emoji: '🏋️',
    difficulty: 'ปานกลาง',
    muscleGroups: ['หลัง', 'แขน'],
    available: true,
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30',
    accent: 'text-blue-400',
  },
  {
    id: 'squat',
    name: 'Squat',
    nameLocal: 'สควอท',
    emoji: '🦵',
    difficulty: 'เริ่มต้น',
    muscleGroups: ['ขา', 'ก้น'],
    available: true,
    gradient: 'from-amber-500/20 to-yellow-500/20',
    border: 'border-amber-500/30',
    accent: 'text-amber-400',
  },
  {
    id: 'plank',
    name: 'Plank',
    nameLocal: 'แพลงค์',
    emoji: '🧘',
    difficulty: 'เริ่มต้น',
    muscleGroups: ['หน้าท้อง', 'แกนกลาง'],
    available: true,
    isTimeBased: true,
    gradient: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/30',
    accent: 'text-emerald-400',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero section */}
      <header className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-16 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            🏋️ Calisthenics For Everyone
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            วิเคราะห์ท่าออกกำลังกายแบบ Real-time ด้วย AI
          </p>
          <p className="text-gray-400">
            ฝึกท่าให้ถูกต้อง นับ rep อัตโนมัติ พัฒนาได้ทุกที่
          </p>
        </div>
      </header>

      {/* Exercise cards */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6">เลือกท่าที่ต้องการฝึก</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className={`relative bg-gradient-to-br ${exercise.gradient} backdrop-blur-sm rounded-xl p-4 md:p-6 border ${exercise.border} transition-all duration-300 ${
                exercise.available
                  ? 'hover:scale-[1.03] hover:shadow-lg hover:shadow-black/20 cursor-pointer'
                  : 'opacity-60'
              }`}
            >
              {exercise.available ? (
                <Link href={`/exercise/${exercise.id}`} className="block">
                  <ExerciseCardContent exercise={exercise} />
                </Link>
              ) : (
                <div className="relative">
                  <ExerciseCardContent exercise={exercise} />
                  <span className="absolute top-0 right-0 bg-gray-600/80 backdrop-blur-sm text-xs px-2 py-1 rounded">
                    เร็วๆ นี้
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Features */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            ทำไมต้องใช้ App นี้?
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <FeatureCard
              emoji="🎯"
              title="วิเคราะห์ท่าแม่นยำ"
              description="AI ตรวจจับท่าทางและให้ feedback ทันที"
              gradient="from-cyan-500/20 to-blue-500/20"
              border="border-cyan-500/30"
            />
            <FeatureCard
              emoji="🔢"
              title="นับ Rep อัตโนมัติ"
              description="ไม่ต้องนับเอง ระบบนับให้แม่นยำ"
              gradient="from-green-500/20 to-emerald-500/20"
              border="border-green-500/30"
            />
            <FeatureCard
              emoji="📊"
              title="ติดตาม Progress"
              description="ดูสถิติการฝึกและพัฒนาการ"
              gradient="from-purple-500/20 to-pink-500/20"
              border="border-purple-500/30"
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-t from-gray-900 to-gray-800 py-8 mt-16 border-t border-gray-700/50">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400">Made with <span className="text-red-400">💪</span> for fitness enthusiasts</p>
        </div>
      </footer>
    </div>
  );
}

function ExerciseCardContent({ exercise }: { exercise: typeof exercises[0] }) {
  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <span className="text-4xl drop-shadow-lg">{exercise.emoji}</span>
        <div>
          <h3 className="text-xl font-semibold text-white">{exercise.nameLocal}</h3>
          <p className="text-gray-400 text-sm">{exercise.name}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {exercise.muscleGroups.map((muscle) => (
          <span
            key={muscle}
            className="bg-white/10 text-gray-200 text-xs px-2 py-1 rounded-full"
          >
            {muscle}
          </span>
        ))}
      </div>
      <p className="text-sm text-gray-400">
        ระดับ: <span className={exercise.accent}>{exercise.difficulty}</span>
      </p>
    </>
  );
}

function FeatureCard({ emoji, title, description, gradient, border }: { 
  emoji: string; 
  title: string; 
  description: string;
  gradient: string;
  border: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${gradient} backdrop-blur-sm rounded-xl p-6 text-center border ${border} transition-all duration-300 hover:scale-[1.02]`}>
      <span className="text-4xl mb-3 block drop-shadow-lg">{emoji}</span>
      <h3 className="font-semibold mb-2 text-white">{title}</h3>
      <p className="text-gray-300 text-sm">{description}</p>
    </div>
  );
}
