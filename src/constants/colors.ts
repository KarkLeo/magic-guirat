/**
 * Цветовая палитра Magic Guitar
 * Централизованные константы цветов для всего приложения
 * Sprint 4 Task 4: Color Constants
 */

/**
 * Основные цвета приложения
 * Все значения в HEX формате
 */
export const COLORS = {
  // Фоновые цвета (градиенты для космической атмосферы)
  background: {
    deepPurple: '#1a0033',  // Глубокий фиолетовый
    darkBlue: '#0a192f',    // Тёмно-синий
    darkest: '#020617',     // Самый тёмный (почти чёрный)
    current: '#0f0c29',     // Текущий фон сцены
  },

  // Цвета струн (индиго → фиолетовый → розовый градиент)
  strings: {
    indigo: '#6366f1',      // Индиго (холодный)
    purple: '#8b5cf6',      // Фиолетовый (средний)
    pink: '#ec4899',        // Розовый (тёплый)
    // Цвета для каждой струны (E A D G B e)
    string1: '#ec4899',     // 1-я струна (E) - розовый
    string2: '#f472b6',     // 2-я струна (B) - светло-розовый
    string3: '#c084fc',     // 3-я струна (G) - светло-фиолетовый
    string4: '#8b5cf6',     // 4-я струна (D) - фиолетовый
    string5: '#7c3aed',     // 5-я струна (A) - тёмно-фиолетовый
    string6: '#6366f1',     // 6-я струна (E) - индиго
  },

  // Цвета спектра (циан → индиго → розовый → янтарь)
  spectrum: {
    cyan: '#06b6d4',        // Циан (низкие частоты)
    indigo: '#6366f1',      // Индиго (средние частоты)
    pink: '#ec4899',        // Розовый (высокие частоты)
    amber: '#f59e0b',       // Янтарь (очень высокие частоты)
  },

  // Цвета частиц
  particles: {
    white: '#ffffff',       // Белый (основной)
    cyan: '#06b6d4',        // Циан (холодный акцент)
    pink: '#ec4899',        // Розовый (тёплый акцент)
    purple: '#8b5cf6',      // Фиолетовый (средний акцент)
  },

  // Цвета UI элементов
  ui: {
    border: '#a8b5ff',      // Рамки (светло-индиго)
    borderOpacity: 0.2,     // Прозрачность рамок
    text: '#ffffff',        // Текст (белый)
    textSecondary: '#9ca3af', // Вторичный текст (серый)
    accent: '#ec4899',      // Акцентный цвет (розовый)
  },

  // Цвета для chord lines (соединительные линии)
  chordLines: {
    default: '#c084fc',     // Светло-фиолетовый
    opacity: 0.4,           // Прозрачность
  },
} as const

/**
 * Градиенты для различных элементов
 * Массивы цветов для создания плавных переходов
 */
export const GRADIENTS = {
  // Градиент фона (сверху вниз или радиальный)
  background: ['#1a0033', '#0a192f', '#020617'] as const,

  // Градиент струны (по длине)
  string: ['#6366f1', '#8b5cf6', '#ec4899'] as const,

  // Градиент спектра (от низких к высоким частотам)
  spectrum: ['#06b6d4', '#6366f1', '#ec4899', '#f59e0b'] as const,

  // Градиент для частиц (вариации)
  particles: ['#ffffff', '#06b6d4', '#ec4899'] as const,

  // Градиент для chord display
  chordName: ['#ec4899', '#f59e0b'] as const,
} as const

/**
 * RGB значения цветов для Three.js
 * Используется в шейдерах и материалах Three.js
 */
export const COLORS_RGB = {
  strings: {
    indigo: { r: 0.388, g: 0.4, b: 0.945 },      // #6366f1
    purple: { r: 0.545, g: 0.361, b: 0.965 },    // #8b5cf6
    pink: { r: 0.925, g: 0.282, b: 0.6 },        // #ec4899
  },
  spectrum: {
    cyan: { r: 0.024, g: 0.714, b: 0.831 },      // #06b6d4
    amber: { r: 0.961, g: 0.620, b: 0.043 },     // #f59e0b
  },
  particles: {
    white: { r: 1.0, g: 1.0, b: 1.0 },           // #ffffff
    cyan: { r: 0.024, g: 0.714, b: 0.831 },      // #06b6d4
    pink: { r: 0.925, g: 0.282, b: 0.6 },        // #ec4899
  },
} as const

/**
 * Утилиты для работы с цветами
 */
export const ColorUtils = {
  /**
   * Конвертирует HEX в RGB объект для Three.js
   * @param hex - HEX цвет (например, '#6366f1')
   * @returns RGB объект { r, g, b } в диапазоне [0, 1]
   */
  hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) {
      throw new Error(`Invalid hex color: ${hex}`)
    }
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    }
  },

  /**
   * Получает цвет струны по индексу (0-5)
   * @param index - Индекс струны (0 = 6-я струна, 5 = 1-я струна)
   * @returns HEX цвет струны
   */
  getStringColor(index: number): string {
    const stringColors = [
      COLORS.strings.string6, // 0: 6-я струна (E) - индиго
      COLORS.strings.string5, // 1: 5-я струна (A)
      COLORS.strings.string4, // 2: 4-я струна (D)
      COLORS.strings.string3, // 3: 3-я струна (G)
      COLORS.strings.string2, // 4: 2-я струна (B)
      COLORS.strings.string1, // 5: 1-я струна (e) - розовый
    ]
    return stringColors[index] || COLORS.strings.purple
  },
}

/**
 * Type definitions для автодополнения
 */
export type ColorKey = keyof typeof COLORS
export type GradientKey = keyof typeof GRADIENTS
