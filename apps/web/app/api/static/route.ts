import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');
  
  if (!file) {
    return NextResponse.json({ error: 'File parameter required' }, { status: 400 });
  }
  
  try {
    // Security: Only allow access to config and data directories
    if (!file.startsWith('config/') && !file.startsWith('data/')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const filePath = join(process.cwd(), file);
    const content = readFileSync(filePath, 'utf8');
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error(`Failed to serve ${file}:`, error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
