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
  drive_url?: string | null;
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
            padding: '2rem 1rem', /* more padding top/bottom on desktop */
            backdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            className="glass"
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '440px', // thinner for an elegant app flow
              margin: 'auto',
              maxHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              border: '1px solid var(--border)',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >

            {/* Premium Header Container */}
            <div style={{
              flexShrink: 0,
              background: `linear-gradient(to bottom, ${color(selected)}18, var(--bg-card))`,
              padding: '2.5rem 1.5rem 1.5rem',
              position: 'relative',
              textAlign: 'center',
              borderBottom: '1px solid var(--border)',
            }}>
              {/* Close Button */}
              <button
                onClick={() => setSelected(null)}
                style={{
                  position: 'absolute', top: '1rem', right: '1rem',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-secondary)', transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              >
                <X size={15} />
              </button>

              {/* Category Icon / Logo */}
              <div style={{
                width: '64px', height: '64px', borderRadius: '20px',
                background: `${color(selected)}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem',
                border: `1px solid ${color(selected)}40`,
                boxShadow: `0 8px 16px -4px ${color(selected)}20`
              }}>
                <Receipt size={28} color={color(selected)} />
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.25rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {selected.vendor_name ?? 'Unknown Vendor'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {formatDate(selected.transaction_date)} &middot; {selected.category ?? 'Uncategorised'}
              </p>

              <div style={{ marginTop: '1.5rem' }}>
                <p style={{ fontSize: '3rem', fontWeight: '800', color: color(selected), letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {sym(selected.currency)}{(selected.total_amount ?? 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg)' }}>
              
              {/* Receipt Image Button */}
              {(selected.drive_url || selected.image_url) && (
                <a
                  href={selected.drive_url || selected.image_url!}
                  target="_blank" rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '0.875rem', background: 'var(--bg-elevated)', borderRadius: '14px',
                    color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600',
                    textDecoration: 'none', border: '1px solid var(--border)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'transform 0.1s'
                  }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'none'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <ExternalLink size={16} color="var(--text-secondary)" />
                  View Original Receipt
                </a>
              )}

              {/* Transactions Details (List Style) */}
              <div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: '0.5rem' }}>
                  Transaction Details
                </h3>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '0.5rem 1rem', border: '1px solid var(--border)' }}>
                  {[
                    { label: 'Tax Amount', value: selected.tax_amount != null && selected.tax_amount > 0 ? `${sym(selected.currency)}${selected.tax_amount.toFixed(2)}` : '—' },
                    { label: 'Payment Method', value: selected.payment_method ?? '—' },
                    { label: 'Receipt #', value: selected.receipt_number ?? '—' },
                    { label: 'Source', value: selected.source },
                  ].map((row, i, arr) => (
                    <div key={row.label} style={{
                      display: 'flex', justifyContent: 'space-between', padding: '0.875rem 0',
                      borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border)',
                      fontSize: '0.85rem'
                    }}>
                      <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Line items */}
              {selected.receipt_line_items.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: '0.5rem' }}>
                    Purchases
                  </h3>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '0.5rem 1rem', border: '1px solid var(--border)' }}>
                    {selected.receipt_line_items.map((item, i, arr) => (
                      <div key={item.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.875rem 0',
                        borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border)',
                        fontSize: '0.85rem', gap: '1rem'
                      }}>
                        <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-primary)' }}>
                          {item.quantity && item.quantity !== 1 && (
                            <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>{item.quantity}×</span>
                          )}
                          <span style={{ lineHeight: 1.4 }}>{item.description}</span>
                        </div>
                        <span style={{ fontWeight: '600', flexShrink: 0 }}>
                          {item.total_price != null ? `${sym(selected.currency)}${item.total_price.toFixed(2)}` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selected.notes && (
                <div>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: '0.5rem' }}>
                    Notes
                  </h3>
                  <div style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {selected.notes}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                <button
                  id={`modal-delete-${selected.id}`}
                  className="btn-danger"
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '14px', fontSize: '0.85rem', fontWeight: '600' }}
                  onClick={() => handleDelete(selected.id)}
                  disabled={deleting}
                >
                  <Trash2 size={15} style={{ opacity: 0.8 }} />
                  Delete Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
