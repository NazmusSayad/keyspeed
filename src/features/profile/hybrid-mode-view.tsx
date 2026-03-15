import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TProfileSchema, TSSTName, useConfigStore } from '@/store/config-store'
import {
  AiBrainIcon,
  Microphone,
  Settings02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router'
import { FormattingDialog, LlmSelecection } from './components/llm-selecection'
import { WhisperModelSelection } from './components/whisper-model-selection'

function isSstModel(value: string): value is TSSTName {
  switch (value) {
    case 'tiny.en':
    case 'base.en':
    case 'small.en':
    case 'medium.en':
    case 'large.en':
    case 'tiny':
    case 'base':
    case 'small':
    case 'medium':
    case 'large':
    case 'large-v1':
    case 'large-v2':
    case 'large-v3':
    case 'large-v3-turbo':
      return true
    default:
      return false
  }
}

export function HybridModeView({ profile }: { profile: TProfileSchema }) {
  const updateProfile = useConfigStore((state) => state.updateProfile)
  const onlineLlms = useConfigStore((state) => state.onlineLlms)

  const currentSstModel = profile.hybridMode?.sstModel || 'medium'
  const currentLlmId =
    profile.hybridMode?.llmModel?.source === 'local'
      ? profile.hybridMode.llmModel.localModelId
      : profile.hybridMode?.llmModel?.source === 'online'
        ? profile.hybridMode.llmModel.onlineModelId
        : undefined

  const currentPreset = profile.hybridMode?.preset || null

  function handleSstModelChange(value: string) {
    if (!isSstModel(value)) return

    updateProfile(profile.id, {
      hybridMode: {
        ...profile.hybridMode,
        sstModel: value,
      },
    })
  }

  function handleLlmChange(llmId: string, source?: 'local' | 'online') {
    if (!llmId) return

    const resolvedSource = source || 'local'

    updateProfile(profile.id, {
      hybridMode: {
        ...profile.hybridMode,
        llmModel:
          resolvedSource === 'local'
            ? { source: 'local', localModelId: llmId }
            : { source: 'online', onlineModelId: llmId },
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
      hybridMode: {
        ...profile.hybridMode,
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
              <HugeiconsIcon icon={Microphone} className="size-4" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-semibold tracking-tight">
                Voice to text
              </h3>
              <p className="text-muted-foreground max-w-xl text-sm leading-6">
                Choose the local Whisper model that matches your speed and
                accuracy target.
              </p>
            </div>
          </div>

          <Button asChild variant="outline">
            <Link to="/models">Manage models</Link>
          </Button>
        </div>

        <WhisperModelSelection
          value={currentSstModel}
          setValue={handleSstModelChange}
        />

        <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <span className="text-muted-foreground">Active model</span>
          <Badge variant="secondary">{currentSstModel}</Badge>
        </div>
      </section>

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
                Choose between local models or remote LLM providers for
                processing your voice input.
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
                {profile.hybridMode?.llmModel?.source === 'local'
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
