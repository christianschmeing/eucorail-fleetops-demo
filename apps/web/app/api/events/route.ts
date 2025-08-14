// apps/web/app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';

// GET Handler für SSE
export async function GET(request: NextRequest) {
  console.log('🔵 API Route /api/events wurde aufgerufen');
  
  try {
    // Backend-API aufrufen
    const backendUrl = 'http://localhost:4100/events';
    console.log('🔗 Verbinde zu Backend:', backendUrl);
    
    const response = await fetch(backendUrl, {
      headers: {
        'Accept': 'text/event-stream',
      },
      // Wichtig: Signal für Streaming
      signal: request.signal,
    });

    if (!response.ok) {
      console.error('❌ Backend-Verbindung fehlgeschlagen:', response.status);
      return NextResponse.json(
        { error: 'Backend nicht erreichbar' },
        { status: 502 }
      );
    }

    console.log('✅ Backend-Verbindung erfolgreich');
    
    // Stream mit korrekten Headers weiterleiten
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('❌ Fehler in API Route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Route muss dynamisch sein
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
