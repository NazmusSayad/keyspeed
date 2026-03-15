import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  loadDashboardState,
  loadRuntimeState,
  startRunner,
} from '../app-state/queries'
import type { RunnerStatus } from '../app-state/types'
import { OverviewMetricsSection } from './overview-metrics'

const fallbackRunner: RunnerStatus = {
  isRunning: false,
  autostartConfigured: false,
}

export function OverviewPage() {
  const queryClient = useQueryClient()
  const dashboardQuery = useQuery({
    queryKey: ['dashboard-state'],
    queryFn: loadDashboardState,
    refetchInterval: 15000,
  })
  const runtimeQuery = useQuery({
    queryKey: ['runtime-state'],
    queryFn: loadRuntimeState,
    refetchInterval: 15000,
  })

  const startRunnerMutation = useMutation({
    mutationFn: startRunner,
    onSuccess: async (status) => {
      toast.success(status.isRunning ? 'Runner is active' : 'Runner started')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard-state'] }),
        queryClient.invalidateQueries({ queryKey: ['runtime-state'] }),
        queryClient.invalidateQueries({ queryKey: ['settings-state'] }),
      ])
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (dashboardQuery.isLoading || !dashboardQuery.data) {
    if (dashboardQuery.error) {
      return (
        <div className="space-y-2 py-8 text-sm">
          <p className="text-foreground font-medium">
            Unable to load overview.
          </p>
          <p className="text-muted-foreground">
            {dashboardQuery.error.message}
          </p>
        </div>
      )
    }

    return (
      <div className="text-muted-foreground py-8 text-sm">Loading data...</div>
    )
  }

  const { dashboard } = dashboardQuery.data
  const runtime = runtimeQuery.data

  return (
    <div className="space-y-10 pb-8">
      <OverviewMetricsSection
        dashboardLastUpdatedAt={dashboard.lastUpdatedAt}
        databasePath={runtime?.databasePath ?? 'Not available'}
        overview={dashboard.overview}
        productivity={dashboard.productivity}
        runner={runtime?.runner ?? fallbackRunner}
        timeline={dashboard.timeline}
        dailySummaries={dashboard.dailySummaries}
        isRefreshing={dashboardQuery.isFetching || runtimeQuery.isFetching}
        isStartingRunner={startRunnerMutation.isPending}
        onRefresh={() => {
          void dashboardQuery.refetch()
          void runtimeQuery.refetch()
        }}
        onStartRunner={() => startRunnerMutation.mutate()}
      />
    </div>
  )
}
