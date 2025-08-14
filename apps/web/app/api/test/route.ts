import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🟢 Test-Route funktioniert!');
  return NextResponse.json({ 
    message: 'API Routes funktionieren!',
    timestamp: new Date().toISOString()
  });
}
