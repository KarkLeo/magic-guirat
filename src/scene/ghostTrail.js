import * as THREE from 'three'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { GhostTrailPass } from '@/utils/GhostTrailPass'
import {
  SaveFullSceneAndRenderStringsOnlyPass,
  CompositeFullSceneWithGhostPass,
} from '@/utils/ComposerHelperPasses'

/**
 * Creates FBO system for Ghost Trails effect
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {number} w - width
 * @param {number} h - height
 * @param {number} fboScale - FBO resolution scale
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
 * Disposes ghost trail resources
 */
export const disposeGhostTrail = (data) => {
  if (!data) return
  if (data.savePass) data.savePass.dispose()
  if (data.compositePass) data.compositePass.dispose()
  if (data.ghostTrailPass) data.ghostTrailPass.dispose()
  if (data.fullSceneRT) data.fullSceneRT.dispose()
}

/**
 * Recreates Ghost Trail FBO with new scale, repositioning passes in composer
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

  // Restore passes in correct order
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
