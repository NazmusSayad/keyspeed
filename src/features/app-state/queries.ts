import { invoke } from '@tauri-apps/api/core'
import type { AppSettings, AppStatePayload, RunnerStatus } from './types'

const isTauri =
  typeof window !== 'undefined' &&
  typeof window === 'object' &&
  '__TAURI_INTERNALS__' in window

export async function loadAppState() {
  if (!isTauri) {
    return {
      dashboard: {
        overview: {
          totalKeyPresses: 0,
          todayKeys: 0,
          todayKeysPerMinute: 0,
          estimatedWpm: 0,
          weekKeys: 0,
          averageIntervalMs: null,
          averageHoldDurationMs: null,
          activeSeconds: 0,
          idleSeconds: 0,
        },
        timeline: [],
        dailySummaries: [],
        recentSessions: [],
        productivity: {
          focusScore: 0,
          consistencyScore: 0,
          burstCount: 0,
          averageSessionMinutes: 0,
          longestSessionMinutes: 0,
        },
        lastUpdatedAt: null,
      },
      settings: {
        idleTimeoutSeconds: 5,
        autostartRunner: true,
        retainRawDays: 30,
        captureActiveApp: false,
      },
      runner: {
        isRunning: false,
        autostartConfigured: false,
        staleAfterSeconds: 20,
        lastHeartbeatAt: null,
        lastFlushAt: null,
        lastStartedAt: null,
        lastError: null,
      },
      databasePath: 'Not available outside Tauri',
      runnerPath: null,
      permissionHint: {
        required: false,
        title: 'Preview mode',
        body: 'The dashboard is running without the native Tauri backend.',
        actionLabel: null,
        actionUrl: null,
      },
    } satisfies AppStatePayload
  }

  return invoke<AppStatePayload>('load_app_state')
}

export async function saveAppSettings(settings: AppSettings) {
  if (!isTauri) {
    return settings
  }

  return invoke<AppSettings>('save_settings', { settings })
}

export async function startRunner() {
  if (!isTauri) {
    return {
      isRunning: false,
      autostartConfigured: false,
      staleAfterSeconds: 20,
      lastHeartbeatAt: null,
      lastFlushAt: null,
      lastStartedAt: null,
      lastError: null,
    } satisfies RunnerStatus
  }

  return invoke<RunnerStatus>('start_runner')
}
