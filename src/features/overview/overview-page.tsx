import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { loadAppState, startRunner } from '../app-state/queries'
import { OverviewMetricsSection } from './overview-metrics'

export function OverviewPage() {
  const queryClient = useQueryClient()
  const appStateQuery = useQuery({
    queryKey: ['app-state'],
    queryFn: loadAppState,
    refetchInterval: 15000,
  })

  const startRunnerMutation = useMutation({
    mutationFn: startRunner,
    onSuccess: async (status) => {
      toast.success(status.isRunning ? 'Runner is active' : 'Runner started')
      await queryClient.invalidateQueries({ queryKey: ['app-state'] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (appStateQuery.isLoading || !appStateQuery.data) {
    return (
      <div className="text-muted-foreground py-8 text-sm">Loading data...</div>
    )
  }

  const { dashboard, runner, databasePath } = appStateQuery.data

  return (
    <div className="space-y-10 pb-8">
      <OverviewMetricsSection
        dashboardLastUpdatedAt={dashboard.lastUpdatedAt}
        databasePath={databasePath}
        overview={dashboard.overview}
        productivity={dashboard.productivity}
        runner={runner}
        timeline={dashboard.timeline}
        dailySummaries={dashboard.dailySummaries}
        isRefreshing={appStateQuery.isFetching}
        isStartingRunner={startRunnerMutation.isPending}
        onRefresh={() => void appStateQuery.refetch()}
        onStartRunner={() => startRunnerMutation.mutate()}
      />
    </div>
  )
}
