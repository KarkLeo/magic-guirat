import * as THREE from 'three'
import spectrumVertexShader from '@/shaders/spectrumVertex.glsl?raw'
import spectrumFragmentShader from '@/shaders/spectrumFragment.glsl?raw'

const SPECTRUM_BINS = 256
const SPECTRUM_Y_BASE = -7.5
const SPECTRUM_HEIGHT = 10
const SPECTRUM_X_MIN = -12
const SPECTRUM_X_MAX = 12

/**
 * Catmull-Rom smoothing for data array
 */
const catmullRomSmooth = (data, output) => {
  const n = data.length
  for (let i = 0; i < n; i++) {
    const p0 = data[Math.max(0, i - 1)]
    const p1 = data[i]
    const p2 = data[Math.min(n - 1, i + 1)]
    const p3 = data[Math.min(n - 1, i + 2)]
    output[i] =
      0.5 *
      (2 * p1 +
        (-p0 + p2) * 0.5 +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * 0.25 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * 0.125)
    if (output[i] < 0) output[i] = 0
  }
}

/**
 * Soft smoothing across 5 points
 */
const smoothSpectrumLine = (data, output, radius = 2) => {
  const n = data.length
  for (let i = 0; i < n; i++) {
    let sum = 0
    let count = 0
    for (let j = -radius; j <= radius; j++) {
      const k = Math.max(0, Math.min(n - 1, i + j))
      sum += data[k]
      count++
    }
    output[i] = sum / count
  }
}

/**
 * Creates spectrum mesh — filled area with deformable vertices
 * @param {THREE.Scene} scene
 * @returns {{ mesh, geometry, material, smoothedSpectrum, smoothBuffer, finalBuffer }}
 */
export const createSpectrumMesh = scene => {
  const numCols = SPECTRUM_BINS
  const xRange = SPECTRUM_X_MAX - SPECTRUM_X_MIN

  const vertexCount = numCols * 2
  const positions = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)

  for (let i = 0; i < numCols; i++) {
    const t = i / (numCols - 1)
    const x = SPECTRUM_X_MIN + t * xRange

    const bottomIdx = i
    positions[bottomIdx * 3 + 0] = x
    positions[bottomIdx * 3 + 1] = SPECTRUM_Y_BASE
    positions[bottomIdx * 3 + 2] = 0
    uvs[bottomIdx * 2 + 0] = t
    uvs[bottomIdx * 2 + 1] = 0.0

    const topIdx = numCols + i
    positions[topIdx * 3 + 0] = x
    positions[topIdx * 3 + 1] = SPECTRUM_Y_BASE
    positions[topIdx * 3 + 2] = 0
    uvs[topIdx * 2 + 0] = t
    uvs[topIdx * 2 + 1] = 1.0
  }

  const indexCount = (numCols - 1) * 6
  const indices = new Uint16Array(indexCount)
  let idx = 0
  for (let i = 0; i < numCols - 1; i++) {
    const bl = i
    const br = i + 1
    const tl = numCols + i
    const tr = numCols + i + 1
    indices[idx++] = bl
    indices[idx++] = tl
    indices[idx++] = br
    indices[idx++] = br
    indices[idx++] = tl
    indices[idx++] = tr
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uDominantFreq: { value: 0.5 },
      uBoost: { value: 0.0 },
    },
    vertexShader: spectrumVertexShader,
    fragmentShader: spectrumFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  scene.add(mesh)

  return {
    mesh,
    geometry,
    material,
    smoothedSpectrum: new Float32Array(SPECTRUM_BINS),
    smoothBuffer: new Float32Array(SPECTRUM_BINS),
    finalBuffer: new Float32Array(SPECTRUM_BINS),
  }
}

/**
 * Updates spectrum vertices from frequency data + uniforms
 * @param {object} spectrumData - object from createSpectrumMesh
 * @param {Float32Array|Uint8Array} freqData - spectrum data (0-255)
 * @param {number} time - performance.now()
 * @param {number} audioBoost - smoothed audio boost (0-1)
 */
export const updateSpectrum = (spectrumData, freqData, time, audioBoost) => {
  if (!spectrumData || !freqData) return

  const { geometry, material, smoothedSpectrum, smoothBuffer, finalBuffer } = spectrumData
  const positions = geometry.attributes.position.array
  const numCols = SPECTRUM_BINS

  // Catmull-Rom smoothing
  catmullRomSmooth(freqData, smoothBuffer)

  // Lerp to current values
  for (let i = 0; i < numCols; i++) {
    const normalized = smoothBuffer[i] / 255
    smoothedSpectrum[i] += (normalized - smoothedSpectrum[i]) * 0.2
  }

  // Additional line smoothing
  smoothSpectrumLine(smoothedSpectrum, finalBuffer, 2)

  // Update top row of vertices
  for (let i = 0; i < numCols; i++) {
    const topIdx = numCols + i
    positions[topIdx * 3 + 1] = SPECTRUM_Y_BASE + finalBuffer[i] * SPECTRUM_HEIGHT
  }

  geometry.attributes.position.needsUpdate = true

  // Dominant frequency
  let maxVal = 0
  let maxIdx = 0
  for (let i = 0; i < freqData.length; i++) {
    if (freqData[i] > maxVal) {
      maxVal = freqData[i]
      maxIdx = i
    }
  }
  const dominantFreq = freqData.length > 0 ? maxIdx / freqData.length : 0.5

  // Update uniforms
  material.uniforms.uTime.value = time * 0.001
  material.uniforms.uDominantFreq.value = dominantFreq
  material.uniforms.uBoost.value = audioBoost
}

/**
 * Removes spectrum from scene and frees resources
 */
export const disposeSpectrum = (scene, spectrumData) => {
  if (!spectrumData) return
  scene.remove(spectrumData.mesh)
  spectrumData.geometry.dispose()
  spectrumData.material.dispose()
}

export { SPECTRUM_BINS }
