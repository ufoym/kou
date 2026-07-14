import assert from 'node:assert/strict'
import test from 'node:test'
import { needsWasmFallback } from './maskQuality'

test('retries a collapsed WebGPU foreground mask with WASM', () => {
  assert.equal(needsWasmFallback('WebGPU', new Float32Array([-4.76, -3.43, -1.45])), true)
})

test('keeps a healthy WebGPU foreground mask', () => {
  assert.equal(needsWasmFallback('WebGPU', new Float32Array([-23.08, -2.08, 18.45])), false)
})

test('does not retry a WASM result', () => {
  assert.equal(needsWasmFallback('WASM', new Float32Array([-4.76, -3.43, -1.45])), false)
})

test('retries empty and non-finite WebGPU output', () => {
  assert.equal(needsWasmFallback('WebGPU', new Float32Array()), true)
  assert.equal(needsWasmFallback('WebGPU', new Float32Array([Number.NaN])), true)
})
