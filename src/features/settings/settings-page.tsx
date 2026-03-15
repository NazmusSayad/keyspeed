import { Button } from '@/components/ui/button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { loadAppState, saveAppSettings } from '../app-state/queries'
import type { AppSettings } from '../app-state/types'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const appStateQuery = useQuery({
    queryKey: ['app-state'],
    queryFn: loadAppState,
    refetchInterval: 15000,
  })
  const [settingsDraft, setSettingsDraft] = useState<AppSettings | null>(null)

  useEffect(() => {
    if (appStateQuery.data?.settings) {
      setSettingsDraft(appStateQuery.data.settings)
    }
  }, [appStateQuery.data?.settings])

  const saveSettingsMutation = useMutation({
    mutationFn: saveAppSettings,
    onSuccess: async () => {
      toast.success('Settings saved')
      await queryClient.invalidateQueries({ queryKey: ['app-state'] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (appStateQuery.isLoading || !appStateQuery.data || !settingsDraft) {
    return (
      <div className="text-muted-foreground py-8 text-sm">Loading data...</div>
    )
  }

  const { permissionHint, runner, runnerPath, settings } = appStateQuery.data

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

        <label className="border-border flex items-start gap-3 border-t pt-4 text-sm opacity-70">
          <input
            className="mt-1 size-4 accent-[var(--primary)]"
            type="checkbox"
            checked={settingsDraft.captureActiveApp}
            onChange={(event) =>
              setSettingsDraft({
                ...settingsDraft,
                captureActiveApp: event.currentTarget.checked,
              })
            }
            disabled
          />
          <span>
            <span className="text-foreground block font-medium">
              Capture active app name
            </span>
            <span className="text-muted-foreground mt-1 block">
              Supported by the schema, but disabled by default to keep
              collection minimal.
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
            onClick={() => setSettingsDraft(settings)}
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
          {runnerPath ?? 'Not resolved yet'}
        </p>
        <p>
          <span className="text-foreground font-medium">
            Autostart configured:
          </span>{' '}
          {runner.autostartConfigured ? 'Yes' : 'No'}
        </p>
        {runner.lastError ? (
          <p>
            <span className="text-foreground font-medium">Runner error:</span>{' '}
            {runner.lastError}
          </p>
        ) : null}
      </div>
    </section>
  )
}
