"use client";
import { useEffect } from 'react';

export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="h-full w-full flex items-center justify-center text-center p-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Es ist ein Fehler aufgetreten.</h2>
        <p className="text-gray-400">Bitte laden Sie die Seite neu.</p>
      </div>
    </div>
  );
}


