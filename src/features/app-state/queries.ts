import { invoke } from '@tauri-apps/api/core'
import type {
  AppSettings,
  DashboardStatePayload,
  RunnerStatus,
  RuntimeStatePayload,
} from './types'

const isTauri =
  typeof window !== 'undefined' &&
  typeof window === 'object' &&
  '__TAURI_INTERNALS__' in window

export async function loadDashboardState() {
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
    } satisfies DashboardStatePayload
  }

  return invoke<DashboardStatePayload>('load_overview_state')
}

export async function loadRuntimeState() {
  if (!isTauri) {
    return {
      runner: {
        isRunning: false,
        autostartConfigured: false,
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
    } satisfies RuntimeStatePayload
  }

  return invoke<RuntimeStatePayload>('load_runtime_state')
}

export async function loadSettingsState() {
  if (!isTauri) {
    return {
      idleTimeoutSeconds: 5,
      autostartRunner: true,
      retainRawDays: 30,
      captureActiveApp: false,
    } satisfies AppSettings
  }

  return invoke<AppSettings>('load_settings_state')
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
    } satisfies RunnerStatus
  }

  return invoke<RunnerStatus>('start_runner')
}

export async function stopRunner() {
  if (!isTauri) {
    return {
      isRunning: false,
      autostartConfigured: false,
    } satisfies RunnerStatus
  }

  return invoke<RunnerStatus>('stop_runner')
}

export async function restartRunner() {
  if (!isTauri) {
    return {
      isRunning: false,
      autostartConfigured: false,
    } satisfies RunnerStatus
  }

  return invoke<RunnerStatus>('restart_runner')
}
