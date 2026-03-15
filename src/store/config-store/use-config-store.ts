import { invoke } from '@tauri-apps/api/core'
import * as autoStart from '@tauri-apps/plugin-autostart'
import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { readUserConfig, writeUserConfig } from './config-fs'
import {
  llmBackendEnum,
  onlineLlmSchema,
  settingsSchema,
  TLLMBackend,
  TOnlineLlmSchema,
  TProfileSchema,
  TSettingsSchema,
  TUserSchema,
  TWhisperBackend,
  userSchema,
  whisperBackendEnum,
} from './config-schema'

type InitialState = {
  user: TUserSchema
  settings: TSettingsSchema

  profiles: TProfileSchema[]

  onlineLlms: TOnlineLlmSchema[]

  llmBackend: TLLMBackend
  whisperBackend: TWhisperBackend

  autostartEnabled: boolean
}

type THotkeyProfileSnapshot = {
  id: string
  hotkey?: string
}

function normalizeHotkey(hotkey?: string) {
  const normalized = hotkey?.trim()
  if (!normalized) {
    return undefined
  }

  return normalized
}

function toHotkeyProfileSnapshots(
  profiles: TProfileSchema[]
): THotkeyProfileSnapshot[] {
  return profiles.map((profile) => ({
    id: profile.id,
    hotkey: normalizeHotkey(profile.hotkey),
  }))
}

function hasHotkeyProfileChanges(
  previousProfiles: THotkeyProfileSnapshot[],
  nextProfiles: THotkeyProfileSnapshot[]
) {
  const previousMap = new Map(
    previousProfiles.map((profile) => [profile.id, profile.hotkey])
  )
  const nextMap = new Map(
    nextProfiles.map((profile) => [profile.id, profile.hotkey])
  )

  if (previousMap.size !== nextMap.size) {
    return true
  }

  for (const [profileId, previousHotkey] of previousMap) {
    if (!nextMap.has(profileId)) {
      return true
    }

    if (nextMap.get(profileId) !== previousHotkey) {
      return true
    }
  }

  return false
}

async function getInitialState(): Promise<InitialState> {
  const userConfig = await readUserConfig()

  const resolvedOnlineLlms =
    userConfig?.onlineLlms ?? onlineLlmSchema.array().parse([])

  const resolvedProfiles = userConfig?.profiles ?? []

  const resolvedUser = userConfig?.user ?? userSchema.parse({})
  const resolvedSettings = userConfig?.settings ?? settingsSchema.parse({})

  return {
    user: resolvedUser,
    settings: resolvedSettings,

    profiles: resolvedProfiles,

    onlineLlms: resolvedOnlineLlms,

    llmBackend: userConfig?.llmBackend ?? llmBackendEnum.parse('auto'),
    whisperBackend:
      userConfig?.whisperBackend ?? whisperBackendEnum.parse('auto'),

    autostartEnabled: await autoStart.isEnabled(),
  }
}

const initialState = await getInitialState()

export const useConfigStore = create(
  combine(initialState, (set) => ({
    setSettings(settings: TSettingsSchema) {
      return set({ settings })
    },

    updateSettings(updates: Partial<TSettingsSchema>) {
      return set((prev) => ({
        settings: { ...prev.settings, ...updates },
      }))
    },

    setUser(user: TUserSchema) {
      return set({ user })
    },

    updateUser(updates: Partial<TUserSchema>) {
      return set((prev) => ({
        user: { ...prev.user, ...updates },
      }))
    },

    setProfiles(profiles: TProfileSchema[]) {
      return set({ profiles })
    },

    addProfile(profile: TProfileSchema) {
      return set((prev) => ({
        profiles: [...prev.profiles, profile],
      }))
    },

    removeProfile(id: string) {
      return set((prev) => ({
        profiles: prev.profiles.filter((profile) => profile.id !== id),
      }))
    },

    updateProfile(id: string, updates: Partial<TProfileSchema>) {
      return set((prev) => ({
        profiles: prev.profiles.map((profile) =>
          profile.id === id ? { ...profile, ...updates } : profile
        ),
      }))
    },

    setOnlineLlms(llms: TOnlineLlmSchema[]) {
      return set({ onlineLlms: llms })
    },

    addOnlineLlm(llm: TOnlineLlmSchema) {
      return set((prev) => ({
        onlineLlms: [...prev.onlineLlms, llm],
      }))
    },

    removeOnlineLlm(id: string) {
      return set((prev) => ({
        onlineLlms: prev.onlineLlms.filter((llm) => llm.id !== id),
      }))
    },

    updateOnlineLlm(id: string, updates: Partial<TOnlineLlmSchema>) {
      return set((prev) => ({
        onlineLlms: prev.onlineLlms.map((llm) =>
          llm.id === id ? { ...llm, ...updates } : llm
        ),
      }))
    },

    setLlmBackend(backend: TLLMBackend) {
      return set({ llmBackend: backend })
    },

    setWhisperBackend(backend: TWhisperBackend) {
      return set({ whisperBackend: backend })
    },

    async setAutostartEnabled(enabled: boolean) {
      if (enabled) {
        await autoStart.enable()
      } else {
        await autoStart.disable()
      }

      return set({ autostartEnabled: enabled })
    },
  }))
)

console.log('initial state', initialState)
let configWriteQueue = Promise.resolve()

useConfigStore.subscribe((state, previousState) => {
  const previousProfiles = toHotkeyProfileSnapshots(previousState.profiles)
  const nextProfiles = toHotkeyProfileSnapshots(state.profiles)
  const shouldSyncHotkeys = hasHotkeyProfileChanges(
    previousProfiles,
    nextProfiles
  )

  configWriteQueue = configWriteQueue
    .then(async () => {
      console.log('writing config', state)

      await writeUserConfig({
        user: state.user,
        settings: state.settings,

        profiles: state.profiles,

        onlineLlms: state.onlineLlms,

        llmBackend: state.llmBackend,
        whisperBackend: state.whisperBackend,
      })

      if (!shouldSyncHotkeys) {
        return
      }

      await invoke('sync_profile_hotkeys_command', {
        previousProfiles,
        nextProfiles,
      })
    })
    .catch((error) => {
      console.error('failed to persist config state', error)
    })
})
