import { google } from 'googleapis';
import { Readable } from 'stream';

// Lazily initialise the Drive client so missing env vars don't crash at import time
function getDriveClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key   = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) return null;

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Upload a receipt image/PDF to the configured Google Drive folder.
 * Returns the web-view URL of the uploaded file, or null if Drive is not configured.
 */
export async function uploadReceiptToDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string | null> {
  const drive    = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!drive || !folderId) return null;

  try {
    const res = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: 'id, webViewLink',
    });

    // Make the file viewable by anyone with the link
    await drive.permissions.create({
      fileId: res.data.id!,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    return res.data.webViewLink ?? null;
  } catch (err) {
    // Drive upload is non-critical — log and continue
    console.error('Google Drive upload error:', err);
    return null;
  }
}
