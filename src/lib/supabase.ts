import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton for client-side usage
let _supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase env vars not set');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// Convenience export for client-side components
export const supabase = typeof window !== 'undefined' ? getSupabaseClient() : null!;

// Server-side client with elevated privileges (for API routes only)
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not set');
  return createClient(url, key);
}
