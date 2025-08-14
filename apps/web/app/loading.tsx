export default function Loading() {
  return (
    <div className="h-full w-full flex items-center justify-center text-center p-8">
      <div>
        <div className="animate-pulse w-6 h-6 rounded-full bg-white/40 mx-auto mb-3" />
        <p className="text-gray-300">Lade…</p>
      </div>
    </div>
  );
}


