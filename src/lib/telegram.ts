import { ExtractedReceipt } from './gemini';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export async function sendReceiptNotification(
  receipt: ExtractedReceipt,
  receiptId: string,
  appUrl: string
): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) return;

  const date = receipt.transaction_date ?? 'Unknown date';
  const vendor = receipt.vendor_name ?? 'Unknown vendor';
  const total = receipt.total_amount != null
    ? `${receipt.currency ?? ''} ${receipt.total_amount.toFixed(2)}`
    : 'Unknown total';
  const category = receipt.category ?? 'Uncategorised';
  const itemCount = receipt.line_items.length;

  const lines = receipt.line_items
    .slice(0, 5)
    .map(item => {
      const price = item.total_price != null ? ` — ${receipt.currency ?? ''}${item.total_price.toFixed(2)}` : '';
      return `  • ${item.description}${price}`;
    })
    .join('\n');

  const more = itemCount > 5 ? `\n  ...and ${itemCount - 5} more item(s)` : '';

  const message = `🧾 *New Receipt Captured — Expensa*

📍 *Vendor:* ${escapeMarkdown(vendor)}
📅 *Date:* ${escapeMarkdown(date)}
🏷️ *Category:* ${escapeMarkdown(category)}
💰 *Total:* ${escapeMarkdown(total)}
📦 *Items (${itemCount}):*
${lines}${more}

${receipt.payment_method ? `💳 *Payment:* ${escapeMarkdown(receipt.payment_method)}\n` : ''}`;

  const body = {
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '📂 View Receipt', url: `${appUrl}/receipts/${receiptId}` },
      ]],
    },
  };

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}
