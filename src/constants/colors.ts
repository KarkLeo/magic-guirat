/**
 * Color palette for Magic Guitar
 * Centralized color constants for the entire application
 * Sprint 4 Task 4: Color Constants
 */

/**
 * Main application colors
 * All values in HEX format
 */
export const COLORS = {
  // Background colors (gradients for cosmic atmosphere)
  background: {
    deepPurple: '#12002b',  // Deep purple (richer)
    darkBlue: '#081e3d',    // Dark blue (richer)
    darkest: '#020617',     // Darkest (almost black)
    current: '#0f0c29',     // Current scene background
  },

  // String colors (indigo → purple → pink gradient)
  strings: {
    indigo: '#6366f1',      // Indigo (cool)
    purple: '#8b5cf6',      // Purple (medium)
    pink: '#ec4899',        // Pink (warm)
    // Colors for each string (E A D G B e)
    string1: '#ec4899',     // 1st string (E) - pink
    string2: '#f472b6',     // 2nd string (B) - light pink
    string3: '#c084fc',     // 3rd string (G) - light purple
    string4: '#8b5cf6',     // 4th string (D) - purple
    string5: '#7c3aed',     // 5th string (A) - dark purple
    string6: '#6366f1',     // 6th string (E) - indigo
  },

  // Spectrum colors (cyan → indigo → pink → amber)
  spectrum: {
    cyan: '#06b6d4',        // Cyan (low frequencies)
    indigo: '#6366f1',      // Indigo (mid frequencies)
    pink: '#ec4899',        // Pink (high frequencies)
    amber: '#f59e0b',       // Amber (very high frequencies)
  },

  // Particle colors
  particles: {
    white: '#ffffff',       // White (primary)
    cyan: '#06b6d4',        // Cyan (cool accent)
    pink: '#ec4899',        // Pink (warm accent)
    purple: '#8b5cf6',      // Purple (medium accent)
  },

  // Star colors (color diversity for background stars)
  stars: {
    white: '#ffffff',       // Default white
    blueWhite: '#cce0ff',   // Blue-white (20% of stars)
    warmYellow: '#fff4e0',  // Warm yellow (10% of stars)
  },

  // Nebula colors
  nebulae: {
    indigo: '#6366f1',
    pink: '#ec4899',
    purple: '#8b5cf6',
    teal: '#0d9488',        // Dark teal for depth
  },

  // UI element colors
  ui: {
    border: '#a8b5ff',      // Borders (light indigo)
    borderOpacity: 0.2,     // Border opacity
    text: '#ffffff',        // Text (white)
    textSecondary: '#9ca3af', // Secondary text (gray)
    accent: '#ec4899',      // Accent color (pink)
  },

  // Colors for chord lines (connector lines)
  chordLines: {
    default: '#c084fc',     // Light purple
    opacity: 0.4,           // Opacity
  },
} as const

/**
 * Gradients for various elements
 * Color arrays for creating smooth transitions
 */
export const GRADIENTS = {
  // Background gradient (top to bottom or radial)
  background: ['#12002b', '#081e3d', '#020617'] as const,

  // String gradient (along length)
  string: ['#6366f1', '#8b5cf6', '#ec4899'] as const,

  // Spectrum gradient (from low to high frequencies)
  spectrum: ['#06b6d4', '#6366f1', '#ec4899', '#f59e0b'] as const,

  // Gradient for particles (variations)
  particles: ['#ffffff', '#06b6d4', '#ec4899'] as const,

  // Gradient for chord display
  chordName: ['#ec4899', '#f59e0b'] as const,
} as const

/**
 * RGB values for colors for Three.js
 * Used in shaders and Three.js materials
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
    pink: { r: 0.925, g: 0.282, b: 0.6},        // #ec4899
  },
  stars: {
    white: { r: 1.0, g: 1.0, b: 1.0 },           // #ffffff
    blueWhite: { r: 0.8, g: 0.878, b: 1.0 },     // #cce0ff
    warmYellow: { r: 1.0, g: 0.957, b: 0.878 },   // #fff4e0
  },
  nebulae: {
    teal: { r: 0.051, g: 0.580, b: 0.533 },       // #0d9488
  },
} as const

/**
 * Utilities for working with colors
 */
export const ColorUtils = {
  /**
   * Converts HEX to RGB object for Three.js
   * @param hex - HEX color (e.g., '#6366f1')
   * @returns RGB object { r, g, b } in range [0, 1]
   */
  hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) {
      throw new Error(`Invalid hex color: ${hex}`)
    }
    return {
      r: parseInt(result[1]!, 16) / 255,
      g: parseInt(result[2]!, 16) / 255,
      b: parseInt(result[3]!, 16) / 255,
    }
  },

  /**
   * Gets string color by index (0-5)
   * @param index - String index (0 = 6th string, 5 = 1st string)
   * @returns HEX string color
   */
  getStringColor(index: number): string {
    const stringColors = [
      COLORS.strings.string6, // 0: 6th string (E) - indigo
      COLORS.strings.string5, // 1: 5th string (A)
      COLORS.strings.string4, // 2: 4th string (D)
      COLORS.strings.string3, // 3: 3rd string (G)
      COLORS.strings.string2, // 4: 2nd string (B)
      COLORS.strings.string1, // 5: 1st string (e) - pink
    ]
    return stringColors[index] || COLORS.strings.purple
  },
}

/**
 * Type definitions for autocomplete
 */
export type ColorKey = keyof typeof COLORS
export type GradientKey = keyof typeof GRADIENTS
