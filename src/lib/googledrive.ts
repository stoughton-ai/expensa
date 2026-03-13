import { google } from 'googleapis';

// Lazily initialise the Drive client using OAuth2 refresh token
function getDriveClient() {
  const clientId     = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn('Google Drive not configured — skipping upload');
    return null;
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
  auth.setCredentials({ refresh_token: refreshToken });

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
    const { Readable } = await import('stream');

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

    return res.data.webViewLink ?? null;
  } catch (err) {
    console.error('Google Drive upload error:', err);
    return null;
  }
}
