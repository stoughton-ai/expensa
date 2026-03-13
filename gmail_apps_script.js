/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          EXPENSA — Gmail Receipt Monitor                     ║
 * ║          Google Apps Script                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * SETUP INSTRUCTIONS (one time, ~5 minutes):
 * ─────────────────────────────────────────
 * 1. Go to https://script.google.com  →  New Project
 * 2. Delete the default code and paste THIS entire file
 * 3. Fill in YOUR values in the CONFIG section below
 * 4. Click Save (💾), then Run → setupGmailFilter()
 *    (This creates "Receipts" label + filter in your Gmail)
 * 5. Click Run → createTimeTrigger()
 *    (This runs the script every 5 minutes automatically)
 * 6. Allow the permissions Google asks for
 *
 * HOW IT WORKS:
 * ─────────────
 * • Gmail Filter:  Any email you label "Receipts" gets picked up
 * • Apps Script:   Runs every 5 min, finds new "Receipts" emails
 * • Processing:    Sends email body / attachments to Expensa API
 * • AI:            Gemini extracts all receipt data automatically
 * • Confirmation:  Email is starred ⭐ so it's never processed twice
 * • Telegram:      You get a Telegram notification for each receipt
 *
 * FORWARDING A RECEIPT MANUALLY:
 * ───────────────────────────────
 * Just label any email in Gmail as "Receipts" and it will be
 * picked up and processed within 5 minutes.
 *
 * Or set up a Gmail filter:
 *   From: noreply@amazon.co.uk  →  Apply label: Receipts
 */

// ══════════════════════════════════════════════════════════════
// CONFIG — Fill in your values here
// ══════════════════════════════════════════════════════════════
const CONFIG = {
  // Your deployed Expensa URL (e.g. https://expensa.vercel.app)
  // For local testing use ngrok: https://your-ngrok-url.ngrok.io
  EXPENSA_URL: 'https://your-expensa-app.vercel.app',

  // Must exactly match EXPENSA_EMAIL_SECRET in your .env.local
  SECRET_TOKEN: 'your_secret_token_here',

  // The Gmail label to watch for (created automatically by setupGmailFilter)
  GMAIL_LABEL: 'Receipts',

  // Max attachment size to send (bytes). 10MB default.
  MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024,
};
// ══════════════════════════════════════════════════════════════


/**
 * MAIN FUNCTION — called every 5 minutes by the time trigger.
 * Finds all unprocessed emails with the "Receipts" label and
 * sends them to Expensa for AI processing.
 */
function processReceiptEmails() {
  const label = GmailApp.getUserLabelByName(CONFIG.GMAIL_LABEL);
  if (!label) {
    Logger.log('⚠️  Label "' + CONFIG.GMAIL_LABEL + '" not found. Run setupGmailFilter() first.');
    return;
  }

  // Get threads with this label that aren't starred (not yet processed)
  const threads = label.getThreads();
  let processed = 0;
  let skipped = 0;

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const message of messages) {
      // Skip already-processed messages (we star them after processing)
      if (message.isStarred()) {
        skipped++;
        continue;
      }

      try {
        Logger.log('📧 Processing: ' + message.getSubject());
        const result = sendToExpensa(message);

        if (result.success) {
          // Mark as processed — star the message so we skip it next time
          message.star();
          Logger.log('✅ Saved receipt: ' + (result.vendor || 'Unknown vendor') +
            ' — £' + (result.total || '?'));
          processed++;
        } else {
          Logger.log('⚠️  Skipped (no receipt content): ' + message.getSubject());
          // Star it anyway so we don't keep retrying non-receipt emails
          message.star();
        }

      } catch (error) {
        Logger.log('❌ Error processing: ' + message.getSubject() + ' — ' + error.message);
        // Don't star it — we'll retry next run
      }
    }
  }

  Logger.log('Run complete. Processed: ' + processed + ', Skipped: ' + skipped);
}


/**
 * Extracts content from a Gmail message and sends it to Expensa.
 */
