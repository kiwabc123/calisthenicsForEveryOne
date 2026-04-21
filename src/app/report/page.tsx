// หน้าแจ้งปัญหา/ติดต่อผู้พัฒนา (Formspree)
import Link from "next/link";

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-8 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-2">📢 แจ้งปัญหา / ติดต่อผู้พัฒนา</h1>
        <p className="text-gray-400 mb-6 text-center">
          หากพบปัญหา ข้อเสนอแนะ หรืออยากติดต่อทีมงาน<br />กรอกฟอร์มนี้ได้เลย
        </p>
        <form
          action="https://formspree.io/f/xqewdgod" // อัปเดต Formspree Form ID ใหม่
          method="POST"
          className="w-full flex flex-col gap-4"
        >
          <input
            type="text"
            name="name"
            required
            placeholder="ชื่อของคุณ (ไม่บังคับ)"
            className="px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <input
            type="email"
            name="email"
            placeholder="อีเมล (ถ้าต้องการให้ติดต่อกลับ)"
            className="px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <textarea
            name="message"
            required
            placeholder="รายละเอียดปัญหา หรือข้อความที่ต้องการแจ้ง"
            rows={5}
            className="px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <button
            type="submit"
            className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-lg text-lg shadow-lg transition-colors"
          >
            ส่งข้อความ
          </button>
        </form>
        <p className="text-gray-500 text-xs text-center mt-4">
          ข้อมูลจะถูกส่งไปที่ tiradet.jq@gmail.com ผ่าน Formspree<br />
          <a href="mailto:tiradet.jq@gmail.com" className="underline text-yellow-300 hover:text-yellow-400">ติดต่ออีเมลโดยตรง</a>
        </p>
        <Link
          href="/"
          className="mt-6 w-full py-2 bg-gray-700 hover:bg-gray-600 text-yellow-300 font-semibold rounded-lg text-base shadow transition-colors text-center"
        >
          ← กลับหน้าแรก
        </Link>
      </div>
    </div>
  );
}
