import * as THREE from 'three'
import starVertexShader from '@/shaders/starVertex.glsl?raw'
import starFragmentShader from '@/shaders/starFragment.glsl?raw'

const STAR_SPREAD = 60

/**
 * Creates background stars (particle system) with color diversity
 * @param {THREE.Scene} scene
 * @param {number} numStars
 * @returns {{ particles: THREE.Points, geometry: THREE.BufferGeometry, material: THREE.ShaderMaterial }}
 */
export const createStarParticles = (scene, numStars) => {
  const positions = new Float32Array(numStars * 3)
  const alphas = new Float32Array(numStars)
  const sizes = new Float32Array(numStars)
  const twinkleOffsets = new Float32Array(numStars)
  const colors = new Float32Array(numStars * 3)
  const twinkleSpeeds = new Float32Array(numStars)

  for (let i = 0; i < numStars; i++) {
    const theta = Math.random() * Math.PI * 2
    const radius = Math.random() * STAR_SPREAD
    const z = -30 - Math.random() * 70

    positions[i * 3 + 0] = Math.cos(theta) * radius
    positions[i * 3 + 1] = Math.sin(theta) * radius
    positions[i * 3 + 2] = z

    // Increased visibility: alpha 0.25-0.85
    const brightness = Math.random()
    alphas[i] = brightness < 0.8 ? 0.25 + Math.random() * 0.25 : 0.5 + Math.random() * 0.35
    sizes[i] = brightness < 0.8 ? 1.5 + Math.random() * 1.0 : 2.0 + Math.random() * 2.0
    twinkleOffsets[i] = Math.random() * Math.PI * 2

    // Vary twinkle speed per star (0.5x to 2.0x base speed)
    twinkleSpeeds[i] = 0.5 + Math.random() * 1.5

    // Color diversity: ~70% white, ~20% blue-white, ~10% warm yellow
    const colorRoll = Math.random()
    if (colorRoll < 0.2) {
      // Blue-white
      colors[i * 3 + 0] = 0.8
      colors[i * 3 + 1] = 0.878
      colors[i * 3 + 2] = 1.0
    } else if (colorRoll < 0.3) {
      // Warm yellow
      colors[i * 3 + 0] = 1.0
      colors[i * 3 + 1] = 0.957
      colors[i * 3 + 2] = 0.878
    } else {
      // Slightly warm white (default)
      colors[i * 3 + 0] = 1.0
      colors[i * 3 + 1] = 0.98
      colors[i * 3 + 2] = 0.95
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aTwinkleOffset', new THREE.BufferAttribute(twinkleOffsets, 1))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aTwinkleSpeed', new THREE.BufferAttribute(twinkleSpeeds, 1))

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
 * Updates star uniforms with increased audio reactivity
 */
export const updateStars = (stars, time, audioBoost) => {
  if (!stars || !stars.material) return
  stars.material.uniforms.uTime.value = time
  stars.material.uniforms.uBrightness.value = 1.0 + audioBoost * 1.2
}

// ── Shooting Stars ──

const MAX_SHOOTING_STARS = 5
const SHOOTING_TRAIL_LENGTH = 6

/**
 * Creates shooting star system
 * @param {THREE.Scene} scene
 * @returns {object} shooting star data
 */
export const createShootingStars = (scene) => {
  const totalPoints = MAX_SHOOTING_STARS * SHOOTING_TRAIL_LENGTH
  const positions = new Float32Array(totalPoints * 3)
  const alphas = new Float32Array(totalPoints)
  const sizes = new Float32Array(totalPoints)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uBrightness: { value: 1.0 },
    },
    vertexShader: `
      attribute float aAlpha;
      attribute float aSize;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * (300.0 / -mvPosition.z);
      }
    `,
    fragmentShader: `
      uniform float uBrightness;
      varying float vAlpha;
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        float edge = smoothstep(0.5, 0.1, dist);
        float glow = pow(1.0 - smoothstep(0.0, 0.5, dist), 2.0);
        vec3 color = vec3(0.85, 0.92, 1.0); // Blue-white
        gl_FragColor = vec4(color * uBrightness, edge * glow * vAlpha * uBrightness);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const particles = new THREE.Points(geometry, material)
  particles.frustumCulled = false
  scene.add(particles)

  // State for each shooting star slot
  const slots = []
  for (let i = 0; i < MAX_SHOOTING_STARS; i++) {
    slots.push({
      active: false,
      x: 0, y: 0, z: -40,
      vx: 0, vy: 0,
      life: 0, maxLife: 0,
      trail: [], // [{x, y, z}, ...]
    })
  }

  return {
    particles, geometry, material, slots,
    nextSpawnTime: performance.now() + 2000 + Math.random() * 3000,
  }
}

/**
 * Spawns a shooting star in an available slot
 */
const spawnShootingStar = (data) => {
  const slot = data.slots.find(s => !s.active)
  if (!slot) return

  // Random edge spawn
  const side = Math.random()
  if (side < 0.5) {
    // From top-right
    slot.x = 15 + Math.random() * 30
    slot.y = 10 + Math.random() * 20
  } else {
    // From top-left
    slot.x = -15 - Math.random() * 30
    slot.y = 10 + Math.random() * 20
  }
  slot.z = -35 - Math.random() * 30

  const speed = 40 + Math.random() * 30
  const angle = slot.x > 0
    ? Math.PI + 0.3 + Math.random() * 0.6  // toward lower-left
    : -0.3 - Math.random() * 0.6           // toward lower-right
  slot.vx = Math.cos(angle) * speed
  slot.vy = Math.sin(angle) * speed - 10 // slight downward bias

  slot.life = 0
  slot.maxLife = 0.8 + Math.random() * 0.7
  slot.trail = []
  slot.active = true
}

/**
 * Updates shooting stars
 */
export const updateShootingStars = (data, dt, audioBoost) => {
  if (!data) return

  const now = performance.now()

  // Spawn logic
  if (now >= data.nextSpawnTime) {
    spawnShootingStar(data)
    data.nextSpawnTime = now + 3000 + Math.random() * 5000
  }

  // Extra spawn on audio peaks
  if (audioBoost > 0.6 && Math.random() < 0.02) {
    spawnShootingStar(data)
  }

  const posAttr = data.geometry.attributes.position
  const alphaAttr = data.geometry.attributes.aAlpha
  const sizeAttr = data.geometry.attributes.aSize

  // Reset all
  for (let i = 0; i < MAX_SHOOTING_STARS * SHOOTING_TRAIL_LENGTH; i++) {
    alphaAttr.array[i] = 0
    sizeAttr.array[i] = 0
  }

  data.slots.forEach((slot, si) => {
    if (!slot.active) return

    slot.life += dt
    if (slot.life >= slot.maxLife) {
      slot.active = false
      return
    }

    // Move
    slot.x += slot.vx * dt
    slot.y += slot.vy * dt

    // Add current position to trail
    slot.trail.unshift({ x: slot.x, y: slot.y, z: slot.z })
    if (slot.trail.length > SHOOTING_TRAIL_LENGTH) slot.trail.pop()

    const lifeFrac = slot.life / slot.maxLife
    const headAlpha = lifeFrac < 0.1 ? lifeFrac / 0.1 : (1.0 - lifeFrac) // fade in/out

    // Write trail points
    const baseIdx = si * SHOOTING_TRAIL_LENGTH
    slot.trail.forEach((pt, ti) => {
      const idx = baseIdx + ti
      posAttr.array[idx * 3 + 0] = pt.x
      posAttr.array[idx * 3 + 1] = pt.y
      posAttr.array[idx * 3 + 2] = pt.z
      alphaAttr.array[idx] = headAlpha * (1.0 - ti / SHOOTING_TRAIL_LENGTH)
      sizeAttr.array[idx] = ti === 0 ? 3.5 : 2.5 - ti * 0.3
    })
  })

  posAttr.needsUpdate = true
  alphaAttr.needsUpdate = true
  sizeAttr.needsUpdate = true
}

/**
 * Removes shooting stars from scene and frees resources
 */
export const disposeShootingStars = (scene, data) => {
  if (!data) return
  scene.remove(data.particles)
  data.geometry.dispose()
  data.material.dispose()
}

/**
 * Removes stars from scene and frees resources
 */
export const disposeStars = (scene, starsData) => {
  if (!starsData) return
  scene.remove(starsData.particles)
  starsData.geometry.dispose()
  starsData.material.dispose()
}

/**
 * Recreates stars with a new count
 */
export const recreateStars = (scene, starsData, numStars) => {
  disposeStars(scene, starsData)
  return createStarParticles(scene, numStars)
}
