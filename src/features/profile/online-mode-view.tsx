import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TProfileSchema, useConfigStore } from '@/store/config-store'
import { AiBrainIcon, Settings02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router'
import { FormattingDialog, LlmSelecection } from './components/llm-selecection'

export function OnlineModeView({ profile }: { profile: TProfileSchema }) {
  const updateProfile = useConfigStore((state) => state.updateProfile)
  const onlineLlms = useConfigStore((state) => state.onlineLlms)

  const currentLlmId =
    profile.onlineMode?.llmModel?.source === 'local'
      ? profile.onlineMode.llmModel.localModelId
      : profile.onlineMode?.llmModel?.source === 'online'
        ? profile.onlineMode.llmModel.onlineModelId
        : undefined

  const currentPreset = profile.onlineMode?.preset || null

  function handleLlmChange(llmId: string, source?: 'local' | 'online') {
    if (!llmId) return

    const resolvedSource = source || 'online'

    updateProfile(profile.id, {
      onlineMode: {
        ...profile.onlineMode,
        llmModel:
          resolvedSource === 'local'
            ? {
                source: 'local',
                localModelId: llmId,
              }
            : {
                source: 'online',
                onlineModelId: llmId,
              },
      },
    })
  }

  function handlePresetSave(
    preset:
      | { type: 'custom'; prompt: string }
      | { type: 'normal' }
      | { type: 'prompt' }
      | { type: 'email' }
      | { type: 'formal' }
  ) {
    updateProfile(profile.id, {
      onlineMode: {
        ...profile.onlineMode,
        preset,
      },
    })
  }

  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-muted/35 text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl">
              <HugeiconsIcon icon={AiBrainIcon} className="size-4" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-semibold tracking-tight">
                LLM Selection
              </h3>
              <p className="text-muted-foreground max-w-xl text-sm leading-6">
                Choose the remote or local language model that will process your
                transcription.
              </p>
            </div>
          </div>

          <Button asChild variant="outline">
            <Link to="/models">Manage models</Link>
          </Button>
        </div>

        <LlmSelecection
          value={currentLlmId || ''}
          setValue={handleLlmChange}
          onlineLlms={onlineLlms}
        />

        {currentLlmId && (
          <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span className="text-muted-foreground">Active LLM</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {profile.onlineMode?.llmModel?.source === 'local'
                  ? 'Local'
                  : 'Remote'}
              </Badge>
              <span className="font-medium">{currentLlmId}</span>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-muted/35 text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl">
              <HugeiconsIcon icon={Settings02Icon} className="size-4" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-semibold tracking-tight">
                Formatting
              </h3>
              <p className="text-muted-foreground max-w-xl text-sm leading-6">
                Configure how the AI should format and structure its responses.
              </p>
            </div>
          </div>

          <FormattingDialog preset={currentPreset} onSave={handlePresetSave} />
        </div>

        {currentPreset ? (
          <div className="rounded-md border px-3 py-3 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground">Active preset</span>
              <Badge variant="secondary">
                {currentPreset.type === 'custom'
                  ? 'Custom prompt'
                  : currentPreset.type === 'normal'
                    ? 'Normal'
                    : currentPreset.type === 'prompt'
                      ? 'Prompt'
                      : currentPreset.type === 'email'
                        ? 'Email'
                        : 'Formal'}
              </Badge>
            </div>
            {'prompt' in currentPreset && (
              <p className="text-muted-foreground line-clamp-2 text-xs">
                {currentPreset.prompt}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-md border border-dashed px-3 py-3 text-sm">
            <span className="text-muted-foreground">
              No formatting preset configured
            </span>
            <Badge variant="outline">Optional</Badge>
          </div>
        )}
      </section>
    </div>
  )
}
