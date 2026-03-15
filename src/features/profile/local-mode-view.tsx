import { Button } from '@/components/ui/button'
import { TProfileSchema, TSSTName, useConfigStore } from '@/store/config-store'
import { Microphone } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router'
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

export function LocalModeView({ profile }: { profile: TProfileSchema }) {
  const updateProfile = useConfigStore((state) => state.updateProfile)

  const currentSstModel = profile.localMode?.sstModel || 'medium'

  function handleSstModelChange(value: string) {
    if (!isSstModel(value)) return

    updateProfile(profile.id, {
      localMode: {
        ...profile.localMode,
        sstModel: value,
      },
    })
  }

  return (
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
    </section>
  )
}
