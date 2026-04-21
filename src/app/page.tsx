import Link from "next/link";
import { 
  Dumbbell, 
  FlipVertical2, 
  TrendingUp, 
  CircleDot, 
  Timer,
  Target,
  Hash,
  BarChart3,
  type LucideIcon
} from "lucide-react";
import MuscleMap from "@/components/MuscleMap";
import UserMenu from "@/components/UserMenu";

const exercises: {
  id: string;
  name: string;
  nameLocal: string;
  icon: LucideIcon;
  difficulty: string;
  muscleGroups: string[];
  available: boolean;
  isTimeBased?: boolean;
  gradient: string;
  border: string;
  accent: string;
  iconBg: string;
}[] = [
  {
    id: 'push-up',
    name: 'Push-up',
    nameLocal: 'วิดพื้น',
    icon: Dumbbell,
    difficulty: 'เริ่มต้น',
    muscleGroups: ['หน้าอก', 'ไหล่', 'แขน'],
    available: true,
    gradient: 'from-rose-500/20 to-orange-500/20',
    border: 'border-rose-500/30',
    accent: 'text-rose-400',
    iconBg: 'bg-rose-500/20 text-rose-400',
  },
  {
    id: 'handstand',
    name: 'Handstand',
    nameLocal: 'ยืนมือ',
    icon: FlipVertical2,
    difficulty: 'ยาก',
    muscleGroups: ['ไหล่', 'แขน', 'แกนกลาง'],
    available: true,
    isTimeBased: true,
    gradient: 'from-violet-500/20 to-purple-500/20',
    border: 'border-violet-500/30',
    accent: 'text-violet-400',
    iconBg: 'bg-violet-500/20 text-violet-400',
  },
  {
    id: 'pull-up',
    name: 'Pull-up',
    nameLocal: 'ดึงข้อ',
    icon: TrendingUp,
    difficulty: 'ปานกลาง',
    muscleGroups: ['หลัง', 'แขน'],
    available: true,
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30',
    accent: 'text-blue-400',
    iconBg: 'bg-blue-500/20 text-blue-400',
  },
  {
    id: 'squat',
    name: 'Squat',
    nameLocal: 'สควอท',
    icon: CircleDot,
    difficulty: 'เริ่มต้น',
    muscleGroups: ['ขา', 'ก้น'],
    available: true,
    gradient: 'from-amber-500/20 to-yellow-500/20',
    border: 'border-amber-500/30',
    accent: 'text-amber-400',
    iconBg: 'bg-amber-500/20 text-amber-400',
  },
  {
    id: 'plank',
    name: 'Plank',
    nameLocal: 'แพลงค์',
    icon: Timer,
    difficulty: 'เริ่มต้น',
    muscleGroups: ['หน้าท้อง', 'แกนกลาง'],
    available: true,
    isTimeBased: true,
    gradient: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/30',
    accent: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20 text-emerald-400',
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
        
        {/* User Menu - top right */}
        <div className="absolute top-4 right-4 z-20">
          <UserMenu />
        </div>
        
        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/30 mb-6">
            <Dumbbell className="w-12 h-12 text-indigo-400" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            Calisthenics For Everyone
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            วิเคราะห์ท่าออกกำลังกายแบบ Real-time ด้วย AI
          </p>
          <p className="text-gray-400">
            ฝึกท่าให้ถูกต้อง นับ rep อัตโนมัติ พัฒนาได้ทุกที่
          </p>
        </div>
      </header>

      {/* Donate & Report tab */}
      <div className="flex justify-end gap-2 mt-4">
        <Link
          href="/support"
          className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-lg text-sm shadow transition-colors"
        >
          <span>☕ เลี้ยงกาแฟ</span>
        </Link>
        <Link
          href="/report"
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-bold rounded-lg text-sm shadow transition-colors"
        >
          <span>📢 แจ้งปัญหา</span>
        </Link>
      </div>

      {/* Exercise cards */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6">เลือกท่าที่ต้องการฝึก</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className={`group relative bg-gradient-to-br ${exercise.gradient} backdrop-blur-sm rounded-xl p-4 md:p-6 border ${exercise.border} transition-all duration-300 ${
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
              icon={Target}
              title="วิเคราะห์ท่าแม่นยำ"
              description="AI ตรวจจับท่าทางและให้ feedback ทันที"
              gradient="from-cyan-500/20 to-blue-500/20"
              border="border-cyan-500/30"
              iconColor="text-cyan-400"
            />
            <FeatureCard
              icon={Hash}
              title="นับ Rep อัตโนมัติ"
              description="ไม่ต้องนับเอง ระบบนับให้แม่นยำ"
              gradient="from-green-500/20 to-emerald-500/20"
              border="border-green-500/30"
              iconColor="text-green-400"
            />
            <FeatureCard
              icon={BarChart3}
              title="ติดตาม Progress"
              description="ดูสถิติการฝึกและพัฒนาการ"
              gradient="from-purple-500/20 to-pink-500/20"
              border="border-purple-500/30"
              iconColor="text-purple-400"
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-t from-gray-900 to-gray-800 py-8 mt-16 border-t border-gray-700/50">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400 inline-flex items-center gap-2">
            Made with <Dumbbell className="w-5 h-5 text-indigo-400" /> for fitness enthusiasts
          </p>
        </div>
      </footer>
    </div>
  );
}

function ExerciseCardContent({ exercise }: { exercise: typeof exercises[0] }) {
  const IconComponent = exercise.icon;
  
  return (
    <div className="flex gap-4">
      {/* Muscle Map */}
      <div className="flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
        <MuscleMap exercise={exercise.id} view="front" size="sm" />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${exercise.iconBg} transition-transform group-hover:scale-110`}>
            <IconComponent className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{exercise.nameLocal}</h3>
            <p className="text-gray-400 text-xs">{exercise.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {exercise.muscleGroups.map((muscle) => (
            <span
              key={muscle}
              className="bg-white/10 text-gray-200 text-xs px-2 py-0.5 rounded-full"
            >
              {muscle}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          ระดับ: <span className={exercise.accent}>{exercise.difficulty}</span>
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, gradient, border, iconColor }: { 
  icon: LucideIcon; 
  title: string; 
  description: string;
  gradient: string;
  border: string;
  iconColor: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${gradient} backdrop-blur-sm rounded-xl p-6 text-center border ${border} transition-all duration-300 hover:scale-[1.02]`}>
      <div className={`inline-flex p-3 rounded-full bg-white/10 mb-4`}>
        <Icon className={`w-8 h-8 ${iconColor}`} strokeWidth={1.5} />
      </div>
      <h3 className="font-semibold mb-2 text-white">{title}</h3>
      <p className="text-gray-300 text-sm">{description}</p>
    </div>
  );
}
