-- ============================================================
-- EXPENSA — PostgreSQL Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Source info
  source VARCHAR(20) NOT NULL DEFAULT 'upload', -- 'camera', 'upload', 'pdf', 'email'
  original_filename TEXT,
  image_url TEXT,           -- Supabase Storage URL
  drive_url TEXT,           -- Google Drive Link

  -- AI Extracted data
  vendor_name TEXT,
  vendor_address TEXT,
  transaction_date DATE,
  currency VARCHAR(3) DEFAULT 'GBP',
  subtotal DECIMAL(12, 2),
  tax_amount DECIMAL(12, 2),
  total_amount DECIMAL(12, 2),
  payment_method VARCHAR(50),
  receipt_number TEXT,
  category VARCHAR(100),
  warranty_details TEXT,
  notes TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'processed', -- 'processing', 'processed', 'failed', 'needs_review'
  ai_confidence VARCHAR(20),  -- 'high', 'medium', 'low'
  telegram_sent BOOLEAN DEFAULT FALSE
);

-- Line items table (normalised)
CREATE TABLE IF NOT EXISTS receipt_line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 3),
  unit_price DECIMAL(12, 2),
  total_price DECIMAL(12, 2),
  sort_order INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_vendor ON receipts(vendor_name);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_category ON receipts(category);
CREATE INDEX IF NOT EXISTS idx_line_items_receipt_id ON receipt_line_items(receipt_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SECURITY — Row Level Security (RLS)
-- ============================================================

-- 1. Enable RLS on both tables
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_line_items ENABLE ROW LEVEL SECURITY;

-- 2. Define Policies
-- We primarily use the service_role key server-side, which bypasses RLS.
-- Enabling RLS without policies blocks all public 'anon' access.

-- Grant access to authenticated users if we ever use browser-side client
-- But for now, we leave it locked to keep it secure as per Supabase warning.

