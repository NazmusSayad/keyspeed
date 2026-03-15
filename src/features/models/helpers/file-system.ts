import * as path from '@tauri-apps/api/path'
import { exists, mkdir, remove, rename, writeFile } from '@tauri-apps/plugin-fs'
import { LARGE_LANGUAGE_MODELS, WHISPER_MODELS } from '../constants'

async function downloadFileToPath(
  url: string,
  filePath: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
) {
  const tempPath = `${filePath}.tmp`
  const tempExists = await exists(tempPath)

  if (tempExists) {
    await remove(tempPath)
  }

  try {
    const response = await fetch(url, { signal })
    if (!response.ok) {
      throw new Error(`Failed to download model: ${response.statusText}`)
    }

    const contentLength = response.headers.get('content-length')
    if (!contentLength) {
      throw new Error('Unable to determine file size')
    }

    const totalBytes = parseInt(contentLength, 10)
    const body = response.body
    if (!body) {
      throw new Error('Unable to read response body')
    }

    let loadedBytes = 0
    const stream = body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          loadedBytes += chunk.length
          onProgress?.((loadedBytes / totalBytes) * 100)
          controller.enqueue(chunk)
        },
      })
    )

    await writeFile(tempPath, stream)
    await rename(tempPath, filePath)
    onProgress?.(100)
  } catch (error) {
    const tempStillExists = await exists(tempPath)

    if (tempStillExists) {
      await remove(tempPath)
    }

    throw error
  }
}

export async function ensureWhisperModelDirectory() {
  const appDataDir = await path.appDataDir()
  const modelDir = await path.join(appDataDir, 'models')
  const dirExists = await exists(modelDir)
  if (!dirExists) {
    await mkdir(modelDir, { recursive: true })
  }
  return modelDir
}

export async function getWhisperModelPath(modelId: string) {
  const appDataDir = await path.appDataDir()
  return path.join(appDataDir, 'models', `ggml-${modelId}.bin`)
}

export async function downloadWhisperModelFile(
  modelId: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
) {
  const modelPath = await getWhisperModelPath(modelId)
  const model = WHISPER_MODELS.find((m) => m.id === modelId)
  if (!model) {
    throw new Error(`Model ${modelId} not found`)
  }

  await ensureWhisperModelDirectory()

  await downloadFileToPath(model.url, modelPath, onProgress, signal)
}

export async function deleteWhisperModelFile(modelId: string) {
  const modelPath = await getWhisperModelPath(modelId)
  const modelExists = await exists(modelPath)
  if (modelExists) {
    await remove(modelPath)
  }
}

export async function getLLMPath(modelId: string) {
  const appDataDir = await path.appDataDir()
  return path.join(appDataDir, 'models', 'llm', `${modelId}.gguf`)
}

export async function ensureLLMModelDirectory() {
  const appDataDir = await path.appDataDir()
  const modelDir = await path.join(appDataDir, 'models', 'llm')
  const dirExists = await exists(modelDir)
  if (!dirExists) {
    await mkdir(modelDir, { recursive: true })
  }
  return modelDir
}

export async function downloadLLMModelFile(
  modelId: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
) {
  const modelPath = await getLLMPath(modelId)
  const model = LARGE_LANGUAGE_MODELS.find((m) => m.id === modelId)
  if (!model) {
    throw new Error(`Model ${modelId} not found`)
  }

  await ensureLLMModelDirectory()

  await downloadFileToPath(model.url, modelPath, onProgress, signal)
}

export async function deleteLLMModelFile(modelId: string) {
  const modelPath = await getLLMPath(modelId)
  const modelExists = await exists(modelPath)
  if (modelExists) {
    await remove(modelPath)
  }
}
