import { Button } from '@/components/ui/button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  loadRuntimeState,
  loadSettingsState,
  restartRunner,
  saveAppSettings,
  startRunner,
  stopRunner,
} from '../app-state/queries'
import type { AppSettings, RunnerStatus } from '../app-state/types'

const fallbackRunner: RunnerStatus = {
  isRunning: false,
  autostartConfigured: false,
}

export function SettingsPage() {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({
    queryKey: ['settings-state'],
    queryFn: loadSettingsState,
    refetchInterval: 15000,
  })
  const runtimeQuery = useQuery({
    queryKey: ['runtime-state'],
    queryFn: loadRuntimeState,
    refetchInterval: 15000,
  })
  const [settingsDraft, setSettingsDraft] = useState<AppSettings | null>(null)

  useEffect(() => {
    if (settingsQuery.data) {
      setSettingsDraft(settingsQuery.data)
    }
  }, [settingsQuery.data])

  const saveSettingsMutation = useMutation({
    mutationFn: saveAppSettings,
    onSuccess: async () => {
      toast.success('Settings saved')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['settings-state'] }),
        queryClient.invalidateQueries({ queryKey: ['runtime-state'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-state'] }),
      ])
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const startRunnerMutation = useMutation({
    mutationFn: startRunner,
    onSuccess: async () => {
      toast.success('Runner started')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['runtime-state'] }),
        queryClient.invalidateQueries({ queryKey: ['settings-state'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-state'] }),
      ])
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const stopRunnerMutation = useMutation({
    mutationFn: stopRunner,
    onSuccess: async () => {
      toast.success('Runner stopped')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['runtime-state'] }),
        queryClient.invalidateQueries({ queryKey: ['settings-state'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-state'] }),
      ])
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const restartRunnerMutation = useMutation({
    mutationFn: restartRunner,
    onSuccess: async () => {
      toast.success('Runner restarted')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['runtime-state'] }),
        queryClient.invalidateQueries({ queryKey: ['settings-state'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-state'] }),
      ])
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (settingsQuery.isLoading || !settingsDraft) {
    if (settingsQuery.error) {
      return (
        <div className="space-y-2 py-8 text-sm">
          <p className="text-foreground font-medium">
            Unable to load settings.
          </p>
          <p className="text-muted-foreground">{settingsQuery.error.message}</p>
        </div>
      )
    }

    return (
      <div className="text-muted-foreground py-8 text-sm">Loading data...</div>
    )
  }

  const runtime = runtimeQuery.data
  const runner = runtime?.runner ?? fallbackRunner
  const runnerPath = runtime?.runnerPath ?? 'Not resolved yet'
  const permissionHint = runtime?.permissionHint ?? {
    required: false,
    title: 'Runtime status unavailable',
    body:
      runtimeQuery.error?.message ??
      'The native runtime state is not available yet.',
    actionLabel: null,
    actionUrl: null,
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-foreground text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Tune retention and startup behavior.
        </p>
      </div>

      <div className="border-border space-y-5 border-t pt-4">
        <label className="block">
          <span className="text-foreground text-sm font-medium">
            Idle timeout (seconds)
          </span>
          <input
            className="border-input bg-background text-foreground focus:border-ring mt-2 h-11 w-full border px-3 outline-none"
            type="number"
            min={3}
            max={60}
            value={settingsDraft.idleTimeoutSeconds}
            onChange={(event) =>
              setSettingsDraft({
                ...settingsDraft,
                idleTimeoutSeconds: Number(event.currentTarget.value),
              })
            }
          />
        </label>

        <label className="block">
          <span className="text-foreground text-sm font-medium">
            Raw event retention (days)
          </span>
          <input
            className="border-input bg-background text-foreground focus:border-ring mt-2 h-11 w-full border px-3 outline-none"
            type="number"
            min={7}
            max={365}
            value={settingsDraft.retainRawDays}
            onChange={(event) =>
              setSettingsDraft({
                ...settingsDraft,
                retainRawDays: Number(event.currentTarget.value),
              })
            }
          />
        </label>

        <label className="border-border flex items-start gap-3 border-t pt-4 text-sm">
          <input
            className="mt-1 size-4 accent-[var(--primary)]"
            type="checkbox"
            checked={settingsDraft.autostartRunner}
            onChange={(event) =>
              setSettingsDraft({
                ...settingsDraft,
                autostartRunner: event.currentTarget.checked,
              })
            }
          />
          <span>
            <span className="text-foreground block font-medium">
              Start runner on login
            </span>
            <span className="text-muted-foreground mt-1 block">
              Keeps the background collector running independently from the app.
            </span>
          </span>
        </label>

        <div className="border-border flex flex-wrap gap-3 border-t pt-4">
          <Button
            onClick={() => saveSettingsMutation.mutate(settingsDraft)}
            disabled={saveSettingsMutation.isPending}
          >
            {saveSettingsMutation.isPending ? 'Saving…' : 'Save settings'}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              settingsQuery.data && setSettingsDraft(settingsQuery.data)
            }
            disabled={saveSettingsMutation.isPending}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="border-border text-muted-foreground space-y-2 border-t pt-4 text-sm">
        <p className="text-foreground font-medium">{permissionHint.title}</p>
        <p>{permissionHint.body}</p>
        {permissionHint.actionUrl && permissionHint.actionLabel ? (
          <a
            className="text-primary inline-flex underline-offset-4 hover:underline"
            href={permissionHint.actionUrl}
            target="_blank"
            rel="noreferrer"
          >
            {permissionHint.actionLabel}
          </a>
        ) : null}
      </div>

      <div className="border-border text-muted-foreground space-y-2 border-t pt-4 text-sm">
        <p>
          <span className="text-foreground font-medium">Runner path:</span>{' '}
          {runnerPath}
        </p>
        <p>
          <span className="text-foreground font-medium">
            Autostart configured:
          </span>{' '}
          {runner.autostartConfigured ? 'Yes' : 'No'}
        </p>
        <p>
          <span className="text-foreground font-medium">Runner status:</span>{' '}
          {runner.isRunning ? 'Running' : 'Stopped'}
        </p>
        {!runner.isRunning ? (
          <Button
            onClick={() => startRunnerMutation.mutate()}
            disabled={startRunnerMutation.isPending}
          >
            {startRunnerMutation.isPending
              ? 'Starting runner…'
              : 'Start runner'}
          </Button>
        ) : (
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => stopRunnerMutation.mutate()}
              disabled={
                stopRunnerMutation.isPending || restartRunnerMutation.isPending
              }
            >
              {stopRunnerMutation.isPending
                ? 'Stopping runner…'
                : 'Stop runner'}
            </Button>
            <Button
              onClick={() => restartRunnerMutation.mutate()}
              disabled={
                restartRunnerMutation.isPending || stopRunnerMutation.isPending
              }
            >
              {restartRunnerMutation.isPending
                ? 'Restarting runner…'
                : 'Restart runner'}
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
