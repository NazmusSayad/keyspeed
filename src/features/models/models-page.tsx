import { PageTitle } from '@/components/page-title'
import {
  AwesomeTabs,
  AwesomeTabsContent,
  AwesomeTabsTriggers,
} from '@/components/ui/awesome-tabs'
import {
  AiBrainIcon,
  CloudServerIcon,
  Microphone,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { LocalLlmsSection } from './components/local-llms-section'
import { RemoteLlmsSection } from './components/remote-llms-section'
import { WhisperModelsSection } from './components/whisper-models-section'
import { useLargeLanguageModels } from './contexts/large-language-models-context'
import { useWhisperModels } from './contexts/whisper-models-context'

export function ModelsPage() {
  const { isLoading: isLoadingLargeLanguageModels } = useLargeLanguageModels()
  const { isLoading: isLoadingWhisperModels } = useWhisperModels()

  const isLoading = isLoadingLargeLanguageModels || isLoadingWhisperModels

  if (isLoading) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading models...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageTitle
        title="Models"
        description="Manage speech recognition models, connect remote LLM providers, and download local LLMs for offline use."
      />

      <AwesomeTabs
        items={[
          {
            className: 'h-10!',
            content: <WhisperModelsSection />,
            label: (
              <>
                <HugeiconsIcon icon={Microphone} /> Speech Recognition
              </>
            ),
          },
          {
            className: 'h-10!',
            content: <RemoteLlmsSection />,
            label: (
              <>
                <HugeiconsIcon icon={CloudServerIcon} /> Remote LLMs
              </>
            ),
          },
          {
            className: 'h-10!',
            content: <LocalLlmsSection />,
            label: (
              <>
                <HugeiconsIcon icon={AiBrainIcon} /> Local LLMs
              </>
            ),
          },
        ]}
      >
        <AwesomeTabsTriggers />
        <AwesomeTabsContent />
      </AwesomeTabs>
    </div>
  )
}
