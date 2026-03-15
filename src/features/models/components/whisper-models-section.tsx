import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Cancel01Icon,
  Delete02Icon,
  Download01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'
import { useWhisperModels } from '../contexts/whisper-models-context'

export function WhisperModelsSection() {
  const [searchQuery, setSearchQuery] = useState('')
  const {
    whisperModels,
    downloadModel,
    deleteModel,
    cancelDownload,
    downloadProgress,
  } = useWhisperModels()

  const downloadedModels = new Set(
    whisperModels
      ?.filter(({ isDownloaded }) => isDownloaded)
      .map(({ model }) => model.id) || []
  )

  const filteredModels = whisperModels?.filter((model) =>
    model.model.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Search models..."
          value={searchQuery}
          className="h-10"
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <Badge variant="secondary">
          {downloadedModels.size} / {filteredModels?.length || 0}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredModels?.map((model) => {
            const isDownloaded = downloadedModels.has(model.model.id)
            const progress = downloadProgress[model.model.id]
            const isDownloading = progress !== undefined

            return (
              <div
                key={model.model.id}
                className="bg-muted/30 hover:bg-muted/50 relative flex gap-4 overflow-hidden rounded-xl p-4 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {model.model.name}{' '}
                    {model.model.language && `(${model.model.language})`}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {model.model.sizeMB < 1000
                      ? `${model.model.sizeMB} MB`
                      : `${(model.model.sizeMB / 1000).toFixed(1)} GB`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isDownloading ? (
                    <Button
                      variant="outline"
                      size="icon-lg"
                      aria-label={`Cancel download for ${model.model.name}`}
                      onClick={() => cancelDownload(model.model.id)}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                    </Button>
                  ) : isDownloaded ? (
                    <Button
                      variant="destructive"
                      size="icon-lg"
                      aria-label={`Delete ${model.model.name}`}
                      onClick={() => deleteModel.mutate(model.model.id)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="icon-lg"
                      aria-label={`Download ${model.model.name}`}
                      onClick={() => downloadModel.mutate(model.model.id)}
                    >
                      <HugeiconsIcon icon={Download01Icon} className="size-4" />
                    </Button>
                  )}
                </div>

                {isDownloading && (
                  <div className="absolute inset-x-0 bottom-0">
                    <div
                      className="bg-foreground/80 h-1"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
