/**
 * Helper passes for composer:
 * - SaveFullSceneAndRenderStringsOnlyPass: saves full frame and renders only strings (layer 1)
 * - CompositeFullSceneWithGhostPass: combines full frame + ghost trails (only from strings)
 */

import { Pass } from 'three/examples/jsm/postprocessing/Pass.js'
import * as THREE from 'three'

const STRINGS_LAYER = 1

/**
 * Copies readBuffer to fullSceneRT, then renders scene only by layer STRINGS_LAYER into writeBuffer.
 * This way GhostTrailPass receives only strings on input.
 */
export class SaveFullSceneAndRenderStringsOnlyPass extends Pass {
  constructor(scene, camera, fullSceneRT) {
    super()
    this.needsSwap = true
    this.scene = scene
    this.camera = camera
    this.fullSceneRT = fullSceneRT

    const geometry = new THREE.PlaneGeometry(2, 2)
    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(tDiffuse, vUv);
        }
      `,
    })
    this.quad = new THREE.Mesh(geometry, this.copyMaterial)
    this.quadScene = new THREE.Scene()
    this.quadScene.add(this.quad)
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  }

  render(renderer, writeBuffer, readBuffer) {
    // 1) Save full frame to fullSceneRT
    this.copyMaterial.uniforms.tDiffuse.value = readBuffer.texture
    renderer.setRenderTarget(this.fullSceneRT)
    renderer.clear()
    renderer.render(this.quadScene, this.quadCamera)

    // 2) Render only strings (layer STRINGS_LAYER) to writeBuffer; background is transparent black
    const prevClearColor = renderer.getClearColor(new THREE.Color())
    const prevClearAlpha = renderer.getClearAlpha()
    renderer.setClearColor(0x000000, 0)
    this.camera.layers.disable(0)
    this.camera.layers.enable(STRINGS_LAYER)
    renderer.setRenderTarget(writeBuffer)
    renderer.clear()
    renderer.render(this.scene, this.camera)
    this.camera.layers.enable(0)
    this.camera.layers.enable(STRINGS_LAYER)
    renderer.setClearColor(prevClearColor, prevClearAlpha)
  }

  dispose() {
    this.copyMaterial.dispose()
    this.quad.geometry.dispose()
  }
}

/**
 * Compositing: result = full frame + ghost trail (additive).
 */
export class CompositeFullSceneWithGhostPass extends Pass {
  constructor(fullSceneRT) {
    super()
    this.needsSwap = true
    this.fullSceneRT = fullSceneRT

    const geometry = new THREE.PlaneGeometry(2, 2)
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tFullScene: { value: fullSceneRT.texture },
        tGhost: { value: null },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tFullScene;
        uniform sampler2D tGhost;
        varying vec2 vUv;
        void main() {
          vec4 full = texture2D(tFullScene, vUv);
          vec4 ghost = texture2D(tGhost, vUv);
          // Screen blend: no overexposure, ghost softly highlights over scene
          vec3 rgb = 1.0 - (1.0 - full.rgb) * (1.0 - ghost.rgb);
          float a = max(full.a, ghost.a);
          gl_FragColor = vec4(rgb, a);
        }
      `,
    })
    this.quad = new THREE.Mesh(geometry, this.material)
    this.scene = new THREE.Scene()
    this.scene.add(this.quad)
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  }

  render(renderer, writeBuffer, readBuffer) {
    this.material.uniforms.tFullScene.value = this.fullSceneRT.texture
    this.material.uniforms.tGhost.value = readBuffer.texture
    renderer.setRenderTarget(writeBuffer)
    renderer.clear()
    renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.material.dispose()
    this.quad.geometry.dispose()
  }
}
