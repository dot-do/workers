/**
 * Auth Snippet - JWT Verification
 *
 * Verifies JWT tokens in the auth cookie. Runs before cache snippet.
 * Uses subrequest to jose worker for verification (snippet can't have bindings).
 *
 * Cookie strategy:
 * - auth: JWT (signed, verified here)
 * - settings: sqid (anonymous ID + preferences)
 * - session: sqid (session tracking)
 */

interface AuthContext {
  userId?: string
  email?: string
  roles?: string[]
}

export async function authSnippet(request: Request): Promise<Response> {
  const cookies = parseCookies(request.headers.get('cookie') || '')
  const authToken = cookies.auth

  let authContext: AuthContext = {}

  if (authToken) {
    try {
      // Verify JWT via jose worker (subrequest)
      const verifyResponse = await fetch('https://jose.workers.do/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: authToken }),
      })

      if (verifyResponse.ok) {
        const payload = await verifyResponse.json()
        authContext = {
          userId: payload.sub,
          email: payload.email,
          roles: payload.roles || [],
        }
      }
    } catch {
      // Invalid token, continue as unauthenticated
    }
  }

  // Add auth context to request headers for downstream
  const modifiedRequest = new Request(request, {
    headers: new Headers(request.headers),
  })

  if (authContext.userId) {
    modifiedRequest.headers.set('x-user-id', authContext.userId)
    modifiedRequest.headers.set('x-user-email', authContext.email || '')
    modifiedRequest.headers.set('x-user-roles', (authContext.roles || []).join(','))
  }

  return fetch(modifiedRequest)
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split('=')
    if (name) cookies[name] = rest.join('=')
  })
  return cookies
}

export default { fetch: authSnippet }
