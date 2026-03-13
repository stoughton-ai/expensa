import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { extractReceiptFromImage, extractReceiptFromText } from '@/lib/gemini';
import { sendReceiptNotification } from '@/lib/telegram';

export const maxDuration = 60; // Allow up to 60s for AI processing

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ── 1. Upload file to Supabase Storage ──────────────────
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `receipts/${timestamp}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('expensa-receipts')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
    }

    const { data: urlData } = supabase.storage
      .from('expensa-receipts')
      .getPublicUrl(storagePath);

    const imageUrl = urlData?.publicUrl ?? null;

    // ── 2. Determine source type ─────────────────────────────
    const source = formData.get('source') as string ?? 'upload';

    // ── 3. Extract data via Gemini ───────────────────────────
    let extracted;
    const isPdf = file.type === 'application/pdf';

    if (isPdf) {
      // For PDFs, send the raw base64 to Gemini (it can handle PDFs)
      const base64 = buffer.toString('base64');
      extracted = await extractReceiptFromImage(base64, 'application/pdf');
    } else {
      const base64 = buffer.toString('base64');
      extracted = await extractReceiptFromImage(base64, file.type as 'image/jpeg' | 'image/png' | 'image/webp');
    }

    // ── 4. Insert receipt into Supabase ──────────────────────
    const { data: receipt, error: insertError } = await supabase
      .from('receipts')
      .insert({
        source,
        original_filename: file.name,
        image_url: imageUrl,
        vendor_name: extracted.vendor_name,
        vendor_address: extracted.vendor_address,
        transaction_date: extracted.transaction_date,
        currency: extracted.currency ?? 'GBP',
        subtotal: extracted.subtotal,
        tax_amount: extracted.tax_amount,
        total_amount: extracted.total_amount,
        payment_method: extracted.payment_method,
        receipt_number: extracted.receipt_number,
        category: extracted.category,
        notes: extracted.notes,
        status: 'processed',
      })
      .select()
      .single();

    if (insertError || !receipt) {
      console.error('DB insert error:', insertError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // ── 5. Insert line items ─────────────────────────────────
    if (extracted.line_items.length > 0) {
      const lineItems = extracted.line_items.map((item, idx) => ({
        receipt_id: receipt.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        sort_order: idx,
      }));

      await supabase.from('receipt_line_items').insert(lineItems);
    }

    // ── 6. Send Telegram notification ────────────────────────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    await sendReceiptNotification(extracted, receipt.id, appUrl);

    await supabase
      .from('receipts')
      .update({ telegram_sent: true })
      .eq('id', receipt.id);

    return NextResponse.json({
      success: true,
      receiptId: receipt.id,
      extracted,
    });

  } catch (error) {
    console.error('Receipt processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
