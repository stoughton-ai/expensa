'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, Receipt, Trash2, ExternalLink, ChevronLeft, ChevronRight, X, Calendar, Tag, CreditCard } from 'lucide-react';

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
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString(), category, search });
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
  const sym = (currency: string | null) => currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
  const color = (r: ReceiptRecord) => CATEGORY_COLORS[r.category ?? ''] ?? '#64748b';

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Search & Filter bar ── */}
      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '140px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            id="receipt-search"
            className="input"
            style={{ paddingLeft: '2.25rem', width: '100%', boxSizing: 'border-box' }}
            placeholder="Search vendor…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <Filter size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <select
            id="category-filter"
            className="input"
            style={{ paddingLeft: '2.25rem', cursor: 'pointer', minWidth: '0', width: '100%' }}
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1); }}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'All' : c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── List ── */}
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
            {/* Desktop header — hidden on mobile */}
            <div className="hide-mobile" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 110px 130px 100px 72px',
              padding: '0.75rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              fontSize: '0.68rem', fontWeight: '700',
              color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <span>Vendor</span><span>Date</span><span>Category</span>
              <span style={{ textAlign: 'right' }}>Total</span>
              <span style={{ textAlign: 'center' }}>Actions</span>
            </div>

            {receipts.map((r, idx) => {
              const c = color(r);
              const isLast = idx === receipts.length - 1;
              return (
                <div key={r.id} style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>

                  {/* ── Desktop row ── */}
                  <div
                    className="hide-mobile"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 110px 130px 100px 72px',
                      padding: '0.875rem 1.25rem',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => setSelected(r)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${c}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Receipt size={14} color={c} />
                      </div>
                      <p style={{ fontWeight: '600', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.vendor_name ?? 'Unknown Vendor'}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(r.transaction_date)}</span>
                    <div>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '600', background: `${c}22`, color: c, border: `1px solid ${c}44` }}>
                        {r.category ?? 'Uncategorised'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', textAlign: 'right' }}>
                      {sym(r.currency)}{(r.total_amount ?? 0).toFixed(2)}
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                      <button id={`view-${r.id}`} onClick={() => setSelected(r)} className="btn-secondary" style={{ padding: '0.35rem', borderRadius: '8px' }} title="View">
                        <ExternalLink size={13} />
                      </button>
                      <button id={`delete-${r.id}`} onClick={() => handleDelete(r.id)} className="btn-danger" style={{ padding: '0.35rem', borderRadius: '8px' }} title="Delete" disabled={deleting}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* ── Mobile card row ── */}
                  <div
                    className="hide-desktop"
                    onClick={() => setSelected(r)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                      padding: '0.875rem 1rem',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                    onTouchStart={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onTouchEnd={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Colour icon */}
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${c}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Receipt size={18} color={c} />
                    </div>

                    {/* Main info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: '700', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.2rem' }}>
                        {r.vendor_name ?? 'Unknown Vendor'}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: '600', background: `${c}20`, color: c, border: `1px solid ${c}33` }}>
                          {r.category ?? 'Uncategorised'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {formatDate(r.transaction_date)}
                        </span>
                      </div>
                    </div>

                    {/* Total + delete */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {sym(r.currency)}{(r.total_amount ?? 0).toFixed(2)}
                      </span>
                      <button
                        id={`mob-delete-${r.id}`}
                        onClick={e => { e.stopPropagation(); handleDelete(r.id); }}
                        className="btn-danger"
                        style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem' }}
                        disabled={deleting}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
          <button id="prev-page" className="btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '0.5rem 0.75rem' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {page} / {totalPages} <span style={{ color: 'var(--text-muted)' }}>({total})</span>
          </span>
          <button id="next-page" className="btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '0.5rem 0.75rem' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Receipt Detail Modal ── */}
      {/* On mobile: slides up from bottom as a sheet; on desktop: centred modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            overflowY: 'auto',
            padding: '1rem',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            className="glass"
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '520px',
              margin: 'auto',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '20px',
              overflow: 'hidden',
            }}
          >

            {/* Sticky header */}
            <div style={{
              flexShrink: 0,
              background: 'var(--bg-card)',
              borderBottom: '1px solid var(--border)',
              padding: '1rem 1.25rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '1rem' }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: '800', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selected.vendor_name ?? 'Receipt Details'}
                  </h2>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {formatDate(selected.transaction_date)} · via {selected.source}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                >
                  <X size={16} color="var(--text-secondary)" />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '70vh', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {/* Big total */}
              <div style={{
                textAlign: 'center', padding: '1.25rem',
                background: `${color(selected)}15`, borderRadius: '14px',
                border: `1px solid ${color(selected)}30`,
              }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Total Amount</p>
                <p style={{ fontSize: '2rem', fontWeight: '800', color: color(selected) }}>
                  {sym(selected.currency)}{(selected.total_amount ?? 0).toFixed(2)}
                </p>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                {[
                  { label: 'Tax', value: selected.tax_amount != null ? `${sym(selected.currency)}${selected.tax_amount.toFixed(2)}` : '—', icon: <Tag size={12} /> },
                  { label: 'Payment', value: selected.payment_method ?? '—', icon: <CreditCard size={12} /> },
                  { label: 'Category', value: selected.category ?? 'Uncategorised', icon: <Tag size={12} /> },
                  { label: 'Receipt #', value: selected.receipt_number ?? '—', icon: <Receipt size={12} /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} style={{ background: 'var(--bg-elevated)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>
                      {icon}
                      <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                    </div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Line items */}
              {selected.receipt_line_items.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Line Items ({selected.receipt_line_items.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {selected.receipt_line_items.map(item => (
                      <div key={item.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.6rem 0.75rem', background: 'var(--bg-elevated)',
                        borderRadius: '8px', border: '1px solid var(--border)',
                        fontSize: '0.82rem', gap: '0.5rem',
                      }}>
                        <span style={{ color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.quantity && item.quantity !== 1 ? `${item.quantity}× ` : ''}{item.description}
                        </span>
                        <span style={{ fontWeight: '600', flexShrink: 0 }}>
                          {item.total_price != null ? `${sym(selected.currency)}${item.total_price.toFixed(2)}` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.notes && (
                <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{selected.notes}</p>
                </div>
              )}

              <button
                id={`modal-delete-${selected.id}`}
                className="btn-danger"
                style={{ width: '100%' }}
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
