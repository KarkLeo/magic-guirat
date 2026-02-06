# Current Work

## Status

**Current:** `in_progress`
**Task:** Sprint 3: Частицы и полировка
**Phase:** SETTINGS-1 завершена, готовы к коммиту

---

## Task Summary

**Sprint 2: Chromagram + Chord Recognition + Multi-string Visualization**

### Что реализовано:

#### 1. Утилиты нот — `src/utils/noteUtils.js`
- `NOTE_NAMES` — 12 нот хроматической гаммы
- `noteNameToPitchClass()` — название ноты → pitch class (0-11)
- `pitchClassToNoteName()` — pitch class → название ноты

#### 2. База данных аккордов — `src/data/chordDatabase.js`
- `CHORD_TEMPLATES` — 10 типов: major, minor, dom7, maj7, min7, sus2, sus4, dim, aug, power
- `CHORD_DISPLAY_NAMES` — суффиксы для отображения
- `lookupChord(activePitchClasses, chromagram, maxResults)` — скоринг: 12 корней × 10 шаблонов

#### 3. Chromagram анализатор — `src/composables/useChromaAnalyzer.js`
- FFT `getByteFrequencyData()` → маппинг bins на 12 pitch classes
- Нормализация + threshold-based активация (0.3)
- Экспорт: `chromagram`, `activePitchClasses`, `startAnalysis()`, `stopAnalysis()`

#### 4. Распознавание аккордов — `src/composables/useChordRecognition.js`
- Watch на `activePitchClasses` → `lookupChord()` → стабилизация (3 фрейма)
- Маппинг pitch classes → гитарные струны
- Экспорт: `currentChord`, `chordCandidates`, `isChordDetected`, `detectedStrings`

#### 5. AudioAnalyzerView.vue — модифицирован
- Подключены `useChromaAnalyzer` + `useChordRecognition`
- `detectionMode` computed: 'chord' если ≥2 pitch classes + аккорд найден
- `activeStringIndices` (Array) вместо `activeStringIndex` (Number)
- `stringIntensities` (Object) из chromagram
- Добавлен `<ChordNameDisplay>`

#### 6. GuitarStringsVisualization.vue — модифицирован
- Props: `activeStringIndices` (Array), `stringIntensities` (Object), `detectionMode` (String)
- Set-based проверка активных струн, per-string intensity
- Соединительные линии (THREE.Line) между аккордными струнами в chord mode
- Cleanup линий при смене аккорда / unmount

#### 7. ChordNameDisplay.vue — создан
- Gradient text (корень крупнее, суффикс мельче)
- Confidence bar
- Альтернативные аккорды
- CSS transitions при смене аккорда
- Фиолетово-розовая палитра, backdrop blur

### Архитектурные решения:
- **Отдельный composable** для chromagram (не расширяем useFrequencyAnalyzer) — разные домены (frequency vs time)
- **YIN сохраняется** для single-note (лучшая точность)
- **Автоматическое переключение** single↔chord через `detectionMode`
- **Стабилизация 3 фрейма** (~50ms) предотвращает мерцание

---

## Metadata

- **Task:** Sprint 3: Частицы и полировка
- **Current Phase:** SETTINGS-1 ✅ (готово к коммиту)
- **Status:** `in_progress`
- **Updated:** 2026-02-06
- **Sprint Progress:**
  - Sprint 2: 100% ЗАВЕРШЕН
  - Sprint 3: 20% (SETTINGS-1 готова, VIS-6 в очереди)

---

## Sprint 3 Progress

### ✅ SETTINGS-1: UI настроек (ГОТОВО К КОММИТУ)
**Статус:** Реализовано, ожидает коммита
**Дата:** 2026-02-06

#### Что реализовано:
1. **src/composables/useSettings.js** — singleton settings store
   - Загрузка настроек из localStorage
   - Выбор микрофона (список доступных девайсов)
   - Слайдер чувствительности (noise threshold: 0.0-1.0)
   - Автоматическое сохранение в localStorage
   - Reactive computed properties для Vue компонентов

2. **src/components/SettingsPanel.vue** — модальное окно настроек
   - Кнопка открытия панели (Settings icon)
   - Dropdown для выбора микрофона (перечисление доступных девайсов)
   - Слайдер для регулировки noise threshold (0-100%)
   - Индикатор текущих значений
   - Backdrop blur эффект, фиолетово-розовая палитра
   - Интеграция с AudioAnalyzerView

3. **Интеграция в AudioAnalyzerView.vue**
   - Подключена useSettings composable
   - Передача selectedMicrophone в useAudioCapture
   - Передача noiseThreshold в анализаторы (useFrequencyAnalyzer, useChromaAnalyzer)
   - Динамический выбор микрофона и настройка чувствительности

#### Файлы для коммита:
- ✅ src/components/SettingsPanel.vue (новый)
- ✅ src/composables/useSettings.js (новый)
- ✅ src/components/AudioAnalyzerView.vue (модифицирован)
- ✅ src/composables/useAudioCapture.js (модифицирован)
- ✅ src/composables/useFrequencyAnalyzer.js (модифицирован)
- ✅ src/App.vue (модифицирован)
- ✅ src/assets/main.css (модифицирован)
- ✅ И другие связанные файлы

## Next Steps

Sprint 3 (продолжение):
- [ ] VIS-6: Система частиц (эмиссия при ударе, trail эффекты)

---

*Auto-updated by Claude Code*
