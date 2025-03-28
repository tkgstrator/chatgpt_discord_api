import { HTTPMethod } from '@/enums/method'
import { Model } from '@/enums/model'
import { Prompt, Thread, ThreadParam, ThreadPatchBody, ThreadQuery } from '@/models/thread.dto'
import type { Bindings } from '@/utils/bindings'
import { OpenAPIHono as Hono, createRoute, z } from '@hono/zod-openapi'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

export const app = new Hono<{ Bindings: Bindings }>()

const create_thread = (c: Context<{ Bindings: Bindings }>, params: Thread): Thread => {
  c.executionCtx.waitUntil(c.env.ChatGPT_Thread.put(params.thread_id, JSON.stringify(params)))
  return params
}

const update_thread = (c: Context<{ Bindings: Bindings }>, params: Thread, prompt: Prompt): Thread => {
  params.prompts = [...params.prompts, ...[prompt]]
  c.executionCtx.waitUntil(c.env.ChatGPT_Thread.put(params.thread_id, JSON.stringify(params)))
  return params
}

const upsert_thread = async (
  c: Context<{ Bindings: Bindings }>,
  thread_id: string,
  discord_user_id: string,
  prompt: Prompt
): Promise<Thread> => {
  try {
    const thread: Thread = await get_thread(c, thread_id)
    return update_thread(c, thread, prompt)
  } catch (error) {
    return create_thread(
      c,
      Thread.parse({
        model: Model.GPT_4O_MINI,
        thread_id,
        is_private: false,
        discord_user_id,
        prompts: [prompt]
      })
    )
  }
}

const get_thread = async (c: Context<{ Bindings: Bindings }>, thread_id: string): Promise<Thread> => {
  const data: object | null = await c.env.ChatGPT_Thread.get(thread_id, { type: 'json' })
  if (data === null) {
    throw new HTTPException(404, { message: 'Not Found' })
  }
  return Thread.parse(data)
}

const get_threads = async (c: Context<{ Bindings: Bindings }>, limit: number): Promise<Thread[]> => {
  const keys: string[] = (await c.env.ChatGPT_Thread.list({ limit })).keys.map((key) => key.name)
  return (await Promise.allSettled(keys.map((key) => get_thread(c, key))))
    .filter((result) => result.status === 'fulfilled')
    .map((result) => (result as PromiseFulfilledResult<Thread>).value)
}

const delete_thread = async (c: Context<{ Bindings: Bindings }>, thread_id: string): Promise<Thread> => {
  c.executionCtx.waitUntil(c.env.ChatGPT_Thread.delete(thread_id))
  return get_thread(c, thread_id)
}

app.openapi(
  createRoute({
    method: HTTPMethod.GET,
    path: '/',
    alias: 'GetThreads',
    tags: ['Thread'],
    summary: 'List all threads',
    request: {
      query: ThreadQuery
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.array(Thread)
          }
        },
        type: 'application/json',
        description: 'Success'
      }
    }
  }),
  async (c) => {
    return c.json(await get_threads(c, c.req.valid('query').limit))
  }
)

app.openapi(
  createRoute({
    method: HTTPMethod.PATCH,
    path: '/{thread_id}',
    alias: 'PatchThread',
    tags: ['Thread'],
    summary: 'Update a thread',
    request: {
      params: ThreadParam,
      body: {
        content: {
          'application/json': {
            schema: ThreadPatchBody
          }
        },
        required: true
      }
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: Thread
          }
        },
        type: 'application/json',
        description: 'Success'
      },
      400: {
        description: 'Bad Request'
      }
    }
  }),
  async (c) => {
    const thread_id: string = c.req.valid('param').thread_id
    const discord_user_id: string = c.req.valid('json').discord_user_id
    const prompt = Prompt.parse(c.req.valid('json').prompt)
    return c.json(await upsert_thread(c, thread_id, discord_user_id, prompt))
  }
)

app.openapi(
  createRoute({
    method: HTTPMethod.POST,
    path: '/',
    alias: 'PostThread',
    tags: ['Thread'],
    summary: 'Create a thread',
    request: {
      body: {
        content: {
          'application/json': {
            schema: Thread
          }
        },
        required: true
      }
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: Thread
          }
        },
        type: 'application/json',
        description: 'Success'
      },
      400: {
        description: 'Bad Request'
      }
    }
  }),
  async (c) => {
    return c.json(create_thread(c, c.req.valid('json')))
  }
)

app.openapi(
  createRoute({
    method: HTTPMethod.GET,
    path: '/{thread_id}',
    alias: 'GetThread',
    tags: ['Thread'],
    summary: 'Retrieve a thread',
    request: {
      params: z.object({
        thread_id: z.string()
      })
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: Thread
          }
        },
        type: 'application/json',
        description: 'Success'
      }
    }
  }),
  async (c) => {
    return c.json(await get_thread(c, c.req.valid('param').thread_id))
  }
)

app.openapi(
  createRoute({
    method: HTTPMethod.DELETE,
    path: '/{thread_id}',
    tags: ['Thread'],
    summary: 'Delete a thread',
    request: {
      params: ThreadParam
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: Thread
          }
        },
        type: 'application/json',
        description: 'Success'
      }
    }
  }),
  async (c) => {
    return c.json(await delete_thread(c, c.req.valid('param').thread_id))
  }
)
