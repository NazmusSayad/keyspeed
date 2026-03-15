import { PageTitle } from '@/components/page-title'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useConfigStore } from '@/store/config-store/use-config-store'
import {
  AiMagicIcon,
  CpuIcon,
  Mic01Icon,
  Settings02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type { ReactNode } from 'react'
import { SiAmd, SiApple, SiNvidia } from 'react-icons/si'

type BackendAvailability = {
  cpu: boolean
  cuda: boolean
  vulkan: boolean
  metal: boolean
}

type AvailableBackends = {
  whisper: BackendAvailability
  llm: BackendAvailability
}

type BackendPreference = 'auto' | 'cuda' | 'vulkan' | 'metal' | 'cpu'

type BackendOption = {
  name: BackendPreference
  label: string
  icon: ReactNode
}

const BACKEND_OPTIONS: BackendOption[] = [
  {
    name: 'auto',
    label: 'Auto',
    icon: (
      <HugeiconsIcon
        icon={AiMagicIcon}
        className="size-[1em]"
        strokeWidth={1}
      />
    ),
  },
  {
    name: 'cpu',
    label: 'CPU',
    icon: (
      <HugeiconsIcon icon={CpuIcon} className="size-[1em]" strokeWidth={1} />
    ),
  },
  {
    name: 'cuda',
    label: 'CUDA',
    icon: <SiNvidia className="size-[1em]" />,
  },
  {
    name: 'vulkan',
    label: 'Vulkan',
    icon: <SiAmd className="size-[1.75em]" />,
  },
  {
    name: 'metal',
    label: 'Metal',
    icon: <SiApple className="size-[1em]" />,
  },
]

function getAvailabilityKey(
  value: BackendPreference
): keyof BackendAvailability | null {
  if (value === 'auto' || value === 'cpu') return null
  return value
}

function isOptionAvailable(
  option: BackendOption,
  availability: BackendAvailability | null | undefined
) {
  const availabilityKey = getAvailabilityKey(option.name)
  if (!availabilityKey) return true
  return Boolean(availability?.[availabilityKey])
}

type BackendSectionProps = {
  title: string
  icon: typeof CpuIcon
  availability: BackendAvailability | null | undefined
  selected: BackendPreference
  onSelect: (value: BackendPreference) => void
}

function BackendSection({
  title,
  icon,
  availability,
  selected,
  onSelect,
}: BackendSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={icon} className="size-4" />
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      </div>

      <div className="grid max-w-[65rem] grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {BACKEND_OPTIONS.map((option) => {
          const isSelected = selected === option.name
          const disabled = !isOptionAvailable(option, availability)

          return (
            <Button
              key={option.name}
              disabled={disabled}
              onClick={() => onSelect(option.name)}
              variant={isSelected ? 'default' : 'secondary'}
              className="aspect-square h-auto w-full flex-col"
            >
              <div className="flex size-16 items-center justify-center rounded-lg text-6xl [&>svg]:shrink-0">
                {option.icon}
              </div>

              <p className="text-sm font-medium">{option.label}</p>
            </Button>
          )
        })}
      </div>
    </section>
  )
}

export function SettingsPage() {
  const autostartEnabled = useConfigStore((s) => s.autostartEnabled)
  const setAutostartEnabled = useConfigStore((s) => s.setAutostartEnabled)
  const ignoreClipboard = useConfigStore((s) => s.settings.ignoreClipboard)
  const updateSettings = useConfigStore((s) => s.updateSettings)
  const llmBackend = useConfigStore((s) => s.llmBackend)
  const setLlmBackend = useConfigStore((s) => s.setLlmBackend)
  const whisperBackend = useConfigStore((s) => s.whisperBackend)
  const setWhisperBackend = useConfigStore((s) => s.setWhisperBackend)

  const { data: availableBackends } = useQuery({
    queryKey: ['available-backends'],
    queryFn: () => invoke<AvailableBackends>('get_available_backends'),
  })

  return (
    <div className="space-y-6">
      <PageTitle
        title="Settings"
        description="Configure startup behavior and choose how OiPer uses your hardware."
      />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Settings02Icon} className="size-4" />
          <h2 className="text-base font-semibold tracking-tight">General</h2>
        </div>

        <label className="hover:bg-accent/50 flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors">
          <p className="text-sm font-medium">
            Start OiPer automatically on system startup
          </p>

          <Switch
            checked={autostartEnabled}
            onCheckedChange={setAutostartEnabled}
          />
        </label>

        <label className="hover:bg-accent/50 flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors">
          <div className="space-y-1">
            <p className="text-sm font-medium">Ignore clipboard</p>
            <p className="text-muted-foreground text-sm">
              Use direct OS text insertion when supported instead of copying
              text to the clipboard. May not work in every app.
            </p>
          </div>

          <Switch
            checked={ignoreClipboard}
            onCheckedChange={(checked) =>
              updateSettings({ ignoreClipboard: checked })
            }
          />
        </label>
      </section>

      <BackendSection
        title="LLM Hardware"
        icon={CpuIcon}
        availability={availableBackends?.llm}
        selected={llmBackend}
        onSelect={setLlmBackend}
      />

      <BackendSection
        title="Speech Recognition Hardware"
        icon={Mic01Icon}
        availability={availableBackends?.whisper}
        selected={whisperBackend}
        onSelect={setWhisperBackend}
      />
    </div>
  )
}
