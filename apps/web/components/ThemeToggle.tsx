'use client';

export default function ThemeToggle() {
  return (
    <button
      type="button"
      aria-label="Dark Mode Toggle"
      onClick={() => {
        try {
          document.documentElement.classList.toggle('dark');
        } catch {}
      }}
      className="fixed bottom-4 right-4 z-50 bg-white/10 hover:bg-white/20 px-3 py-2 rounded text-xs"
    >
      🌓 Theme
    </button>
  );
}
