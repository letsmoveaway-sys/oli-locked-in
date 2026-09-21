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
    try {
      const response = await handleApi(request, env)
      return withSecurityHeaders(response, env.ENVIRONMENT === 'production')
    } catch (error) {
      console.error('Unhandled API error', error instanceof Error ? error.message : 'Unknown error')
      return withSecurityHeaders(Response.json(
        { error: { code: 'INTERNAL_ERROR', message: 'The service could not complete the request.' } },
        { status: 500, headers: { 'Cache-Control': 'no-store' } },
      ), env.ENVIRONMENT === 'production')
    }
  },
} satisfies ExportedHandler<Env>
