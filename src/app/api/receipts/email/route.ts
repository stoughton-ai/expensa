import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { extractReceiptFromImage, extractReceiptFromText } from '@/lib/gemini';
import { sendReceiptNotification } from '@/lib/telegram';

export const maxDuration = 60;

// ── Security: verify the shared secret sent by Apps Script ──
function isAuthorised(request: NextRequest): boolean {
  const secret = request.headers.get('x-expensa-secret');
  return secret === process.env.EXPENSA_EMAIL_SECRET;
}

export async function POST(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const body = await request.json();

    /*
      Expected payload from Google Apps Script:
      {
        subject:     string,
        from:        string,
        date:        string,
        bodyText:    string,          // plain text body
        attachments: [               // optional
          {
            filename: string,
            mimeType: string,        // image/jpeg | image/png | application/pdf
            data:     string,        // base64 encoded
          }
        ]
      }
    */

    const { subject, from, date, bodyText, attachments = [] } = body;

    const supabase = createServiceClient();
    let extracted;
    let imageUrl: string | null = null;
    let originalFilename: string | null = null;
    let source = 'email';

    // ── 1. Prefer image/PDF attachments over body text ──────
    const receiptAttachment = attachments.find((a: { mimeType: string }) =>
      ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'].includes(a.mimeType)
    );

    if (receiptAttachment) {
      // Upload attachment to Supabase Storage
      const buffer = Buffer.from(receiptAttachment.data, 'base64');
      const timestamp = Date.now();
      const safeName = receiptAttachment.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `receipts/email-${timestamp}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(storagePath, buffer, {
          contentType: receiptAttachment.mimeType,
          upsert: false,
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(storagePath);
        imageUrl = urlData?.publicUrl ?? null;
      }

      originalFilename = receiptAttachment.filename;
      source = receiptAttachment.mimeType === 'application/pdf' ? 'pdf' : 'email';

      extracted = await extractReceiptFromImage(
        receiptAttachment.data,
        receiptAttachment.mimeType
      );
    } else if (bodyText && bodyText.trim().length > 20) {
      // ── 2. Fall back to extracting from email body text ───
      // Enrich the text with email metadata for better extraction
      const enrichedText = `Subject: ${subject}\nFrom: ${from}\nDate: ${date}\n\n${bodyText}`;
      extracted = await extractReceiptFromText(enrichedText);
      source = 'email';
    } else {
      return NextResponse.json(
        { error: 'No usable receipt content found in this email' },
        { status: 422 }
      );
    }

    // ── 3. Insert receipt ────────────────────────────────────
    const { data: receipt, error: insertError } = await supabase
      .from('receipts')
      .insert({
        source,
        original_filename: originalFilename ?? `email-${Date.now()}.txt`,
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
        notes: extracted.notes
          ? `${extracted.notes}\n\nSource email: ${subject} (from ${from})`
          : `Source email: ${subject} (from ${from})`,
        status: 'processed',
      })
      .select()
      .single();

    if (insertError || !receipt) {
      console.error('DB insert error:', insertError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // ── 4. Insert line items ─────────────────────────────────
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

    // ── 5. Telegram notification ─────────────────────────────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    await sendReceiptNotification(extracted, receipt.id, appUrl);
    await supabase.from('receipts').update({ telegram_sent: true }).eq('id', receipt.id);

    return NextResponse.json({
      success: true,
      receiptId: receipt.id,
      vendor: extracted.vendor_name,
      total: extracted.total_amount,
    });

  } catch (error) {
    console.error('Email receipt processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
