import { useMutation, useQuery } from '@tanstack/react-query'
import { exists } from '@tauri-apps/plugin-fs'
import { createContext } from 'daily-code/react'
import { useRef, useState } from 'react'
import { LARGE_LANGUAGE_MODELS, TLargeLanguageModel } from '../constants'
import {
  deleteLLMModelFile,
  downloadLLMModelFile,
  getLLMPath,
} from '../helpers/file-system'

type LargeLanguageModelResult = {
  model: TLargeLanguageModel
  isDownloaded: boolean
}

export const [LargeLanguageModelsProvider, useLargeLanguageModels] =
  createContext(() => {
    const [downloadProgress, setDownloadProgress] = useState<
      Record<string, number>
    >({})
    const controllersRef = useRef<Record<string, AbortController>>({})

    const {
      data: largeLanguageModels,
      refetch,
      isLoading,
    } = useQuery({
      queryKey: ['large-language-models'],
      queryFn: async (): Promise<LargeLanguageModelResult[]> => {
        return Promise.all(
          LARGE_LANGUAGE_MODELS.map(async (model) => {
            const isDownloaded = await exists(await getLLMPath(model.id))
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
          await downloadLLMModelFile(
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
        await deleteLLMModelFile(modelId)
        await refetch()
      },
    })

    return {
      isLoading: isLoading,
      largeLanguageModels,
      downloadModel,
      deleteModel,
      cancelDownload,
      downloadProgress,
    }
  })
