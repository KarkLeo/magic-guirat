// Trail Accumulation Shader — Ghost Trails FBO Effect
// Смешивает текущий кадр с предыдущим накопленным кадром
// с экспоненциальным затуханием для эффекта "призрачных следов"

uniform sampler2D tDiffuse;     // Текущий кадр (струны)
uniform sampler2D tPrevious;    // Предыдущий накопленный кадр
uniform float uFadeSpeed;       // Скорость затухания (0.01 - 0.2, default: 0.05)
uniform float uOpacity;         // Общая прозрачность эффекта (0.0 - 1.0, default: 0.7)
uniform vec2 uDriftOffset;      // Смещение UV для "дымного" эффекта (drift вверх)

varying vec2 vUv;

void main() {
  // Текущий кадр
  vec4 current = texture2D(tDiffuse, vUv);

  // Предыдущий накопленный кадр с upward drift
  // Смещаем UV на +Y для эффекта "поднимающегося дыма"
  vec2 driftedUv = vUv + uDriftOffset;
  vec4 previous = texture2D(tPrevious, driftedUv);

  // Экспоненциальное затухание накопленного кадра
  // Умножаем RGB на (1.0 - uFadeSpeed) для плавного fade out
  previous.rgb *= (1.0 - uFadeSpeed);

  // Смешиваем: новый кадр поверх затухающего старого
  // Используем max() для additive-подобного эффекта (яркие области остаются)
  vec4 accumulated = vec4(
    max(current.rgb, previous.rgb),
    max(current.a, previous.a)
  );

  // Применяем общую прозрачность эффекта
  accumulated.a *= uOpacity;

  gl_FragColor = accumulated;
}
