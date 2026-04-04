import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

// Only this email can sign in
const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_AUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user }) {
      // Block anyone except the allowed email
      if (!ALLOWED_EMAIL || user.email !== ALLOWED_EMAIL) {
        console.warn('Access denied for email:', user.email);
        return false;
      }
      return true;
    },
    async session({ session }) {
      return session;
    },
  },
});
