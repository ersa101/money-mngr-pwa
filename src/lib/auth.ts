import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

async function refreshAccessToken(token: any) {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    })
    const refreshed = await res.json()
    if (!res.ok) throw refreshed
    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      // Keep old refresh_token if Google doesn't return a new one
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
    }
  } catch (_err) {
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/drive.file',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, account }) {
      // First sign-in: store all Google tokens
      if (account?.provider === 'google') {
        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + 3600 * 1000,
          refreshToken: account.refresh_token,
        }
      }
      // Token still valid — return as-is
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token
      }
      // Token expired — refresh it
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      if (session.user) {
        // Use email as the stable user identifier (human-readable in GSheet rows).
        // token.sub is the Google OAuth UUID — kept as fallback only.
        session.user.id = (token.email as string) || token.sub || ''
      }
      session.accessToken = token.accessToken as string
      if (token.error) {
        session.error = token.error as string
      }
      return session
    },
  },
})
