import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

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

    // Lightweight query — just count rows, costs almost nothing
    const { count, error } = await supabase
      .from('receipts')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      message: 'Keep-alive ping successful',
      receipts_count: count,
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
