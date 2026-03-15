export interface AppSettings {
  idleTimeoutSeconds: number
  autostartRunner: boolean
  retainRawDays: number
  captureActiveApp: boolean
}

export interface OverviewMetrics {
  totalKeyPresses: number
  todayKeys: number
  todayKeysPerMinute: number
  estimatedWpm: number
  weekKeys: number
  averageIntervalMs: number | null
  averageHoldDurationMs: number | null
  activeSeconds: number
  idleSeconds: number
}

export interface TimelinePoint {
  timestamp: string
  keyCount: number
  activeSeconds: number
  averageIntervalMs: number | null
}

export interface DailySummary {
  date: string
  keyCount: number
  activeSeconds: number
  estimatedWpm: number
  sessionCount: number
  burstCount: number
}

export interface SessionSummary {
  id: string
  startedAt: string
  endedAt: string
  durationMinutes: number
  keyCount: number
  averageIntervalMs: number | null
  averageHoldDurationMs: number | null
}

export interface ProductivityMetrics {
  focusScore: number
  consistencyScore: number
  burstCount: number
  averageSessionMinutes: number
  longestSessionMinutes: number
}

export interface RunnerStatus {
  isRunning: boolean
  autostartConfigured: boolean
}

export interface PermissionHint {
  required: boolean
  title: string
  body: string
  actionLabel: string | null
  actionUrl: string | null
}

export interface DashboardPayload {
  overview: OverviewMetrics
  timeline: TimelinePoint[]
  dailySummaries: DailySummary[]
  recentSessions: SessionSummary[]
  productivity: ProductivityMetrics
  lastUpdatedAt: string | null
}

export interface DashboardStatePayload {
  dashboard: DashboardPayload
}

export interface RuntimeStatePayload {
  runner: RunnerStatus
  databasePath: string
  runnerPath: string | null
  permissionHint: PermissionHint
}
