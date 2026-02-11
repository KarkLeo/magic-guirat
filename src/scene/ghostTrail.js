import * as THREE from 'three'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { GhostTrailPass } from '@/utils/GhostTrailPass'
import {
  SaveFullSceneAndRenderStringsOnlyPass,
  CompositeFullSceneWithGhostPass,
} from '@/utils/ComposerHelperPasses'

/**
 * Создаёт FBO систему для Ghost Trails эффекта
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {number} w - ширина
 * @param {number} h - высота
 * @param {number} fboScale - масштаб разрешения FBO
 * @returns {{ ghostTrailPass, fullSceneRT, savePass, compositePass }}
 */
export const createGhostTrailFBO = (scene, camera, w, h, fboScale) => {
  const rtOptions = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    stencilBuffer: false,
  }
  const fullSceneRT = new THREE.WebGLRenderTarget(w, h, rtOptions)

  const savePass = new SaveFullSceneAndRenderStringsOnlyPass(scene, camera, fullSceneRT)
  const ghostTrailPass = new GhostTrailPass(w, h, fboScale)
  const compositePass = new CompositeFullSceneWithGhostPass(fullSceneRT)

  return { ghostTrailPass, fullSceneRT, savePass, compositePass }
}

/**
 * Удаляет ghost trail ресурсы
 */
export const disposeGhostTrail = (data) => {
  if (!data) return
  if (data.savePass) data.savePass.dispose()
  if (data.compositePass) data.compositePass.dispose()
  if (data.ghostTrailPass) data.ghostTrailPass.dispose()
  if (data.fullSceneRT) data.fullSceneRT.dispose()
}

/**
 * Пересоздаёт Ghost Trail FBO с новым scale, переставляя passes в composer
 * @param {EffectComposer} composer
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {number} fboScale
 * @param {function} getSize - () => { width, height }
 * @returns {{ ghostTrailPass, fullSceneRT, savePass, compositePass }}
 */
export const recreateGhostTrailFBO = (composer, scene, camera, fboScale, getSize) => {
  if (!composer || !scene) return null

  const passes = composer.passes.slice()
  composer.passes.length = 0

  // Dispose old ghost trail passes
  passes.forEach((pass) => {
    if (pass instanceof SaveFullSceneAndRenderStringsOnlyPass ||
        pass instanceof GhostTrailPass ||
        pass instanceof CompositeFullSceneWithGhostPass) {
      pass.dispose()
    }
  })

  const { width, height } = getSize()
  const newData = createGhostTrailFBO(scene, camera, width, height, fboScale)

  // Восстанавливаем passes в правильном порядке
  passes.forEach((pass) => {
    if (pass instanceof SaveFullSceneAndRenderStringsOnlyPass ||
        pass instanceof GhostTrailPass ||
        pass instanceof CompositeFullSceneWithGhostPass) return
    if (pass instanceof RenderPass) {
      composer.addPass(pass)
      composer.addPass(newData.savePass)
      composer.addPass(newData.ghostTrailPass)
      composer.addPass(newData.compositePass)
    } else {
      composer.addPass(pass)
    }
  })

  return newData
}
