import { Model } from '@/enums/model'
import { Role } from '@/enums/role'
import { z } from 'zod'

export const Prompt = z
  .object({
    role: z.nativeEnum(Role).default(Role.USER).openapi({
      description: 'Role.',
      example: Role.USER
    }),
    content: z.string().openapi({
      description: 'Given prompt.',
      example: 'Hello, world!'
    })
  })
  .openapi('Prompt')

export const Thread = z
  .object({
    model: z.nativeEnum(Model).openapi({
      description: 'The type of model.',
      example: Model.GPT_4O_MINI
    }),
    thread_id: z.string().openapi({
      description: 'Thread ID.',
      example: '1276016528223109174'
    }),
    is_private: z.boolean().default(false).openapi({
      description: 'Thread is private or not.',
      example: false
    }),
    discord_user_id: z.string().openapi({
      description: 'Discord user ID.',
      example: '430364540899819520'
    }),
    prompts: z.array(Prompt).openapi({
      description: 'List of prompts.',
      example: [
        {
          role: Role.USER,
          content: 'Hello, world!'
        }
      ]
    })
  })
  .openapi('Thread')

export const ThreadParam = z
  .object({
    thread_id: z.string().openapi({
      description: 'Thread ID.',
      example: '1276016528223109174'
    })
  })
  .openapi('ThreadParam')

export const ThreadQuery = z
  .object({
    limit: z.number().min(1).max(100).optional().default(10).openapi({
      description: 'Limit of threads.',
      example: 10
    })
  })
  .openapi('ThreadQuery')

export const ThreadPatchBody = z
  .object({
    discord_user_id: z.string(),
    prompt: Prompt
  })
  .openapi('ThreadPatchBody')

export type Prompt = z.infer<typeof Prompt>
export type Thread = z.infer<typeof Thread>
export type ThreadParam = z.infer<typeof ThreadParam>
export type ThreadQuery = z.infer<typeof ThreadQuery>
export type ThreadPatchBody = z.infer<typeof ThreadPatchBody>
