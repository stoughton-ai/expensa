import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_AUTH_CLIENT_ID || '';
  const hasSecret = !!process.env.GOOGLE_AUTH_CLIENT_SECRET;
  const authUrl = process.env.AUTH_URL || '';
  
  return NextResponse.json({
    clientIdPrefix: clientId.substring(0, 12),
    clientIdSuffix: clientId.substring(clientId.length - 20),
    clientIdLength: clientId.length,
    hasSecret,
    authUrl,
  });
}
