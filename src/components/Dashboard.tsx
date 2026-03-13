'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Receipt, Calendar, PoundSterling, ChevronRight, Tag, ArrowRight } from 'lucide-react';

interface Stats {
  totalReceipts: number;
  totalSpend: number;
  thisMonthReceipts: number;
  thisMonthSpend: number;
  byCategory: { name: string; count: number; total: number }[];
  recentReceipts: {
    id: string;
    vendor_name: string;
    total_amount: number;
    currency: string;
    category: string;
    transaction_date: string;
    created_at: string;
  }[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Groceries': '#34d399',
  'Restaurant': '#f97316',
  'Transport': '#60a5fa',
  'Clothing': '#c084fc',
  'Electronics': '#22d3ee',
  'Healthcare': '#f472b6',
  'Entertainment': '#fbbf24',
  'Other': '#94a3b8',
  'Uncategorised': '#64748b',
};

export default function Dashboard({ onViewAll }: { onViewAll: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          // Supabase not configured yet — show empty state
          setStats({
            totalReceipts: 0, totalSpend: 0,
            thisMonthReceipts: 0, thisMonthSpend: 0,
            byCategory: [], recentReceipts: [],
          });
        } else {
          setStats(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setStats({
          totalReceipts: 0, totalSpend: 0,
          thisMonthReceipts: 0, thisMonthSpend: 0,
          byCategory: [], recentReceipts: [],
        });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '0.75rem', color: 'var(--text-secondary)' }}>
        <div className="spinner" />
        Loading dashboard…
      </div>
    );
  }

  if (!stats) {
    return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>Failed to load stats.</div>;
  }

  const currency = stats.recentReceipts?.[0]?.currency ?? 'GBP';
  const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';

  const statCards = [
    {
      id: 'total-receipts',
      label: 'Total Receipts',
      value: stats.totalReceipts.toString(),
      icon: Receipt,
      color: 'var(--brand-primary)',
      bg: 'rgba(99, 102, 241, 0.12)',
    },
    {
      id: 'total-spend',
      label: 'Total Spend',
      value: `${symbol}${stats.totalSpend.toFixed(2)}`,
      icon: TrendingUp,
      color: 'var(--success)',
      bg: 'rgba(52, 211, 153, 0.12)',
    },
    {
      id: 'month-receipts',
      label: 'This Month',
      value: stats.thisMonthReceipts.toString(),
      icon: Calendar,
      color: 'var(--info)',
      bg: 'rgba(96, 165, 250, 0.12)',
    },
    {
      id: 'month-spend',
      label: 'Month Spend',
      value: `${symbol}${stats.thisMonthSpend.toFixed(2)}`,
      icon: PoundSterling,
      color: 'var(--warning)',
      bg: 'rgba(251, 191, 36, 0.12)',
    },
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
      }}>
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.id} id={card.id} className="glass glass-hover" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: card.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={20} color={card.color} />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{card.label}</p>
                <p style={{ fontSize: '1.375rem', fontWeight: '800', color: 'var(--text-primary)' }}>{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.25rem',
      }}>

        {/* Spending by Category */}
        <div className="glass" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Tag size={16} color="var(--brand-secondary)" />
            <h2 style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)' }}>Spending by Category</h2>
          </div>

          {stats.byCategory.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>No data yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stats.byCategory.slice(0, 6).map((cat, idx) => {
                const color = CATEGORY_COLORS[cat.name] ?? '#64748b';
                const maxTotal = stats.byCategory[0]?.total ?? 1;
                const pct = Math.round((cat.total / maxTotal) * 100);
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{cat.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({cat.count})</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {symbol}{cat.total.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--bg-elevated)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Receipts */}
        <div className="glass" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Receipt size={16} color="var(--brand-secondary)" />
              <h2 style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)' }}>Recent Receipts</h2>
            </div>
            <button
              id="view-all-receipts"
              onClick={onViewAll}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--brand-secondary)', fontSize: '0.75rem', fontWeight: '600',
              }}
            >
              View all <ArrowRight size={12} />
            </button>
          </div>

          {stats.recentReceipts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
              No receipts yet — add your first one!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stats.recentReceipts.map(r => {
                const color = CATEGORY_COLORS[r.category] ?? '#64748b';
                return (
                  <div key={r.id} className="glass-hover" style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-elevated)',
                    cursor: 'pointer',
                  }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '8px',
                      background: `${color}22`, border: `1px solid ${color}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Receipt size={15} color={color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.vendor_name ?? 'Unknown Vendor'}
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {r.category ?? 'Uncategorised'} · {r.transaction_date ?? 'No date'}
                      </p>
                    </div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)', flexShrink: 0 }}>
                      {symbol}{(r.total_amount ?? 0).toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
