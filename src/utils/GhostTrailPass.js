/**
 * GhostTrailPass — кастомный post-processing pass для эффекта "призрачных следов"
 * Использует ping-pong технику с двумя render targets для накопления изображения
 */

import { Pass } from 'three/examples/jsm/postprocessing/Pass.js'
import * as THREE from 'three'
import trailAccumulationShader from '@/shaders/trailAccumulation.glsl?raw'

export class GhostTrailPass extends Pass {
  constructor(width, height) {
    super()

    // Создаём два render targets для ping-pong
    const rtOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      stencilBuffer: false,
    }

    this.renderTargetA = new THREE.WebGLRenderTarget(width, height, rtOptions)
    this.renderTargetB = new THREE.WebGLRenderTarget(width, height, rtOptions)

    // Начальная настройка: A = write, B = read
    this.currentWriteTarget = this.renderTargetA
    this.currentReadTarget = this.renderTargetB

    // Создаём shader material для accumulation
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },     // Текущий кадр (из input buffer)
        tPrevious: { value: this.currentReadTarget.texture }, // Предыдущий накопленный кадр
        uFadeSpeed: { value: 0.05 },   // Скорость затухания (0.05 = плавное, 2-3 сек)
        uOpacity: { value: 0.7 },      // Прозрачность эффекта
        uDriftOffset: { value: new THREE.Vector2(0, 0.001) }, // Upward drift для "дыма"
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

    // Fullscreen quad для рендеринга shader
    const geometry = new THREE.PlaneGeometry(2, 2)
    this.quad = new THREE.Mesh(geometry, this.material)
    this.scene = new THREE.Scene()
    this.scene.add(this.quad)

    // Orthographic camera для fullscreen quad
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  }

  /**
   * Основная функция рендеринга pass
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.WebGLRenderTarget} writeBuffer - output buffer
   * @param {THREE.WebGLRenderTarget} readBuffer - input buffer (текущий кадр)
   */
  render(renderer, writeBuffer, readBuffer) {
    // 1. Обновляем uniforms: текущий кадр и предыдущий накопленный
    this.material.uniforms.tDiffuse.value = readBuffer.texture
    this.material.uniforms.tPrevious.value = this.currentReadTarget.texture

    // 2. Рендерим accumulation shader в currentWriteTarget
    // Это создаёт новый накопленный кадр (current + previous с fade)
    const oldTarget = renderer.getRenderTarget()
    renderer.setRenderTarget(this.currentWriteTarget)
    renderer.render(this.scene, this.camera)
    renderer.setRenderTarget(oldTarget)

    // 3. Копируем результат в output buffer для следующего pass (bloom)
    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
      renderer.render(this.scene, this.camera)
    } else {
      // Копируем currentWriteTarget в writeBuffer
      this.material.uniforms.tDiffuse.value = this.currentWriteTarget.texture
      this.material.uniforms.tPrevious.value = null // Отключаем blend для финального копирования

      // Временный material для простого копирования
      const copyMaterial = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: this.currentWriteTarget.texture },
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

      const oldMaterial = this.quad.material
      this.quad.material = copyMaterial

      renderer.setRenderTarget(writeBuffer)
      renderer.render(this.scene, this.camera)

      this.quad.material = oldMaterial
      copyMaterial.dispose()
      renderer.setRenderTarget(null)
    }

    // 4. Ping-pong: swap read/write targets для следующего кадра
    const temp = this.currentReadTarget
    this.currentReadTarget = this.currentWriteTarget
    this.currentWriteTarget = temp
  }

  /**
   * Изменение размера render targets
   */
  setSize(width, height) {
    this.renderTargetA.setSize(width, height)
    this.renderTargetB.setSize(width, height)
  }

  /**
   * Очистка ресурсов
   */
  dispose() {
    this.renderTargetA.dispose()
    this.renderTargetB.dispose()
    this.material.dispose()
    this.quad.geometry.dispose()
  }

  /**
   * Публичные методы для настройки параметров
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
}
