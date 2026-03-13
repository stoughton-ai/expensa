'use client';

import { Scan, Plus } from 'lucide-react';

interface HeaderProps {
  onAddReceipt: () => void;
}

export default function Header({ onAddReceipt }: HeaderProps) {
  return (
    <header style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 1.5rem',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backdropFilter: 'blur(12px)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--brand-primary), #4f46e5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Scan size={18} color="white" />
        </div>
        <div>
          <h1 style={{
            fontSize: '1.125rem',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #f0f2ff, var(--brand-secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Expensa
          </h1>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '-2px', letterSpacing: '0.05em' }}>
            AI Receipt Manager
          </p>
        </div>
      </div>

      {/* Add Receipt button (desktop) */}
      <button
        id="header-add-receipt"
        className="btn-primary hide-mobile"
        onClick={onAddReceipt}
      >
        <Plus size={16} />
        Add Receipt
      </button>
    </header>
  );
}
