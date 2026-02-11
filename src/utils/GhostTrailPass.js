/**
 * GhostTrailPass — custom post-processing pass for "ghost trails" effect
 * Uses ping-pong technique with two render targets for image accumulation
 */

import { Pass } from 'three/examples/jsm/postprocessing/Pass.js'
import * as THREE from 'three'
import trailAccumulationShader from '@/shaders/trailAccumulation.glsl?raw'

export class GhostTrailPass extends Pass {
  constructor(width, height, resolutionScale = 0.5) {
    super()

    // Important: specify that pass should swap buffers
    this.needsSwap = true
    this.resolutionScale = resolutionScale

    // Create two render targets for ping-pong (reduced resolution)
    const rtOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      stencilBuffer: false,
    }

    const scaledW = Math.max(1, Math.floor(width * resolutionScale))
    const scaledH = Math.max(1, Math.floor(height * resolutionScale))
    this.renderTargetA = new THREE.WebGLRenderTarget(scaledW, scaledH, rtOptions)
    this.renderTargetB = new THREE.WebGLRenderTarget(scaledW, scaledH, rtOptions)

    // Initial setup: A = write, B = read
    this.currentWriteTarget = this.renderTargetA
    this.currentReadTarget = this.renderTargetB

    // Create shader material for accumulation
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },     // Current frame (from input buffer)
        tPrevious: { value: this.currentReadTarget.texture }, // Previous accumulated frame
        uFadeSpeed: { value: 0.05 },   // Fade speed (0.05 = smooth fade 2-3 sec)
        uOpacity: { value: 0.7 },      // Ghost trails transparency
        uDriftOffset: { value: new THREE.Vector2(0, 0) }, // Base offset (no drift)
        uResolution: { value: new THREE.Vector2(scaledW, scaledH) }, // Resolution for box blur
        uBlurAmount: { value: 1.5 },   // Blur intensity
        uTime: { value: 0.0 },         // Time for wave animation
        uSmokeIntensity: { value: 1.0 }, // Smoke wave intensity
        uTurbulence: { value: 0.5 },   // Smoke turbulence
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: trailAccumulationShader,
    })

    // Copy material for simple texture copying (without accumulation)
    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
      },
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

    // Fullscreen quad for shader rendering
    const geometry = new THREE.PlaneGeometry(2, 2)
    this.quad = new THREE.Mesh(geometry, this.material)
    this.scene = new THREE.Scene()
    this.scene.add(this.quad)

    // Orthographic camera for fullscreen quad
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  }

  /**
   * Main rendering function for pass
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.WebGLRenderTarget} writeBuffer - output buffer
   * @param {THREE.WebGLRenderTarget} readBuffer - input buffer (current frame)
   */
  render(renderer, writeBuffer, readBuffer) {
    // Update time for animation
    this.material.uniforms.uTime.value += 0.016 // ~60 FPS

    // STEP 1: Render accumulation shader into currentWriteTarget
    this.material.uniforms.tDiffuse.value = readBuffer.texture
    this.material.uniforms.tPrevious.value = this.currentReadTarget.texture

    renderer.setRenderTarget(this.currentWriteTarget)
    // Don't clear buffer! This preserves accumulation
    this.quad.material = this.material
    renderer.render(this.scene, this.camera)

    // STEP 2: Copy result to output (writeBuffer or screen) using copyMaterial
    this.copyMaterial.uniforms.tDiffuse.value = this.currentWriteTarget.texture

    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
    } else {
      renderer.setRenderTarget(writeBuffer)
    }

    // Clear output buffer (this is normal)
    renderer.clear()
    this.quad.material = this.copyMaterial
    renderer.render(this.scene, this.camera)

    // Restore material on quad
    this.quad.material = this.material

    // STEP 3: Swap ping-pong targets for next frame
    const temp = this.currentReadTarget
    this.currentReadTarget = this.currentWriteTarget
    this.currentWriteTarget = temp
  }

  /**
   * Resize render targets
   */
  setSize(width, height) {
    const scaledW = Math.max(1, Math.floor(width * this.resolutionScale))
    const scaledH = Math.max(1, Math.floor(height * this.resolutionScale))
    this.renderTargetA.setSize(scaledW, scaledH)
    this.renderTargetB.setSize(scaledW, scaledH)
    // Update resolution uniform for box blur
    this.material.uniforms.uResolution.value.set(scaledW, scaledH)
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this.renderTargetA.dispose()
    this.renderTargetB.dispose()
    this.material.dispose()
    this.copyMaterial.dispose()
    this.quad.geometry.dispose()
  }

  /**
   * Public methods for parameter adjustment
   */
  setFadeSpeed(value) {
    this.material.uniforms.uFadeSpeed.value = value
  }

  setOpacity(value) {
    this.material.uniforms.uOpacity.value = value
  }

  setDriftOffset(x, y) {
    this.material.uniforms.uDriftOffset.value.set(x, y)
  }

  setBlurAmount(value) {
    this.material.uniforms.uBlurAmount.value = value
  }

  setSmokeIntensity(value) {
    this.material.uniforms.uSmokeIntensity.value = value
  }

  setTurbulence(value) {
    this.material.uniforms.uTurbulence.value = value
  }

  setTime(value) {
    this.material.uniforms.uTime.value = value
  }
}
