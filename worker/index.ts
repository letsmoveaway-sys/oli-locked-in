import { handleApi } from './api/router'
import type { Env } from './types'

function withSecurityHeaders(response: Response, production: boolean): Response {
  const secured = new Response(response.body, response)
  secured.headers.set('X-Content-Type-Options', 'nosniff')
  secured.headers.set('Referrer-Policy', 'no-referrer')
  secured.headers.set('X-Frame-Options', 'DENY')
  secured.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  secured.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'")
  if (production) secured.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  return secured
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID()
    try {
      const url = new URL(request.url)
      if (env.ENVIRONMENT === 'production' && url.protocol === 'http:') {
        url.protocol = 'https:'
        return Response.redirect(url, 308)
      }

      const response = url.pathname.startsWith('/api/')
        ? await handleApi(request, env)
        : await env.ASSETS.fetch(request)
      const secured = withSecurityHeaders(response, env.ENVIRONMENT === 'production')
      secured.headers.set('X-Request-ID', requestId)
      return secured
    } catch (error) {
      console.error(JSON.stringify({
        event: 'unhandled_request_error', requestId, method: request.method,
        path: new URL(request.url).pathname, error: error instanceof Error ? error.name : 'UnknownError',
      }))
      const secured = withSecurityHeaders(Response.json(
        { error: { code: 'INTERNAL_ERROR', message: 'The service could not complete the request.' } },
        { status: 500, headers: { 'Cache-Control': 'no-store' } },
      ), env.ENVIRONMENT === 'production')
      secured.headers.set('X-Request-ID', requestId)
      return secured
    }
  },
} satisfies ExportedHandler<Env>
