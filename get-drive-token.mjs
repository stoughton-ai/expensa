/**
 * Run this ONCE locally to get your Google OAuth refresh token.
 * Usage: node /tmp/get-drive-token.mjs YOUR_CLIENT_ID YOUR_CLIENT_SECRET
 *
 * Then paste the printed refresh token into your .env.local and Vercel.
 */
import { google } from 'googleapis';
import * as readline from 'readline';

const [,, clientId, clientSecret] = process.argv;
if (!clientId || !clientSecret) {
  console.error('Usage: node get-drive-token.mjs CLIENT_ID CLIENT_SECRET');
  process.exit(1);
}

const auth = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');

const url = auth.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive.file'],
  prompt: 'consent',
  login_hint: 'stoughton.media@gmail.com',
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. Open this URL in your browser:');
console.log('\n' + url + '\n');
console.log('2. Sign in with your Google account and allow access');
console.log('3. Copy the authorisation code shown and paste it below');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste authorisation code: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await auth.getToken(code.trim());
    console.log('\n✅ Success! Add this to your .env.local and Vercel:\n');
    console.log(`GOOGLE_OAUTH_CLIENT_ID=${clientId}`);
    console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${clientSecret}`);
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\nThe refresh token does not expire — store it securely.\n');
  } catch (err) {
    console.error('❌ Failed to exchange code:', err.message);
  }
});
