import * as THREE from 'three'
import starVertexShader from '@/shaders/starVertex.glsl?raw'
import starFragmentShader from '@/shaders/starFragment.glsl?raw'

const STAR_SPREAD = 60

/**
 * Создаёт фоновые звёзды (particle system)
 * @param {THREE.Scene} scene
 * @param {number} numStars
 * @returns {{ particles: THREE.Points, geometry: THREE.BufferGeometry, material: THREE.ShaderMaterial }}
 */
export const createStarParticles = (scene, numStars) => {
  const positions = new Float32Array(numStars * 3)
  const alphas = new Float32Array(numStars)
  const sizes = new Float32Array(numStars)
  const twinkleOffsets = new Float32Array(numStars)

  for (let i = 0; i < numStars; i++) {
    const theta = Math.random() * Math.PI * 2
    const radius = Math.random() * STAR_SPREAD
    const z = -30 - Math.random() * 70

    positions[i * 3 + 0] = Math.cos(theta) * radius
    positions[i * 3 + 1] = Math.sin(theta) * radius
    positions[i * 3 + 2] = z

    const brightness = Math.random()
    alphas[i] = brightness < 0.8 ? 0.15 + Math.random() * 0.2 : 0.4 + Math.random() * 0.3
    sizes[i] = brightness < 0.8 ? 1.0 + Math.random() * 1.0 : 1.5 + Math.random() * 1.5
    twinkleOffsets[i] = Math.random() * Math.PI * 2
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aTwinkleOffset', new THREE.BufferAttribute(twinkleOffsets, 1))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: 1.0 },
      uBrightness: { value: 1.0 },
    },
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const particles = new THREE.Points(geometry, material)
  particles.frustumCulled = false
  scene.add(particles)

  return { particles, geometry, material }
}

/**
 * Обновляет uniforms звёзд
 */
export const updateStars = (stars, time, audioBoost) => {
  if (!stars || !stars.material) return
  stars.material.uniforms.uTime.value = time
  stars.material.uniforms.uBrightness.value = 1.0 + audioBoost * 0.6
}

/**
 * Удаляет звёзды из сцены и освобождает ресурсы
 */
export const disposeStars = (scene, starsData) => {
  if (!starsData) return
  scene.remove(starsData.particles)
  starsData.geometry.dispose()
  starsData.material.dispose()
}

/**
 * Пересоздаёт звёзды с новым количеством
 */
export const recreateStars = (scene, starsData, numStars) => {
  disposeStars(scene, starsData)
  return createStarParticles(scene, numStars)
}
