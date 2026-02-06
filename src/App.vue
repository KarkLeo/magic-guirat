<script setup>
import AudioCaptureButton from './components/AudioCaptureButton.vue'
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">🎸 Magic Guitar</h1>
      <p class="app-subtitle">Захват и визуализация игры на гитаре</p>
    </header>

    <main class="app-main">
      <AudioCaptureButton />
    </main>

    <footer class="app-footer">
      <p>Sprint 1 • AUDIO-1: Захват звука с микрофона</p>
    </footer>
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
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  color: #fff;
}

#app {
  min-height: 100vh;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 2rem;
}

.app-header {
  text-align: center;
  margin-bottom: 3rem;
}

.app-title {
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 30px rgba(102, 126, 234, 0.5);
}

.app-subtitle {
  font-size: 1.25rem;
  color: #a8b5ff;
  font-weight: 300;
}

.app-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-footer {
  text-align: center;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(168, 181, 255, 0.2);
  color: #a8b5ff;
  font-size: 0.875rem;
}
</style>
