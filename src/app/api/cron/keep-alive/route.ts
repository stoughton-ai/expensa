import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Supabase Keep-Alive Cron
 * Runs daily to prevent free-tier project pausing due to inactivity.
 * Performs a lightweight read query on the receipts table.
 */
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron (production) or allow in dev
  const authHeader = request.headers.get('authorization');
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    // Perform a lightweight GET query to ensure the database compute is actually touched
    // A HEAD request might hit the PostgREST cache and not count as sufficient activity
    const { data, error } = await supabase
      .from('receipts')
      .select('id')
      .limit(1);

    if (error) throw error;

    console.log('[keep-alive] Successfully pinged Supabase DB at', new Date().toISOString());

    return NextResponse.json({
      ok: true,
      message: 'Keep-alive ping successful',
      data_found: data && data.length > 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[keep-alive] Failed:', message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
