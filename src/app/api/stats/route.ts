import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/stats — dashboard statistics
export async function GET() {
  try {
    const supabase = createServiceClient();

    // Total receipts and spend
    const { data: totals } = await supabase
      .from('receipts')
      .select('total_amount, category, transaction_date, currency')
      .eq('status', 'processed');

    if (!totals) {
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    const totalReceipts = totals.length;
    const totalSpend = totals.reduce((sum, r) => sum + (r.total_amount ?? 0), 0);

    // This month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const thisMonthReceipts = totals.filter(r => r.transaction_date >= startOfMonth);
    const thisMonthSpend = thisMonthReceipts.reduce((sum, r) => sum + (r.total_amount ?? 0), 0);

    // By category
    const categoryMap: Record<string, { count: number; total: number }> = {};
    for (const r of totals) {
      const cat = r.category ?? 'Uncategorised';
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, total: 0 };
      categoryMap[cat].count++;
      categoryMap[cat].total += r.total_amount ?? 0;
    }

    const byCategory = Object.entries(categoryMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);

    // Recent 5 receipts
    const { data: recent } = await supabase
      .from('receipts')
      .select('id, vendor_name, total_amount, currency, category, transaction_date, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      totalReceipts,
      totalSpend,
      thisMonthReceipts: thisMonthReceipts.length,
      thisMonthSpend,
      byCategory,
      recentReceipts: recent ?? [],
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
