// Trail Accumulation Shader — Ghost Trails FBO Effect
// Эффект клубящегося дыма с волновыми движениями в безветренном пространстве

uniform sampler2D tDiffuse; // Текущий кадр (струны)
uniform sampler2D tPrevious; // Предыдущий накопленный кадр
uniform float uFadeSpeed; // Скорость затухания (0.03 - 0.15)
uniform float uOpacity; // Общая прозрачность шлейфа (0.0 - 1.0)
uniform vec2 uDriftOffset; // Базовое смещение UV (обычно 0,0)
uniform vec2 uResolution; // Разрешение для blur
uniform float uBlurAmount; // Размытие (0.0 - 2.0)
uniform float uTime; // Время для анимации волн
uniform float uSmokeIntensity; // Интенсивность волн (0.0 - 2.0)
uniform float uTurbulence; // Турбулентность дыма (0.0 - 1.0)

varying vec2 vUv;

// Простая шумовая функция для клубящегося дыма
float noise(vec2 p) {
  return sin(p.x * 10.0) * sin(p.y * 10.0);
}

// Упрощённый FBM с 2 октавами (достаточно для дымного эффекта, -50% trig ops)
float fbm(vec2 p) {
  float value = 0.5 * noise(p);
  value += 0.25 * noise(p * 2.0);
  return value;
}

// Функция для создания волновых движений дыма
vec2 smokeWave(vec2 uv, float time) {
  // Движение вверх должно быть константным для feedback loop,
  // а не расти бесконечно от времени.
  float upward = 0.002;

  // Волновые колебания по горизонтали (используем sin для цикличности)
  float waveX = sin(uv.y * 8.0 + time * 2.0) * 0.005;

  // Клубящиеся движения (турбулентность) — время здесь ок, так как шум цикличен или случаен
  float turbulenceX = fbm(vec2(uv.x * 3.0, uv.y * 2.0 + time * 0.5)) * 0.008;
  float turbulenceY = fbm(vec2(uv.x * 2.0, uv.y * 3.0 + time * 0.4)) * 0.005;

  // Комбинируем движения
  // Чтобы дым шел ВВЕРХ, мы должны сэмплировать предыдущий кадр чуть НИЖЕ
  return vec2(waveX + turbulenceX, -upward + turbulenceY);
}

// Лёгкий box blur 3x3
vec4 boxBlur(sampler2D tex, vec2 uv, vec2 pixelSize, float blurAmount) {
  vec4 result = vec4(0.0);
  float total = 0.0;
  float w[9];
  w[0] = 1.0;
  w[1] = 2.0;
  w[2] = 1.0;
  w[3] = 2.0;
  w[4] = 4.0;
  w[5] = 2.0;
  w[6] = 1.0;
  w[7] = 2.0;
  w[8] = 1.0;
  int idx = 0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 off = vec2(float(x), float(y)) * pixelSize * blurAmount;
      result += texture2D(tex, uv + off) * w[idx];
      total += w[idx];
      idx++;
    }
  }
  return result / total;
}

void main() {
  vec4 current = texture2D(tDiffuse, vUv);
  vec2 pixelSize = 1.0 / uResolution;

  // Применяем волновые движения дыма к UV координатам
  vec2 smokeOffset = smokeWave(vUv, uTime) * uSmokeIntensity;
  vec2 animatedUv = vUv + uDriftOffset + smokeOffset;

  // Добавляем дополнительную турбулентность
  vec2 turbulence = vec2(
    sin(uTime * 3.0 + vUv.x * 5.0) * uTurbulence * 0.005,
    cos(uTime * 2.0 + vUv.y * 4.0) * uTurbulence * 0.003
  );
  animatedUv += turbulence;

  vec4 previous = boxBlur(tPrevious, animatedUv, pixelSize, uBlurAmount);

  // Затухание накопленного кадра
  float fade = 1.0 - uFadeSpeed;
  previous.rgb *= fade;
  previous.a *= fade;

  // Простое аддитивное накопление: текущие струны + затухающий след
  // Без Reinhard и trailMask — они убивали накопление при колебании
  // CompositeFullSceneWithGhostPass делает screen blend на финальном этапе
  vec3 blendedColor = current.rgb + previous.rgb * uOpacity;

  float finalAlpha = max(current.a, previous.a * uOpacity);
  gl_FragColor = vec4(blendedColor, finalAlpha);
}
