'use client';

import { useState } from 'react';
import Dashboard from '@/components/Dashboard';
import ReceiptList from '@/components/ReceiptList';
import UploadModal from '@/components/UploadModal';
import Header from '@/components/Header';
import { LayoutDashboard, Receipt, Plus } from 'lucide-react';

type Tab = 'dashboard' | 'receipts';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showUpload, setShowUpload] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setShowUpload(false);
    setRefreshKey(k => k + 1);
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Header onAddReceipt={() => setShowUpload(true)} />

      {/* Tab navigation */}
      <nav style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem',
        display: 'flex',
        gap: '0.25rem',
        position: 'sticky',
        top: '64px',
        zIndex: 40,
      }}>
        {([
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'receipts',  label: 'All Receipts', icon: Receipt },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`tab-${id}`}
            onClick={() => setActiveTab(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.875rem 1.25rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === id ? 'var(--brand-primary)' : 'var(--text-secondary)',
              borderBottom: `2px solid ${activeTab === id ? 'var(--brand-primary)' : 'transparent'}`,
              transition: 'all 0.2s',
              marginBottom: '-1px',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}

        {/* Mobile FAB spacer */}
        <div style={{ flex: 1 }} />
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, padding: '1.5rem', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
        {activeTab === 'dashboard' && <Dashboard key={refreshKey} onViewAll={() => setActiveTab('receipts')} />}
        {activeTab === 'receipts' && <ReceiptList key={refreshKey} />}
      </main>

      {/* Mobile FAB */}
      <button
        id="mobile-add-receipt"
        className="hide-desktop"
        onClick={() => setShowUpload(true)}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--brand-primary), #4f46e5)',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(99, 102, 241, 0.5)',
          zIndex: 50,
          animation: 'pulse-glow 2s ease-in-out infinite',
        }}
        aria-label="Add receipt"
      >
        <Plus size={24} />
      </button>

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
