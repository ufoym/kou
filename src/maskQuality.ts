export type InferenceBackend = 'WebGPU' | 'WASM'

// sigmoid(-1.25) is about 0.22, so even the strongest pixel would remain nearly transparent.
const MIN_FOREGROUND_LOGIT = -1.25

export function needsWasmFallback(backend: InferenceBackend, logits: ArrayLike<number>): boolean {
  if (backend !== 'WebGPU') return false
  if (logits.length === 0) return true

  let maxLogit = Number.NEGATIVE_INFINITY
  for (let index = 0; index < logits.length; index += 1) {
    const value = Number(logits[index])
    if (!Number.isFinite(value)) return true
    maxLogit = Math.max(maxLogit, value)
  }

  return maxLogit < MIN_FOREGROUND_LOGIT
}
