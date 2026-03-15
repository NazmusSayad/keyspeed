import { format, formatDistanceToNowStrict } from 'date-fns'
import type { DailySummary, RunnerStatus } from '../app-state/types'

export const overviewStats = [
  {
    key: 'todayKeys' as const,
    label: 'Key presses',
  },
  {
    key: 'todayKeysPerMinute' as const,
    label: 'Keys per minute',
  },
  {
    key: 'estimatedWpm' as const,
    label: 'Estimated WPM',
  },
  {
    key: 'averageHoldDurationMs' as const,
    label: 'Avg hold duration',
  },
]

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en', { notation: 'compact' }).format(value)
}

export function formatDurationMinutes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 min'
  }

  if (value >= 60) {
    return `${(value / 60).toFixed(1)} hr`
  }

  return `${value.toFixed(1)} min`
}

export function formatSeconds(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 min'
  }

  if (value >= 3600) {
    return `${(value / 3600).toFixed(1)} hr`
  }

  return `${(value / 60).toFixed(1)} min`
}

export function formatMilliseconds(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return 'n/a'
  }

  return `${Math.round(value)} ms`
}

export function formatTimestampLabel(value: string) {
  return format(new Date(value), 'HH:mm')
}

export function formatRelativeTime(value: string | null) {
  if (!value) {
    return 'Waiting for activity'
  }

  return `${formatDistanceToNowStrict(new Date(value), { addSuffix: true })}`
}

export function renderRunnerStatus(status: RunnerStatus) {
  if (status.isRunning) {
    return 'Runner active'
  }

  if (status.lastError) {
    return 'Runner needs attention'
  }

  return 'Runner stopped'
}

export function OverviewValue({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="border-border border-t py-4 md:px-4 md:py-5">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="text-foreground mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}

export function DailySummaryRow({ summary }: { summary: DailySummary }) {
  return (
    <div className="border-border grid gap-3 border-t py-4 text-sm md:grid-cols-[0.9fr_1fr_1fr_1fr] md:items-center md:gap-4">
      <div className="text-foreground font-medium">
        {format(new Date(`${summary.date}T00:00:00`), 'EEE')}
      </div>

      <div>
        <p className="text-muted-foreground text-xs font-medium">Keys</p>
        <p className="text-foreground mt-1 font-medium">
          {formatCompactNumber(summary.keyCount)}
        </p>
      </div>

      <div>
        <p className="text-muted-foreground text-xs font-medium">Speed</p>
        <p className="text-foreground mt-1 font-medium">
          {summary.estimatedWpm.toFixed(1)} WPM
        </p>
      </div>

      <div>
        <p className="text-muted-foreground text-xs font-medium">Sessions</p>
        <p className="text-foreground mt-1 font-medium">
          {summary.sessionCount} / {summary.burstCount} bursts
        </p>
      </div>
    </div>
  )
}
