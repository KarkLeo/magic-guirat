import * as THREE from 'three'
import { GUITAR_STRINGS, TOTAL_STRINGS } from '@/utils/guitarMapping'
import { ColorUtils } from '@/constants'
import stringVertexShader from '@/shaders/stringVertex.glsl?raw'
import stringFragmentShader from '@/shaders/stringFragment.glsl?raw'

const STRING_LENGTH = 20
const STRING_RADIUS = 0.05
const STRING_SPACING = 1.2

/**
 * Создаёт 6 струн гитары с кастомными шейдерами
 * @param {THREE.Scene} scene
 * @returns {THREE.Mesh[]} массив mesh'ей струн
 */
export const createStrings = (scene) => {
  const geometry = new THREE.CylinderGeometry(
    STRING_RADIUS,
    STRING_RADIUS,
    STRING_LENGTH,
    16,
    128,
  )

  const strings = []

  GUITAR_STRINGS.forEach((stringInfo, index) => {
    const colorHex = ColorUtils.getStringColor(index)
    const baseColor = new THREE.Color(colorHex)
    const colorStart = baseColor.clone().multiplyScalar(1.2)
    const colorEnd = baseColor.clone()

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uAmplitude: { value: 0.0 },
        uFrequency: { value: 0.15 + index * 0.015 },
        uDamping: { value: 1.0 + index * 0.08 },
        uAttackTime: { value: 0.0 },
        uSpeed: { value: 1.0 },
        uColorStart: { value: colorStart },
        uColorEnd: { value: colorEnd },
        uGlowIntensity: { value: 0.2 },
        uEdgeGlow: { value: 0.3 },
      },
      vertexShader: stringVertexShader,
      fragmentShader: stringFragmentShader,
    })

    const mesh = new THREE.Mesh(geometry, material)
    const yPosition = (TOTAL_STRINGS - 1) * (STRING_SPACING / 2) - index * STRING_SPACING
    mesh.position.set(0, yPosition, 0)
    mesh.rotation.z = Math.PI / 2
    mesh.layers.enable(1)

    mesh.userData = {
      stringIndex: stringInfo.index,
      arrayIndex: index,
      baseColor: baseColor,
      targetIntensity: 0.2,
      currentIntensity: 0.2,
      targetAmplitude: 0.0,
      currentAmplitude: 0.0,
    }

    scene.add(mesh)
    strings.push(mesh)
  })

  return strings
}

/**
 * Обновляет свечение и колебания струн на основе props
 * @param {THREE.Mesh[]} strings
 * @param {{ activeStringIndices, stringIntensities, isActive }} props
 * @param {Set} prevActiveSet
 * @param {function} onBurst - callback(arrayIndex, intensity) при новой активации
 * @returns {Set} новый prevActiveSet
 */
export const updateStringActivation = (strings, props, prevActiveSet, onBurst) => {
  if (!strings.length) return prevActiveSet

  const activeSet = new Set(props.activeStringIndices)
  const intensities = props.stringIntensities
  const currentTime = performance.now()

  strings.forEach((string) => {
    const userData = string.userData
    const uniforms = string.material.uniforms
    const idx = userData.stringIndex

    if (activeSet.has(idx) && props.isActive) {
      const intensity = Math.max(0, Math.min(1, intensities[idx] || 0.7))
      userData.targetIntensity = 0.5 + intensity * 1.5
      const baseAmplitude = 0.025 + (userData.arrayIndex * 0.0085)
      userData.targetAmplitude = baseAmplitude + intensity * 0.0835

      if (!prevActiveSet.has(idx)) {
        uniforms.uAttackTime.value = currentTime
        if (onBurst) onBurst(userData.arrayIndex, intensity)
      }
    } else if (activeSet.size === 0 && props.isActive) {
      userData.targetIntensity = 0.25
      userData.targetAmplitude = 0.0
    } else {
      userData.targetIntensity = 0.2
      userData.targetAmplitude = 0.0
    }
  })

  return new Set(props.activeStringIndices)
}

/**
 * Обновляет шейдеры струн каждый кадр (анимация uniforms)
 */
export const updateStringUniforms = (strings, time) => {
  strings.forEach((string) => {
    const userData = string.userData
    const uniforms = string.material.uniforms

    uniforms.uTime.value = time

    const intensityDiff = userData.targetIntensity - userData.currentIntensity
    userData.currentIntensity += intensityDiff * 0.15
    uniforms.uGlowIntensity.value = userData.currentIntensity

    const amplitudeDiff = userData.targetAmplitude - userData.currentAmplitude
    userData.currentAmplitude += amplitudeDiff * 0.2
    uniforms.uAmplitude.value = userData.currentAmplitude
  })
}

/**
 * Удаляет струны из сцены и освобождает ресурсы
 */
export const disposeStrings = (scene, strings) => {
  strings.forEach((string) => {
    scene.remove(string)
    string.geometry.dispose()
    string.material.dispose()
  })
}
