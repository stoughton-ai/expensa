import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// ─── Schema for extracted receipt data ───────────────────────────────────────
export const ReceiptSchema = z.object({
  vendor_name: z.string().nullable(),
  vendor_address: z.string().nullable(),
  transaction_date: z.string().nullable(), // ISO 8601
  currency: z.string().nullable(),         // 3-letter code
  line_items: z.array(z.object({
    description: z.string(),
    quantity: z.number().nullable(),
    unit_price: z.number().nullable(),
    total_price: z.number().nullable(),
  })),
  subtotal: z.number().nullable(),
  tax_amount: z.number().nullable(),
  total_amount: z.number().nullable(),
  payment_method: z.string().nullable(),
  receipt_number: z.string().nullable(),
  category: z.string().nullable(),
  notes: z.string().nullable(),
});

export type ExtractedReceipt = z.infer<typeof ReceiptSchema>;

const EXTRACTION_PROMPT = `You are an expert receipt analysis AI. Extract ALL data from this receipt image into a valid JSON object.

Required JSON structure:
{
  "vendor_name": "string or null",
  "vendor_address": "string or null",
  "transaction_date": "ISO 8601 date string (YYYY-MM-DD) or null",
  "currency": "3-letter currency code (e.g. GBP, USD, EUR) or null",
  "line_items": [
    {
      "description": "item name",
      "quantity": number or null,
      "unit_price": number or null,
      "total_price": number or null
    }
  ],
  "subtotal": number or null,
  "tax_amount": number or null,
  "total_amount": number or null,
  "payment_method": "string or null (e.g. Cash, Visa, Mastercard)",
  "receipt_number": "string or null",
  "category": "string or null (e.g. Groceries, Restaurant, Transport, Clothing, Electronics, Healthcare, Entertainment, Other)",
  "notes": "any additional relevant information or null"
}

Rules:
- Return ONLY valid JSON, no markdown, no explanation
- All monetary values must be plain numbers (not strings)
- If a value cannot be determined, use null
- Include ALL line items visible on the receipt
- Infer the currency from symbols (£=GBP, $=USD, €=EUR) or text
- Infer the category from the vendor and items`;

export async function extractReceiptFromImage(
  imageBase64: string,
  mimeType: string
): Promise<ExtractedReceipt> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const result = await model.generateContent([
    EXTRACTION_PROMPT,
    {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      },
    },
  ]);

  const text = result.response.text().trim();
  
  // Strip markdown code fences if present
  const jsonStr = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
  
  const parsed = JSON.parse(jsonStr);
  return ReceiptSchema.parse(parsed);
}

export async function extractReceiptFromText(text: string): Promise<ExtractedReceipt> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const result = await model.generateContent([
    EXTRACTION_PROMPT,
    `Receipt text content:\n\n${text}`,
  ]);

  const responseText = result.response.text().trim();
  const jsonStr = responseText.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
  
  const parsed = JSON.parse(jsonStr);
  return ReceiptSchema.parse(parsed);
}
