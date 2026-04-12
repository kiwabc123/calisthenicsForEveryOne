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
  },
  {
    id: 'pull-up',
    name: 'Pull-up',
    nameLocal: 'ดึงข้อ',
    emoji: '🏋️',
    difficulty: 'ปานกลาง',
    muscleGroups: ['หลัง', 'แขน'],
    available: true,
  },
  {
    id: 'squat',
    name: 'Squat',
    nameLocal: 'สควอท',
    emoji: '🦵',
    difficulty: 'เริ่มต้น',
    muscleGroups: ['ขา', 'ก้น'],
    available: false,
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
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero section */}
      <header className="bg-gradient-to-b from-gray-800 to-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
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
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6">เลือกท่าที่ต้องการฝึก</h2>
        
        <div className="grid sm:grid-cols-2 gap-6">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className={`bg-gray-800 rounded-xl p-6 transition-all ${
                exercise.available
                  ? 'hover:bg-gray-700 hover:scale-[1.02] cursor-pointer'
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
                  <span className="absolute top-0 right-0 bg-gray-600 text-xs px-2 py-1 rounded">
                    เร็วๆ นี้
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Features */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold mb-6">ทำไมต้องใช้ App นี้?</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <FeatureCard
              emoji="🎯"
              title="วิเคราะห์ท่าแม่นยำ"
              description="AI ตรวจจับท่าทางและให้ feedback ทันที"
            />
            <FeatureCard
              emoji="🔢"
              title="นับ Rep อัตโนมัติ"
              description="ไม่ต้องนับเอง ระบบนับให้แม่นยำ"
            />
            <FeatureCard
              emoji="📊"
              title="ติดตาม Progress"
              description="ดูสถิติการฝึกและพัฒนาการ"
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-gray-400">
          <p>Made with 💪 for fitness enthusiasts</p>
        </div>
      </footer>
    </div>
  );
}

function ExerciseCardContent({ exercise }: { exercise: typeof exercises[0] }) {
  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <span className="text-4xl">{exercise.emoji}</span>
        <div>
          <h3 className="text-xl font-semibold">{exercise.nameLocal}</h3>
          <p className="text-gray-400 text-sm">{exercise.name}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {exercise.muscleGroups.map((muscle) => (
          <span
            key={muscle}
            className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded"
          >
            {muscle}
          </span>
        ))}
      </div>
      <p className="text-sm text-gray-400">
        ระดับ: <span className="text-blue-400">{exercise.difficulty}</span>
      </p>
    </>
  );
}

function FeatureCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 text-center">
      <span className="text-3xl mb-3 block">{emoji}</span>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}
