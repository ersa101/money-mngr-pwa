import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// This is a flag to easily disable auth during development or in specific environments.
const isAuthEnabled = !!(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
)

export const config = {
  /*
   * Match all request paths except for the ones starting with:
   * - api (API routes)
   * - login (the login page)
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   * - icons/ (pwa icons)
   * - manifest.json (pwa manifest)
   */
  matcher: [
    '/((?!api|login|_next/static|_next/image|favicon.ico|icons|manifest.json).*)',
  ],
}

export async function middleware(req: NextRequest) {
  // If auth is disabled, do nothing.
  if (!isAuthEnabled) {
    return NextResponse.next()
  }

  const session = await auth()

  // If the user is authenticated, let them proceed.
  if (session?.user) {
    return NextResponse.next()
  }

  // If the user is not authenticated, redirect them to the login page.
  // We are preserving the URL they were trying to access in the `callbackUrl` query parameter.
  const callbackUrl = req.nextUrl.href
  const loginUrl = new URL('/login', req.nextUrl.origin)

  if (callbackUrl) {
    loginUrl.searchParams.set('callbackUrl', callbackUrl)
  }

  return NextResponse.redirect(loginUrl)
}
