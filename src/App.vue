<script setup>
import { ref } from 'vue'
import AudioAnalyzerView from './components/AudioAnalyzerView.vue'
import SettingsPanel from './components/SettingsPanel.vue'

const isSettingsOpen = ref(false)
</script>

<template>
  <div class="app-container">
    <!-- Three.js + audio orchestrator (fullscreen) -->
    <AudioAnalyzerView />

    <!-- Logo overlay -->
    <h1 class="app-logo">Magic Guitar</h1>

    <!-- Settings button overlay -->
    <button class="settings-btn" @click="isSettingsOpen = true" aria-label="Настройки">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>

    <!-- Settings modal -->
    <SettingsPanel :is-open="isSettingsOpen" @close="isSettingsOpen = false" />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin: 0;
  padding: 0;
  overflow: hidden;
  color: #fff;
  background: #0f0c29;
}

#app {
  width: 100vw;
  height: 100vh;
  position: relative;
}

.app-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* Logo — top left overlay */
.app-logo {
  position: fixed;
  top: 1.5rem;
  left: 1.5rem;
  z-index: 10;
  font-size: 1.6rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #a855f7 50%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 20px rgba(102, 126, 234, 0.5));
  letter-spacing: -0.02em;
  pointer-events: none;
  user-select: none;
}

/* Settings button — top right overlay */
.settings-btn {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 10;
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(168, 181, 255, 0.2);
  border-radius: 50%;
  color: rgba(168, 181, 255, 0.7);
  padding: 0;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.settings-btn:hover {
  color: #e0d6f6;
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(168, 181, 255, 0.4);
}

.settings-btn:focus-visible {
  outline: 3px solid #a855f7;
  outline-offset: 2px;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .app-logo {
    font-size: 1.3rem;
    top: 1rem;
    left: 1rem;
  }

  .settings-btn {
    width: 38px;
    height: 38px;
    top: 1rem;
    right: 1rem;
  }

  .settings-btn svg {
    width: 18px;
    height: 18px;
  }
}
</style>
