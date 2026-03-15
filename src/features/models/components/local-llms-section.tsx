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
import { useLargeLanguageModels } from '../contexts/large-language-models-context'

export function LocalLlmsSection() {
  const [searchQuery, setSearchQuery] = useState('')
  const {
    largeLanguageModels,
    downloadModel,
    deleteModel,
    cancelDownload,
    downloadProgress,
  } = useLargeLanguageModels()

  const models =
    largeLanguageModels?.map(({ model }) => ({
      id: model.id,
      name: model.name,
      size_mb: model.sizeMB,
    })) || []

  const downloadedModels = new Set(
    largeLanguageModels
      ?.filter(({ isDownloaded }) => isDownloaded)
      .map(({ model }) => model.id) || []
  )

  const filteredModels = models.filter((model) =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase())
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
          {downloadedModels.size} / {models.length}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredModels.map((model) => {
            const isDownloaded = downloadedModels.has(model.id)
            const progress = downloadProgress[model.id]
            const isDownloading = progress !== undefined

            return (
              <div
                key={model.id}
                className="bg-muted/30 hover:bg-muted/50 relative flex gap-4 overflow-hidden rounded-xl p-4 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{model.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {model.size_mb < 1000
                      ? `${model.size_mb} MB`
                      : `${(model.size_mb / 1000).toFixed(1)} GB`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isDownloading ? (
                    <Button
                      variant="outline"
                      size="icon-lg"
                      aria-label={`Cancel download for ${model.name}`}
                      onClick={() => cancelDownload(model.id)}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                    </Button>
                  ) : isDownloaded ? (
                    <Button
                      variant="destructive"
                      size="icon-lg"
                      aria-label={`Delete ${model.name}`}
                      onClick={() => deleteModel.mutate(model.id)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="icon-lg"
                      aria-label={`Download ${model.name}`}
                      onClick={() => downloadModel.mutate(model.id)}
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
