import * as THREE from 'three'
import { TOTAL_STRINGS } from '@/utils/guitarMapping'

const BURST_COUNT = 50
const STREAM_RATE = 18
const PARTICLE_LIFETIME_MIN = 1.0
const PARTICLE_LIFETIME_MAX = 2.2
const PARTICLE_BASE_SIZE = 0.38
const STRING_LENGTH = 20

/**
 * Creates a particle system with pre-allocated pool
 * @param {THREE.Scene} scene
 * @param {number} maxParticles
 * @returns {object} particleData
 */
export const createParticleSystem = (scene, maxParticles) => {
  const pPositions = new Float32Array(maxParticles * 3)
  const pColors = new Float32Array(maxParticles * 3)
  const pAlphas = new Float32Array(maxParticles)
  const pSizes = new Float32Array(maxParticles)
  const pVelocities = new Float32Array(maxParticles * 3)
  const pLifetimes = new Float32Array(maxParticles)
  const pMaxLifetimes = new Float32Array(maxParticles)
  const pAlive = new Uint8Array(maxParticles)

  for (let i = 0; i < maxParticles; i++) {
    pPositions[i * 3 + 2] = -100
    pAlphas[i] = 0
    pSizes[i] = 0
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(pColors, 3))
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(pAlphas, 1))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1))

  const material = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      attribute float aAlpha;
      attribute float aSize;
      attribute vec3 aColor;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vAlpha = aAlpha;
        vColor = aColor;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (450.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = vAlpha * smoothstep(0.5, 0.08, dist);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  scene.add(points)

  return {
    points,
    geometry,
    material,
    maxParticles,
    pPositions,
    pColors,
    pAlphas,
    pSizes,
    pVelocities,
    pLifetimes,
    pMaxLifetimes,
    pAlive,
    nextIndex: 0,
    streamAccumulators: new Float32Array(TOTAL_STRINGS),
  }
}

/**
 * Emits a single particle for the specified string
 */
export const emitParticle = (pd, strings, stringArrayIndex, intensity) => {
  const i = pd.nextIndex
  pd.nextIndex = (pd.nextIndex + 1) % pd.maxParticles

  const i3 = i * 3
  const stringMesh = strings[stringArrayIndex]
  if (!stringMesh) return

  const yPos = stringMesh.position.y
  const baseColor = stringMesh.userData.baseColor

  pd.pPositions[i3] = (Math.random() - 0.5) * STRING_LENGTH
  pd.pPositions[i3 + 1] = yPos + (Math.random() - 0.5) * 0.3
  pd.pPositions[i3 + 2] = 0.1 + Math.random() * 0.3

  pd.pVelocities[i3] = (Math.random() - 0.5) * 1.5
  pd.pVelocities[i3 + 1] = 0.3 + Math.random() * 0.7
  pd.pVelocities[i3 + 2] = (Math.random() - 0.5) * 0.3

  const boost = 0.3 + intensity * 0.7
  pd.pColors[i3] = Math.min(1, baseColor.r * boost + 0.2)
  pd.pColors[i3 + 1] = Math.min(1, baseColor.g * boost + 0.2)
  pd.pColors[i3 + 2] = Math.min(1, baseColor.b * boost + 0.2)

  const lifetime = PARTICLE_LIFETIME_MIN + Math.random() * (PARTICLE_LIFETIME_MAX - PARTICLE_LIFETIME_MIN)
  pd.pLifetimes[i] = lifetime
  pd.pMaxLifetimes[i] = lifetime

  pd.pAlphas[i] = 0.8 + intensity * 0.2
  pd.pSizes[i] = PARTICLE_BASE_SIZE * (0.85 + intensity * 0.5)

  pd.pAlive[i] = 1
}

/**
 * Burst of particles on string hit
 */
export const emitBurst = (pd, strings, stringArrayIndex, intensity) => {
  const count = Math.round(BURST_COUNT * 0.5 + BURST_COUNT * 0.5 * intensity)
  for (let j = 0; j < count; j++) {
    emitParticle(pd, strings, stringArrayIndex, intensity)
  }
}

/**
 * Continuous stream of particles for active string
 */
export const emitStream = (pd, strings, stringArrayIndex, intensity, dt) => {
  const rate = STREAM_RATE * intensity
  pd.streamAccumulators[stringArrayIndex] += rate * dt

  while (pd.streamAccumulators[stringArrayIndex] >= 1) {
    pd.streamAccumulators[stringArrayIndex] -= 1
    emitParticle(pd, strings, stringArrayIndex, intensity * 0.8)
  }
}

/**
 * Updates all alive particles
 */
export const updateParticles = (pd, dt) => {
  if (!pd || !pd.pAlive) return

  for (let i = 0; i < pd.maxParticles; i++) {
    if (!pd.pAlive[i]) continue

    pd.pLifetimes[i] -= dt
    if (pd.pLifetimes[i] <= 0) {
      pd.pAlive[i] = 0
      pd.pAlphas[i] = 0
      pd.pSizes[i] = 0
      pd.pPositions[i * 3 + 2] = -100
      continue
    }

    const i3 = i * 3
    const lifeRatio = pd.pLifetimes[i] / pd.pMaxLifetimes[i]

    pd.pPositions[i3] += pd.pVelocities[i3] * dt
    pd.pPositions[i3 + 1] += pd.pVelocities[i3 + 1] * dt
    pd.pPositions[i3 + 2] += pd.pVelocities[i3 + 2] * dt

    pd.pVelocities[i3] *= 0.98
    pd.pVelocities[i3 + 1] *= 0.98
    pd.pVelocities[i3 + 2] *= 0.98

    const smoothLife = lifeRatio * lifeRatio * (3 - 2 * lifeRatio)
    pd.pAlphas[i] = smoothLife * (0.8 + (1 - lifeRatio) * 0.2)
    pd.pSizes[i] = PARTICLE_BASE_SIZE * (0.3 + 0.7 * smoothLife)
  }

  pd.geometry.attributes.position.needsUpdate = true
  pd.geometry.attributes.aColor.needsUpdate = true
  pd.geometry.attributes.aAlpha.needsUpdate = true
  pd.geometry.attributes.aSize.needsUpdate = true
}

/**
 * Removes particle system from scene
 */
export const disposeParticles = (scene, pd) => {
  if (!pd) return
  scene.remove(pd.points)
  pd.geometry.dispose()
  pd.material.dispose()
}

/**
 * Recreates particle system with new count
 */
export const recreateParticles = (scene, pd, maxParticles) => {
  disposeParticles(scene, pd)
  return createParticleSystem(scene, maxParticles)
}
