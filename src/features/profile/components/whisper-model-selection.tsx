import { Badge } from '@/components/ui/badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useWhisperModels } from '@/features/models/contexts/whisper-models-context'

interface WhisperModelSelectionProps {
  value: string
  setValue: (value: string) => void
}

export function WhisperModelSelection({
  value,
  setValue,
}: WhisperModelSelectionProps) {
  const { whisperModels } = useWhisperModels()
  const models = (whisperModels || [])
    .filter(({ isDownloaded }) => isDownloaded)
    .map(({ model }) => model)

  if (models.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed px-3 py-3 text-sm">
        No local Whisper models downloaded
      </div>
    )
  }

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) {
          setValue(next)
        }
      }}
      variant="outline"
      size="sm"
      spacing={1}
      className="w-full flex-wrap"
    >
      {models.map((model) => (
        <ToggleGroupItem
          key={model.id}
          value={model.id}
          className="flex items-center gap-2"
        >
          <span>{model.name}</span>
          {model.language && (
            <Badge variant="secondary" className="text-[10px]">
              EN
            </Badge>
          )}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
