import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { loadAppState } from '../app-state/queries'

function formatDurationMinutes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 min'
  }

  if (value >= 60) {
    return `${(value / 60).toFixed(1)} hr`
  }

  return `${value.toFixed(1)} min`
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en', { notation: 'compact' }).format(value)
}

function formatMilliseconds(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return 'n/a'
  }

  return `${Math.round(value)} ms`
}

export function SessionHistoryPage() {
  const appStateQuery = useQuery({
    queryKey: ['app-state'],
    queryFn: loadAppState,
    refetchInterval: 15000,
  })

  if (appStateQuery.isLoading || !appStateQuery.data) {
    return (
      <div className="text-muted-foreground py-8 text-sm">Loading data...</div>
    )
  }

  const sessions = appStateQuery.data.dashboard.recentSessions
  const idleSeconds = appStateQuery.data.dashboard.overview.idleSeconds

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-foreground text-3xl font-semibold">
          Session history
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Recent focused stretches and typing session timing.
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          Idle today: {(idleSeconds / 60).toFixed(1)} min
        </p>
      </div>

      {sessions.length > 0 ? (
        <div className="border-border border-t">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="border-border grid gap-3 border-b py-4 text-sm md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr]"
            >
              <div>
                <p className="text-muted-foreground text-xs">Session</p>
                <p className="text-foreground mt-1 font-medium">
                  {format(new Date(session.startedAt), 'MMM d, HH:mm')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Duration</p>
                <p className="text-foreground mt-1 font-medium">
                  {formatDurationMinutes(session.durationMinutes)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Keys</p>
                <p className="text-foreground mt-1 font-medium">
                  {formatCompactNumber(session.keyCount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Interval</p>
                <p className="text-foreground mt-1 font-medium">
                  {formatMilliseconds(session.averageIntervalMs)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Hold</p>
                <p className="text-foreground mt-1 font-medium">
                  {formatMilliseconds(session.averageHoldDurationMs)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="border-border text-muted-foreground border-t pt-4 text-sm">
          No sessions recorded yet.
        </p>
      )}
    </section>
  )
}
