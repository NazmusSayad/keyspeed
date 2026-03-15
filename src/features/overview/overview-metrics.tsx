import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNowStrict } from 'date-fns'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  DailySummary,
  OverviewMetrics,
  ProductivityMetrics,
  RunnerStatus,
  TimelinePoint,
} from '../app-state/types'
import {
  DailySummaryRow,
  OverviewValue,
  formatCompactNumber,
  formatDurationMinutes,
  formatMilliseconds,
  formatSeconds,
  formatTimestampLabel,
  overviewStats,
  renderRunnerStatus,
} from './overview-parts'

interface OverviewMetricsProps {
  dashboardLastUpdatedAt: string | null
  databasePath: string
  overview: OverviewMetrics
  productivity: ProductivityMetrics
  runner: RunnerStatus
  timeline: TimelinePoint[]
  dailySummaries: DailySummary[]
  isRefreshing: boolean
  isStartingRunner: boolean
  onRefresh: () => void
  onStartRunner: () => void
}

export function OverviewMetricsSection({
  dashboardLastUpdatedAt,
  databasePath,
  overview,
  productivity,
  runner,
  timeline,
  dailySummaries,
  isRefreshing,
  isStartingRunner,
  onRefresh,
  onStartRunner,
}: OverviewMetricsProps) {
  return (
    <>
      <section className="border-border space-y-4 border-b pb-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-primary text-sm font-medium">Overview</p>
            <h1 className="text-foreground text-4xl font-semibold md:text-5xl">
              Typing analytics without storing typed text.
            </h1>
            <p className="text-muted-foreground max-w-2xl text-base leading-7">
              Keyspeed records timing, pace, and sessions only. Passwords, key
              values, and clipboard content stay out of the database.
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <p
              className={cn(
                'font-medium',
                runner.isRunning ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {renderRunnerStatus(runner)}
            </p>
            <p className="text-muted-foreground">
              Last sync{' '}
              {dashboardLastUpdatedAt
                ? formatDistanceToNowStrict(new Date(dashboardLastUpdatedAt), {
                    addSuffix: true,
                  })
                : 'not available yet'}
            </p>
            <p className="text-muted-foreground">Database: {databasePath}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              {!runner.isRunning ? (
                <Button onClick={onStartRunner} disabled={isStartingRunner}>
                  {isStartingRunner ? 'Starting runner…' : 'Start runner'}
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Refreshing…' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-x-6 md:grid-cols-2 xl:grid-cols-4">
        {overviewStats.map((item) => (
          <OverviewValue
            key={item.key}
            label={item.label}
            value={
              item.key === 'todayKeys'
                ? formatCompactNumber(overview.todayKeys)
                : item.key === 'todayKeysPerMinute'
                  ? overview.todayKeysPerMinute.toFixed(1)
                  : item.key === 'estimatedWpm'
                    ? overview.estimatedWpm.toFixed(1)
                    : formatMilliseconds(overview.averageHoldDurationMs)
            }
          />
        ))}
      </section>

      <section className="border-border grid gap-10 border-t pt-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-foreground text-base font-medium">
                Activity timeline
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Last 24 hours of active typing
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              {formatCompactNumber(overview.totalKeyPresses)} total presses
              tracked
            </p>
          </div>

          {timeline.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient
                      id="overview-timeline-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--primary)"
                        stopOpacity={0.28}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--primary)"
                        stopOpacity={0.04}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatTimestampLabel}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--popover)',
                      color: 'var(--popover-foreground)',
                    }}
                    formatter={(value: number) => [
                      `${value.toFixed(1)} sec`,
                      'Active time',
                    ]}
                    labelFormatter={(value) =>
                      format(new Date(value), 'MMM d, HH:mm')
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="activeSeconds"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#overview-timeline-fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="border-border text-muted-foreground border-t pt-4 text-sm">
              No timeline data yet.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-foreground text-base font-medium">
                Typing pace
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Keys per active minute
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              Avg interval {formatMilliseconds(overview.averageIntervalMs)}
            </p>
          </div>

          {timeline.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={timeline}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatTimestampLabel}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--popover)',
                      color: 'var(--popover-foreground)',
                    }}
                    formatter={(value: number) => [`${value}`, 'Key presses']}
                    labelFormatter={(value) =>
                      format(new Date(value), 'MMM d, HH:mm')
                    }
                  />
                  <Bar
                    dataKey="keyCount"
                    fill="var(--chart-1)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="border-border text-muted-foreground border-t pt-4 text-sm">
              No pace data yet.
            </p>
          )}
        </div>
      </section>

      <section className="border-border grid gap-10 border-t pt-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-foreground text-base font-medium">
                Daily summaries
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Week-over-week typing rhythm
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              {formatSeconds(overview.activeSeconds)} active across retained
              history
            </p>
          </div>

          {dailySummaries.length > 0 ? (
            <div>
              {dailySummaries.map((summary) => (
                <DailySummaryRow key={summary.date} summary={summary} />
              ))}
            </div>
          ) : (
            <p className="border-border text-muted-foreground border-t pt-4 text-sm">
              No daily summaries yet.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-foreground text-base font-medium">
              Productivity analytics
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Derived from typing metadata only
            </p>
          </div>

          <dl className="divide-border border-border divide-y border-t text-sm">
            <MetricRow
              label="Focus score"
              value={productivity.focusScore.toFixed(0)}
            />
            <MetricRow
              label="Consistency"
              value={`${productivity.consistencyScore.toFixed(0)}%`}
            />
            <MetricRow
              label="Burst count"
              value={`${productivity.burstCount}`}
            />
            <MetricRow
              label="Average session"
              value={formatDurationMinutes(productivity.averageSessionMinutes)}
            />
            <MetricRow
              label="Longest session"
              value={formatDurationMinutes(productivity.longestSessionMinutes)}
            />
            <MetricRow
              label="Idle today"
              value={formatSeconds(overview.idleSeconds)}
            />
          </dl>
        </div>
      </section>
    </>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground font-medium">{value}</dd>
    </div>
  )
}
