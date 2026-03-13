import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/receipts — list all receipts with pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const from = (page - 1) * limit;

    let query = supabase
      .from('receipts')
      .select('*, receipt_line_items(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.ilike('vendor_name', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ receipts: data, total: count, page, limit });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 });
  }
}
