import { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Receipt Details — Expensa',
};

import { createServiceClient } from '@/lib/supabase';

async function getReceipt(id: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('receipts')
    .select('*, receipt_line_items(*)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data;
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const receipt = await getReceipt(id);

  if (!receipt) return notFound();

  const symbol = receipt.currency === 'GBP' ? '£' : receipt.currency === 'EUR' ? '€' : '$';

  return (
    <div style={{ maxWidth: '640px', margin: '2rem auto', padding: '0 1rem' }}>
      <div className="glass" style={{ padding: '2rem', borderRadius: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>
          {receipt.vendor_name ?? 'Receipt'}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {receipt.transaction_date ?? 'Date unknown'} · {receipt.category ?? 'Uncategorised'}
        </p>

        {/* Totals */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total', value: `${symbol}${(receipt.total_amount ?? 0).toFixed(2)}` },
            { label: 'Tax', value: receipt.tax_amount != null ? `${symbol}${receipt.tax_amount.toFixed(2)}` : '—' },
            { label: 'Payment Method', value: receipt.payment_method ?? '—' },
            { label: 'Receipt #', value: receipt.receipt_number ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--bg-elevated)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
              <p style={{ fontWeight: '700' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Line items */}
        {receipt.receipt_line_items?.length > 0 && (
          <div>
            <h2 style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Items ({receipt.receipt_line_items.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {receipt.receipt_line_items.map((item: { id: string; quantity: number; description: string; total_price: number }) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0.875rem', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                  <span>{item.quantity && item.quantity !== 1 ? `${item.quantity}× ` : ''}{item.description}</span>
                  <span style={{ fontWeight: '600' }}>{item.total_price != null ? `${symbol}${item.total_price.toFixed(2)}` : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
