/// <reference lib="webworker" />

import { AutoModel, AutoProcessor, RawImage, env } from '@huggingface/transformers'

const MODEL_ID = 'studioludens/birefnet-lite-512'

env.allowLocalModels = false
env.useBrowserCache = true

let model: Awaited<ReturnType<typeof AutoModel.from_pretrained>> | null = null
let processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> | null = null
let backend = ''

function send(message: Record<string, unknown>, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer })
}

function progressCallback(info: Record<string, unknown>) {
  if (info.status === 'progress') {
    const loaded = Number(info.loaded ?? 0)
    const total = Number(info.total ?? 0)
    if (total > 0) {
      send({ type: 'progress', progress: Math.min(99, Math.round((loaded / total) * 100)) })
    }
  }
}

async function loadModel() {
  if (model && processor) return

  send({ type: 'status', status: 'loading', messageKey: 'modelDownloading' })

  const hasWebGpu = 'gpu' in navigator
  if (hasWebGpu) {
    try {
      model = await AutoModel.from_pretrained(MODEL_ID, {
        device: 'webgpu',
        dtype: 'fp16',
        progress_callback: progressCallback,
      })
      backend = 'WebGPU'
    } catch (error) {
      console.warn('WebGPU unavailable, using WASM fallback.', error)
      send({ type: 'status', status: 'loading', messageKey: 'gpuFallback' })
    }
  }

  if (!model) {
    model = await AutoModel.from_pretrained(MODEL_ID, {
      device: 'wasm',
      dtype: 'fp32',
      progress_callback: progressCallback,
    })
    backend = 'WASM'
  }

  processor = await AutoProcessor.from_pretrained(MODEL_ID, {
    progress_callback: progressCallback,
  })
  send({ type: 'ready', backend })
}

self.addEventListener('message', async (event: MessageEvent) => {
  if (event.data?.type !== 'process') return

  try {
    await loadModel()
    send({ type: 'status', status: 'processing', messageKey: 'detectingEdges' })

    const blob = new Blob([event.data.buffer], { type: event.data.mime })
    const image = (await RawImage.fromBlob(blob)).rgb()
    const originalWidth = image.width
    const originalHeight = image.height
    const inputs = await processor!(image)
    const output = await model!({ input_image: inputs.pixel_values })
    const logits = output.output_image[0]
    const mask = await RawImage.fromTensor(logits.sigmoid().mul(255).to('uint8')).resize(
      originalWidth,
      originalHeight,
    )
    const result = image.rgba().putAlpha(mask)
    const resultBlob = await result.toBlob('image/png')
    const buffer = await resultBlob.arrayBuffer()

    send(
      {
        type: 'result',
        buffer,
        width: originalWidth,
        height: originalHeight,
        backend,
      },
      [buffer],
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    send({ type: 'error', message })
  }
})

export {}
