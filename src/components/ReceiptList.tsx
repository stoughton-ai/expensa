'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, Receipt, Trash2, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface LineItem {
  id: string;
  description: string;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
}

interface ReceiptRecord {
  id: string;
  vendor_name: string | null;
  total_amount: number | null;
  currency: string | null;
  category: string | null;
  transaction_date: string | null;
  payment_method: string | null;
  receipt_number: string | null;
  tax_amount: number | null;
  subtotal: number | null;
  source: string;
  image_url: string | null;
  notes: string | null;
  created_at: string;
  status: string;
  receipt_line_items: LineItem[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Groceries': '#34d399', 'Restaurant': '#f97316', 'Transport': '#60a5fa',
  'Clothing': '#c084fc', 'Electronics': '#22d3ee', 'Healthcare': '#f472b6',
  'Entertainment': '#fbbf24', 'Other': '#94a3b8', 'Uncategorised': '#64748b',
};

const CATEGORIES = ['all', 'Groceries', 'Restaurant', 'Transport', 'Clothing', 'Electronics', 'Healthcare', 'Entertainment', 'Other'];

export default function ReceiptList() {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<ReceiptRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const limit = 10;

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      category,
      search,
    });
    const res = await fetch(`/api/receipts?${params}`);
    const data = await res.json();
    setReceipts(Array.isArray(data.receipts) ? data.receipts : []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, search, category]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this receipt? This cannot be undone.')) return;
    setDeleting(true);
    await fetch(`/api/receipts/${id}`, { method: 'DELETE' });
    setDeleting(false);
    setSelected(null);
    fetchReceipts();
  };

  const totalPages = Math.ceil(total / limit);
  const symbol = (currency: string | null) => currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Search & Filter bar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            id="receipt-search"
            className="input"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Search by vendor…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <Filter size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <select
            id="category-filter"
            className="input"
            style={{ paddingLeft: '2.25rem', cursor: 'pointer', minWidth: '160px' }}
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1); }}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table / List */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
            <div className="spinner" /> Loading…
          </div>
        ) : receipts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Receipt size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p>No receipts found.</p>
          </div>
        ) : (
          <>
            {/* Header row (desktop) */}
            <div className="hide-mobile" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 110px 120px 110px 80px',
              padding: '0.75rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              fontSize: '0.7rem',
              fontWeight: '700',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              <span>Vendor</span><span>Date</span><span>Category</span><span style={{ textAlign: 'right' }}>Total</span><span style={{ textAlign: 'center' }}>Actions</span>
            </div>

            {receipts.map((r, idx) => {
              const color = CATEGORY_COLORS[r.category ?? ''] ?? '#64748b';
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 110px 120px 110px 80px',
                    padding: '0.875rem 1.25rem',
                    borderBottom: idx < receipts.length - 1 ? '1px solid var(--border)' : 'none',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => setSelected(r)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Vendor */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Receipt size={14} color={color} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: '600', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.vendor_name ?? 'Unknown Vendor'}
                      </p>
                      <p className="hide-desktop" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {r.category ?? 'Uncategorised'} · {r.transaction_date ?? '—'}
                      </p>
                    </div>
                  </div>

                  {/* Date */}
                  <span className="hide-mobile" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {r.transaction_date ?? '—'}
                  </span>

                  {/* Category */}
                  <div className="hide-mobile">
                    <span className="cat-pill" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
                      {r.category ?? 'Uncategorised'}
                    </span>
                  </div>

                  {/* Total */}
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', textAlign: 'right' }}>
                    {symbol(r.currency)}{(r.total_amount ?? 0).toFixed(2)}
                  </span>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                    <button
                      id={`view-${r.id}`}
                      onClick={() => setSelected(r)}
                      className="btn-secondary"
                      style={{ padding: '0.35rem', borderRadius: '8px' }}
                      title="View details"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      id={`delete-${r.id}`}
                      onClick={() => handleDelete(r.id)}
                      className="btn-danger"
                      style={{ padding: '0.35rem', borderRadius: '8px' }}
                      title="Delete"
                      disabled={deleting}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
          <button
            id="prev-page"
            className="btn-secondary"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '0.5rem 0.75rem' }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages} ({total} receipts)
          </span>
          <button
            id="next-page"
            className="btn-secondary"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: '0.5rem 0.75rem' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Receipt Detail Modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="glass"
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '560px', maxHeight: '90vh',
              overflow: 'auto', padding: '1.5rem',
              borderRadius: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '800', marginBottom: '0.25rem' }}>
                  {selected.vendor_name ?? 'Receipt Details'}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {selected.transaction_date ?? 'Date unknown'} · {selected.source}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}>✕ Close</button>
            </div>

            {/* Key details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'Total', value: `${symbol(selected.currency)}${(selected.total_amount ?? 0).toFixed(2)}` },
                { label: 'Tax', value: selected.tax_amount != null ? `${symbol(selected.currency)}${selected.tax_amount.toFixed(2)}` : '—' },
                { label: 'Payment', value: selected.payment_method ?? '—' },
                { label: 'Category', value: selected.category ?? 'Uncategorised' },
                { label: 'Receipt #', value: selected.receipt_number ?? '—' },
                { label: 'Currency', value: selected.currency ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg-elevated)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Line items */}
            {selected.receipt_line_items.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Line Items ({selected.receipt_line_items.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {selected.receipt_line_items.map((item, idx) => (
                    <div key={item.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.6rem 0.75rem', background: 'var(--bg-elevated)',
                      borderRadius: '8px', border: '1px solid var(--border)',
                      fontSize: '0.82rem', gap: '0.5rem',
                    }}>
                      <span style={{ color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.quantity && item.quantity !== 1 ? `${item.quantity}× ` : ''}{item.description}
                      </span>
                      <span style={{ fontWeight: '600', flexShrink: 0, color: 'var(--text-primary)' }}>
                        {item.total_price != null ? `${symbol(selected.currency)}${item.total_price.toFixed(2)}` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.notes && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selected.notes}</p>
              </div>
            )}

            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
              <button
                id={`modal-delete-${selected.id}`}
                className="btn-danger"
                style={{ flex: 1 }}
                onClick={() => handleDelete(selected.id)}
                disabled={deleting}
              >
                <Trash2 size={14} />
                Delete Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
