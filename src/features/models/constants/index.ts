export type TLargeLanguageModel = {
  id: string
  name: string
  url: string
  sizeMB: number
}

export type TWhisperModel = {
  id: string
  url: string
  name: string
  sizeMB: number

  language?: string
}

export const LARGE_LANGUAGE_MODELS: TLargeLanguageModel[] = [
  {
    id: 'tinyllama-1.1b-q4',
    name: 'TinyLlama 1.1B (Q4)',
    url: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    sizeMB: 670,
  },
  {
    id: 'phi-2-q4',
    name: 'Phi-2 (Q4)',
    url: 'https://huggingface.co/TheBloke/phi-2-GGUF/resolve/main/phi-2.Q4_K_M.gguf',
    sizeMB: 1400,
  },
  {
    id: 'llama-3.2-1b-q4',
    name: 'Llama 3.2 1B (Q4)',
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    sizeMB: 760,
  },
  {
    id: 'llama-3.2-3b-q4',
    name: 'Llama 3.2 3B (Q4)',
    url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    sizeMB: 2010,
  },
  {
    id: 'qwen2.5-1.5b-q4',
    name: 'Qwen 2.5 1.5B (Q4)',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    sizeMB: 1100,
  },
  {
    id: 'qwen2.5-3b-q4',
    name: 'Qwen 2.5 3B (Q4)',
    url: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf',
    sizeMB: 2010,
  },
  {
    id: 'gemma-2-2b-q4',
    name: 'Gemma 2 2B (Q4)',
    url: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
    sizeMB: 1600,
  },
  {
    id: 'phi-3-mini-q4',
    name: 'Phi-3 Mini 3.8B (Q4)',
    url: 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf',
    sizeMB: 2300,
  },
  {
    id: 'mistral-7b-q4',
    name: 'Mistral 7B (Q4)',
    url: 'https://huggingface.co/maziyarjanari/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
    sizeMB: 4370,
  },
]

export const WHISPER_MODELS: TWhisperModel[] = [
  {
    id: 'tiny',
    name: 'Tiny',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    sizeMB: 75,
  },
  {
    id: 'tiny.en',
    name: 'Tiny',
    language: 'english',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
    sizeMB: 75,
  },
  {
    id: 'base',
    name: 'Base',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    sizeMB: 142,
  },
  {
    id: 'base.en',
    name: 'Base',
    language: 'english',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    sizeMB: 142,
  },
  {
    id: 'small',
    name: 'Small',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    sizeMB: 466,
  },
  {
    id: 'small.en',
    name: 'Small',
    language: 'english',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin',
    sizeMB: 466,
  },
  {
    id: 'medium',
    name: 'Medium',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
    sizeMB: 1500,
  },
  {
    id: 'medium.en',
    name: 'Medium',
    language: 'english',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin',
    sizeMB: 1500,
  },
  {
    id: 'large-v1',
    name: 'Large v1',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v1.bin',
    sizeMB: 2900,
  },
  {
    id: 'large-v2',
    name: 'Large v2',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v2.bin',
    sizeMB: 2900,
  },
  {
    id: 'large-v3',
    name: 'Large v3',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin',
    sizeMB: 2900,
  },
  {
    id: 'large-v3-turbo',
    name: 'Large v3 Turbo',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin',
    sizeMB: 1500,
  },
]
