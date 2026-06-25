import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// Completely disable all Next.js caching for this route
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

/**
 * Supabase Keep-Alive Cron
 * Runs daily via Vercel Cron and can be triggered by Apps Script or GitHub Actions.
 * Performs a database read AND writes to the _heartbeat table for audit trail.
 *
 * Trigger sources:
 *  - Vercel Cron:      Authorization: Bearer <CRON_SECRET>
 *  - Apps Script:       ?ping=true
 *  - GitHub Actions:    ?ping=true&source=github_actions
 *  - Manual:            ?ping=true (or just visit the URL)
 */
export async function GET(request: Request) {
  // We check for the Vercel Cron secret, but we DO NOT block the request if it's missing.
  // This is a failsafe: even if the CRON_SECRET is misconfigured in Vercel,
  // the keep-alive ping to Supabase will still execute, preventing the project from pausing.
  // Since this endpoint only performs reads/heartbeat writes and exposes no sensitive data,
  // it is safe to leave open.
  const authHeader = request.headers.get('authorization');
  const url = new URL(request.url);
  const isBypass = url.searchParams.get('ping') === 'true';
  const sourceParam = url.searchParams.get('source');

  // Determine the source of this ping for audit trail
  let source = 'unknown';
  if (
    authHeader === `Bearer ${process.env.CRON_SECRET}` &&
    process.env.CRON_SECRET
  ) {
    source = 'vercel_cron';
  } else if (sourceParam) {
    source = sourceParam;
  } else if (isBypass) {
    source = 'apps_script';
  } else {
    source = 'manual';
  }

  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    !isBypass
  ) {
    console.warn('[keep-alive] Unauthorized hit (missing or invalid CRON_SECRET). Executing ping anyway as a failsafe.');
  }

  try {
    const supabase = createServiceClient();

    // 1. Perform a lightweight read to ensure the database compute is touched
    const { data, error } = await supabase
      .from('receipts')
      .select('id')
      .limit(1);

    if (error) throw error;

    // 2. Update the _heartbeat table for audit trail
    // This lets you check the Supabase dashboard to see when the last ping was
    try {
      await supabase
        .from('_heartbeat')
        .upsert({
          id: 1,
          last_ping: new Date().toISOString(),
          source,
        }, { onConflict: 'id' });
    } catch {
      // _heartbeat table may not exist yet — that's fine, the read query above
      // is what actually prevents Supabase from pausing the project
      console.warn('[keep-alive] Could not update _heartbeat table (may not exist yet)');
    }

    const timestamp = new Date().toISOString();
    console.log(`[keep-alive] Successfully pinged Supabase DB at ${timestamp} (source: ${source})`);

    return NextResponse.json({
      ok: true,
      message: 'Keep-alive ping successful',
      source,
      data_found: data && data.length > 0,
      timestamp,
      cache_buster: Date.now(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[keep-alive] Failed:', message);
    return NextResponse.json(
      { ok: false, error: message, source },
      { status: 500 }
    );
  }
}
