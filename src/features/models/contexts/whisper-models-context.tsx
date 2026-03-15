import { useMutation, useQuery } from '@tanstack/react-query'
import { exists } from '@tauri-apps/plugin-fs'
import { createContext } from 'daily-code/react'
import { useRef, useState } from 'react'
import { TWhisperModel, WHISPER_MODELS } from '../constants'
import {
  deleteWhisperModelFile,
  downloadWhisperModelFile,
  getWhisperModelPath,
} from '../helpers/file-system'

type WhisperModelResult = {
  model: TWhisperModel
  isDownloaded: boolean
}

export const [WhisperModelsProvider, useWhisperModels] = createContext(() => {
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, number>
  >({})
  const controllersRef = useRef<Record<string, AbortController>>({})

  const {
    data: whisperModels,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ['whisper-models'],
    queryFn: async (): Promise<WhisperModelResult[]> => {
      return Promise.all(
        WHISPER_MODELS.map(async (model) => {
          const isDownloaded = await exists(await getWhisperModelPath(model.id))
          return { model, isDownloaded }
        })
      )
    },
  })

  const downloadModel = useMutation({
    mutationFn: async (modelId: string) => {
      const controller = new AbortController()

      controllersRef.current[modelId] = controller

      try {
        await downloadWhisperModelFile(
          modelId,
          (progress) => {
            setDownloadProgress((prev) => {
              const next = { ...prev, [modelId]: progress }
              if (progress === 100) {
                delete next[modelId]
              }

              return next
            })
          },
          controller.signal
        )

        await refetch()
      } catch (error) {
        if (!(error instanceof DOMException) || error.name !== 'AbortError') {
          throw error
        }
      } finally {
        delete controllersRef.current[modelId]

        setDownloadProgress((prev) => {
          if (!(modelId in prev)) {
            return prev
          }

          const next = { ...prev }
          delete next[modelId]
          return next
        })
      }
    },
  })

  function cancelDownload(modelId: string) {
    controllersRef.current[modelId]?.abort()
  }

  const deleteModel = useMutation({
    mutationFn: async (modelId: string) => {
      await deleteWhisperModelFile(modelId)
      await refetch()
    },
  })

  return {
    whisperModels,
    downloadModel,
    deleteModel,
    cancelDownload,
    downloadProgress,
    isLoading: isLoading,
  }
})
