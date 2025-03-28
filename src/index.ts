import { OpenAPIHono as Hono } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { Context, Next } from 'hono'
import { cache } from 'hono/cache'
import { compress } from 'hono/compress'
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { timeout } from 'hono/timeout'
import { ZodError } from 'zod'
import { app as threads } from './threads'
import type { Bindings } from './utils/bindings'
import { reference, specification } from './utils/openapi'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.tz.setDefault('Asia/Tokyo')

const app = new Hono<{ Bindings: Bindings }>()
app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
  in: 'header',
  description: 'Bearer Token'
})

app.use('*', timeout(5000))
app.use(logger())
app.use(csrf())
app.use(cors())
app.use(compress({ encoding: 'deflate' }))
app.use('*', (c, next) => {
  if (new URL(c.req.url).hostname !== 'localhost') {
    cache({ cacheName: 'discord_stripe_store', cacheControl: 'public, max-age=3600' })
  }
  return next()
})
app.onError(async (error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ message: error.message }, error.status)
  }
  if (error instanceof ZodError) {
    return c.json({ message: JSON.parse(error.message), description: error.name }, 400)
  }
  console.error(error)
  return c.json({ message: error.message }, 500)
})
app.route('/threads', threads)
app.doc31('/openapi.json', specification)
// app.getOpenAPI31Document(specification)
app.get('/docs', apiReference(reference))
app.notFound((c) => c.redirect('/docs'))

export default {
  port: 3000,
  fetch: app.fetch
}
