// Trail Accumulation Shader — Ghost Trails FBO Effect
// Смешивает текущий кадр с предыдущим накопленным кадром
// с экспоненциальным затуханием для эффекта "призрачных следов"

uniform sampler2D tDiffuse;     // Текущий кадр (струны)
uniform sampler2D tPrevious;    // Предыдущий накопленный кадр
uniform float uFadeSpeed;       // Скорость затухания (0.01 - 0.2, default: 0.05)
uniform float uOpacity;         // Общая прозрачность эффекта (0.0 - 1.0, default: 0.7)
uniform vec2 uDriftOffset;      // Смещение UV для "дымного" эффекта (drift вверх)
uniform vec2 uResolution;       // Разрешение экрана для box blur
uniform float uBlurAmount;      // Интенсивность размытия (0.0 - 5.0, default: 1.5)

varying vec2 vUv;

// Box blur 3x3 для "дымного" эффекта
vec4 boxBlur(sampler2D tex, vec2 uv, vec2 pixelSize, float blurAmount) {
  vec4 result = vec4(0.0);
  float total = 0.0;

  // 3x3 kernel с гауссовыми весами
  float weights[9];
  weights[0] = 1.0; weights[1] = 2.0; weights[2] = 1.0;
  weights[3] = 2.0; weights[4] = 4.0; weights[5] = 2.0;
  weights[6] = 1.0; weights[7] = 2.0; weights[8] = 1.0;

  int idx = 0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y)) * pixelSize * blurAmount;
      result += texture2D(tex, uv + offset) * weights[idx];
      total += weights[idx];
      idx++;
    }
  }

  return result / total;
}

void main() {
  // Текущий кадр (четкий, без размытия)
  vec4 current = texture2D(tDiffuse, vUv);

  // Предыдущий накопленный кадр с upward drift
  // Смещаем UV на +Y для эффекта "поднимающегося дыма"
  vec2 driftedUv = vUv + uDriftOffset;

  // Применяем легкое размытие к previous для дымного эффекта
  vec2 pixelSize = 1.0 / uResolution;
  vec4 previous = boxBlur(tPrevious, driftedUv, pixelSize, uBlurAmount);

  // Экспоненциальное затухание
  float fadeFactor = 1.0 - uFadeSpeed;
  previous.rgb *= fadeFactor;
  previous.a *= fadeFactor;

  // Смешивание: текущий кадр поверх затухающего previous
  // Используем screen blending для аддитивного эффекта свечения
  vec3 blendedColor = current.rgb + previous.rgb * uOpacity;

  // Финальная альфа учитывает оба кадра
  float finalAlpha = max(current.a, previous.a * uOpacity);

  gl_FragColor = vec4(blendedColor, finalAlpha);
}
