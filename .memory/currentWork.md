# Current Work

## Status

**Current:** `done`
**Task:** FIX: Sound-to-string mapping

---

## Task Summary

**FIX: Исправление маппинга звука к гитарным струнам**

### Проблемы (были):
1. FFT-based pitch detection слишком грубый для басовых частот гитары (binWidth ~11.7 Hz)
2. HPS алгоритм реализован некорректно (геометрическое среднее вместо произведения)
3. Essentia.js отключен из-за проблем с загрузкой
4. Confidence основан на громкости, а не на качестве определения ноты
5. Сравнение струн по абсолютной разнице в Hz вместо полутонового расстояния

### Решения (реализовано):

#### 1. YIN autocorrelation pitch detection
**Файл:** `src/composables/useFrequencyAnalyzer.js`

Полная замена HPS на YIN алгоритм:
- `yinDifferenceFunction()` — d(tau) = sum((x[j] - x[j+tau])^2)
- `yinCumulativeMeanNormalized()` — нормализация кумулятивным средним
- `yinAbsoluteThreshold()` — первый минимум ниже порога 0.15
- `yinParabolicInterpolation()` — sub-sample точность
- `getFloatTimeDomainData()` для YIN (time-domain)
- `getByteFrequencyData()` в отдельный буфер для визуализации спектра
- RMS проверка уровня сигнала
- Экспорт `pitchConfidence` ref (реальный confidence из YIN, 0-1)

#### 2. Semitone distance для сравнения струн
**Файл:** `src/utils/guitarMapping.js`

- `getStringByFrequency()`: `12 * Math.log2(f1/f2)` вместо `Math.abs(f1 - f2)`
- `findClosestString()`: semitone distance + порог > 12 (октава) вместо ratio > 2

#### 3. Confidence-based wiring
**Файл:** `src/components/AudioAnalyzerView.vue`

- `pitchConfidence` из `frequencyAnalyzer.pitchConfidence` (YIN) вместо audioLevel
- `activeStringIndex` фильтрация: confidence < 0.3 = не маппим на струну
- Убран `isEssentiaLoaded` ref

---

## Metadata

- **Task:** FIX: Sound-to-string mapping (Sprint 1)
- **Status:** `done`
- **Completed:** 2026-02-06
- **Sprint Progress:** Sprint 1 MVP — 100% ЗАВЕРШЕН

---

## Next Steps

Sprint 2: Аккорды и магия
- AUDIO-4: Полифония
- AUDIO-5: База данных аккордов
- AUDIO-6: Распознавание аккордов
- VIS-3: Визуализация аккордов
- VIS-4: Названия аккордов

---

*Auto-updated by Claude Code*