function sendToExpensa(message) {
  const payload = {
    subject: message.getSubject(),
    from: message.getFrom(),
    date: message.getDate().toISOString(),
    bodyText: message.getPlainBody(),
    attachments: [],
  };

  // ── Gather image/PDF attachments ────────────────────────────
  const attachments = message.getAttachments();
  for (const att of attachments) {
    const mimeType = att.getContentType();
    const size = att.getSize();

    const isReceipt = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'application/pdf',
    ].includes(mimeType);

    if (isReceipt && size <= CONFIG.MAX_ATTACHMENT_SIZE) {
      payload.attachments.push({
        filename: att.getName(),
        mimeType: mimeType,
        data: Utilities.base64Encode(att.getBytes()),
      });
      Logger.log('  📎 Attachment: ' + att.getName() + ' (' + mimeType + ', ' + Math.round(size / 1024) + 'KB)');
    }
  }

  // ── POST to Expensa API ──────────────────────────────────────
  const response = UrlFetchApp.fetch(
    CONFIG.EXPENSA_URL + '/api/receipts/email',
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-expensa-secret': CONFIG.SECRET_TOKEN,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    }
  );

  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (statusCode === 200 || statusCode === 201) {
    return JSON.parse(responseText);
  } else if (statusCode === 422) {
    // No receipt content — not an error, just not a receipt email
    return { success: false };
  } else {
    throw new Error('Expensa API error ' + statusCode + ': ' + responseText);
  }
}


/**
 * ONE-TIME SETUP — Run this once to create the Gmail label.
 * After running it, you can manually apply "Receipts" label to
 * any email, or set up Gmail filters to do it automatically.
 */
function setupGmailFilter() {
  // Create the label if it doesn't exist
  let label = GmailApp.getUserLabelByName(CONFIG.GMAIL_LABEL);
  if (!label) {
    label = GmailApp.createLabel(CONFIG.GMAIL_LABEL);
    Logger.log('✅ Created Gmail label: ' + CONFIG.GMAIL_LABEL);
  } else {
    Logger.log('ℹ️  Label "' + CONFIG.GMAIL_LABEL + '" already exists.');
  }

  Logger.log('');
  Logger.log('═══════════════════════════════════════════════');
  Logger.log('NEXT STEP: Set up Gmail Filters (optional but recommended)');
  Logger.log('───────────────────────────────────────────────');
  Logger.log('Go to Gmail → Settings → Filters → Create filter');
  Logger.log('');
  Logger.log('Suggested filters to create:');
  Logger.log('  • Subject contains "receipt" → Label: Receipts');
  Logger.log('  • Subject contains "invoice" → Label: Receipts');
  Logger.log('  • Subject contains "order confirmation" → Label: Receipts');
  Logger.log('  • From: noreply@amazon.co.uk → Label: Receipts');
  Logger.log('  • From: receipts@stripe.com → Label: Receipts');
  Logger.log('───────────────────────────────────────────────');
  Logger.log('You can also manually label any email "Receipts"');
  Logger.log('and it will be processed within 5 minutes.');
  Logger.log('═══════════════════════════════════════════════');
}


/**
 * ONE-TIME SETUP — Run this once to create the 5-minute trigger.
 * After this, processReceiptEmails() runs automatically every 5 min.
 */
function createTimeTrigger() {
  // Remove any existing triggers for this function to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'processReceiptEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Create a new 5-minute trigger
  ScriptApp.newTrigger('processReceiptEmails')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('✅ Trigger created! processReceiptEmails() will run every 5 minutes.');
  Logger.log('   View all triggers: Extensions → Apps Script → Triggers (⏰)');
}


/**
 * UTILITY — Run this to test the connection to your Expensa server.
 * Check the Logs (View → Logs) to see the result.
 */
function testConnection() {
  const response = UrlFetchApp.fetch(
    CONFIG.EXPENSA_URL + '/api/stats',
    { muteHttpExceptions: true }
  );
  const code = response.getResponseCode();
  if (code === 200) {
    Logger.log('✅ Connected to Expensa successfully!');
    Logger.log('   Response: ' + response.getContentText().substring(0, 200));
  } else {
    Logger.log('❌ Could not connect. Status: ' + code);
    Logger.log('   Check your EXPENSA_URL in CONFIG.');
  }
}
