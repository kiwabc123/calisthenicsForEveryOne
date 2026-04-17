export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-8 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-2">☕ เลี้ยงกาแฟ</h1>
        <p className="text-gray-400 mb-6 text-center">
          ถ้าชอบโปรเจกต์นี้ หรืออยากสนับสนุนผู้พัฒนา<br />สามารถเลี้ยงกาแฟได้ที่นี่!
        </p>
        <a
          href="https://www.buymeacoffee.com/tiradetjqh"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-lg text-lg shadow-lg transition-colors mb-4"
        >
          <span>Buy Me a Coffee</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M17.5 19C17.5 20.3807 15.4853 21.5 13 21.5C10.5147 21.5 8.5 20.3807 8.5 19" stroke="#a16207" strokeWidth="2" strokeLinecap="round"/><path d="M21 7.5C21 10.5376 17.4183 13 13 13C8.58172 13 5 10.5376 5 7.5C5 4.46243 8.58172 2 13 2C17.4183 2 21 4.46243 21 7.5Z" fill="#facc15" stroke="#a16207" strokeWidth="2"/><ellipse cx="13" cy="7.5" rx="8" ry="5.5" fill="#fef3c7" stroke="#a16207" strokeWidth="2"/></svg>
        </a>
        <p className="text-gray-500 text-xs text-center">
          หรือจะส่งกำลังใจผ่านช่องทางอื่น ๆ แจ้งได้เลย!
        </p>
      </div>
    </div>
  );
}
