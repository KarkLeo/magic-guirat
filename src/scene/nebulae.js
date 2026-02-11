import * as THREE from 'three'
import nebulaVertexShader from '@/shaders/nebulaVertex.glsl?raw'
import nebulaFragmentShader from '@/shaders/nebulaFragment.glsl?raw'

const NEBULA_CONFIGS = [
  { color: 0x6366f1, x: -15, y: 8, z: -40, scale: 18, opacity: 0.12, breathSpeed: 0.0003, breathPhase: 0 },
  { color: 0xec4899, x: 12, y: -5, z: -55, scale: 22, opacity: 0.10, breathSpeed: 0.00025, breathPhase: 2.1 },
  { color: 0x8b5cf6, x: -5, y: -10, z: -70, scale: 25, opacity: 0.08, breathSpeed: 0.0002, breathPhase: 4.2 },
  { color: 0x0d9488, x: 18, y: 12, z: -65, scale: 20, opacity: 0.09, breathSpeed: 0.00022, breathPhase: 1.4 },
]

/**
 * Creates semi-transparent nebulae for cosmic atmosphere
 * @param {THREE.Scene} scene
 * @returns {{ nebulae: Array, sharedGeometry: THREE.PlaneGeometry }}
 */
export const createNebulae = (scene) => {
  const sharedGeometry = new THREE.PlaneGeometry(1, 1)
  const nebulae = []

  NEBULA_CONFIGS.forEach((cfg) => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(cfg.color) },
        uOpacity: { value: cfg.opacity },
        uTime: { value: 0 },
        uAudioBoost: { value: 0.0 },
      },
      vertexShader: nebulaVertexShader,
      fragmentShader: nebulaFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    const mesh = new THREE.Mesh(sharedGeometry, material)
    mesh.position.set(cfg.x, cfg.y, cfg.z)
    mesh.scale.setScalar(cfg.scale)
    mesh.rotation.z = cfg.breathPhase

    scene.add(mesh)
    nebulae.push({
      mesh,
      baseScale: cfg.scale,
      baseOpacity: cfg.opacity,
      breathSpeed: cfg.breathSpeed,
      breathPhase: cfg.breathPhase,
    })
  })

  return { nebulae, sharedGeometry }
}

/**
 * Breathing animation + audio reactivity for nebulae
 */
export const updateNebulae = (nebulaeData, time, audioBoost) => {
  if (!nebulaeData) return
  nebulaeData.nebulae.forEach((neb) => {
    // More expressive breathing: ±8% (was ±5%)
    const breath = Math.sin(time * neb.breathSpeed + neb.breathPhase) * 0.08 + 1.0
    neb.mesh.scale.setScalar(neb.baseScale * breath)
    neb.mesh.material.uniforms.uTime.value = time
    // Stronger audio reactivity: *0.8 (was *0.5)
    neb.mesh.material.uniforms.uOpacity.value = neb.baseOpacity * (1.0 + audioBoost * 0.8)
    neb.mesh.material.uniforms.uAudioBoost.value = audioBoost
    neb.mesh.rotation.z += 0.00003
  })
}

/**
 * Removes nebulae from scene and frees resources
 */
export const disposeNebulae = (scene, nebulaeData) => {
  if (!nebulaeData) return
  nebulaeData.nebulae.forEach((neb) => {
    scene.remove(neb.mesh)
    neb.mesh.material.dispose()
  })
  nebulaeData.sharedGeometry.dispose()
}
