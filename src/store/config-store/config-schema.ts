import { z } from 'zod'

const sstModelEnum = z.enum([
  'tiny.en',
  'base.en',
  'small.en',
  'medium.en',
  'large.en',

  'tiny',
  'base',
  'small',
  'medium',
  'large',

  'large-v1',
  'large-v2',
  'large-v3',
  'large-v3-turbo',
])

export const whisperBackendEnum = z.enum([
  'auto',
  'cpu',
  'cuda',
  'vulkan',
  'metal',
])

export const llmBackendEnum = z.enum(['auto', 'cpu', 'cuda', 'vulkan', 'metal'])

const llmModelObjectSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('online'),
    onlineModelId: z.string(),
  }),
  z.object({
    source: z.literal('local'),
    localModelId: z.string(),
  }),
])

const presetObjectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('normal') }),
  z.object({ type: z.literal('prompt') }),
  z.object({ type: z.literal('formal') }),
  z.object({ type: z.literal('email') }),
  z.object({
    type: z.literal('custom'),
    prompt: z.string(),
  }),
])

export const settingsSchema = z.object({
  startOnLogin: z.boolean().default(false),
  ignoreClipboard: z.boolean().default(false),
  computeTechnology: z
    .enum(['auto', 'cpu', 'cuda', 'vulkan', 'metal'])
    .default('auto'),
})

export const onlineLlmSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: z.string(),
  apiKey: z.string(),
  baseUrl: z.string(),
})

export const userSchema = z.object({
  name: z.string().optional(),
})

export const profileLocalModeSchema = z.object({
  sstModel: sstModelEnum.optional(),
})

export const profileHybridModeSchema = z.object({
  sstModel: sstModelEnum.optional(),
  llmModel: llmModelObjectSchema.optional(),
  preset: presetObjectSchema.optional(),
})

export const profileOnlineModeSchema = z.object({
  llmModel: llmModelObjectSchema.optional(),
  preset: presetObjectSchema.optional(),
})

export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),

  hotkey: z.string().optional(),
  language: z.string().optional().default('en'),

  mode: z.enum(['local', 'hybrid', 'online']).default('local'),

  localMode: profileLocalModeSchema.optional(),
  hybridMode: profileHybridModeSchema.optional(),
  onlineMode: profileOnlineModeSchema.optional(),
})

export const configSchema = z.object({
  user: userSchema.default({}),

  settings: settingsSchema.default({
    computeTechnology: 'auto',
    ignoreClipboard: false,
    startOnLogin: false,
  }),

  profiles: profileSchema.array().default([]),

  onlineLlms: onlineLlmSchema.array().default([]),

  llmBackend: llmBackendEnum.default('auto'),
  whisperBackend: whisperBackendEnum.default('auto'),
})

export type TSSTName = z.infer<typeof sstModelEnum>
export type TProfileMode = z.infer<typeof profileSchema>['mode']

export type TLLMBackend = z.infer<typeof llmBackendEnum>
export type TWhisperBackend = z.infer<typeof whisperBackendEnum>

export type TProfileLocalModeSchema = z.infer<typeof profileLocalModeSchema>
export type TProfileHybridModeSchema = z.infer<typeof profileHybridModeSchema>
export type TProfileOnlineModeSchema = z.infer<typeof profileOnlineModeSchema>

export type TUserSchema = z.infer<typeof userSchema>
export type TSettingsSchema = z.infer<typeof settingsSchema>

export type TProfileSchema = z.infer<typeof profileSchema>
export type TOnlineLlmSchema = z.infer<typeof onlineLlmSchema>

export type TConfigSchema = z.infer<typeof configSchema>
