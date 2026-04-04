'use client';

import { Scan, Plus, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

interface HeaderProps {
  onAddReceipt: () => void;
}

export default function Header({ onAddReceipt }: HeaderProps) {
  const { data: session } = useSession();

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

      {/* Right side — Add Receipt + Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          id="header-add-receipt"
          className="btn-primary hide-mobile"
          onClick={onAddReceipt}
        >
          <Plus size={16} />
          Add Receipt
        </button>

        {session?.user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            {session.user.image && (
              <img
                src={session.user.image}
                alt={session.user.name || 'Profile'}
                referrerPolicy="no-referrer"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid var(--border)',
                  objectFit: 'cover',
                }}
              />
            )}
            <button
              id="sign-out-btn"
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0.375rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ef4444';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
