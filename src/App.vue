<script setup>
import AudioAnalyzerView from './components/AudioAnalyzerView.vue'
</script>

<template>
  <div class="app-container">
    <header class="app-header" role="banner">
      <h1 class="app-title">🎸 Magic Guitar</h1>
      <p class="app-subtitle">Захват и визуализация игры на гитаре</p>
    </header>

    <main class="app-main" role="main">
      <AudioAnalyzerView />
    </main>

    <footer class="app-footer" role="contentinfo">
      <p>Sprint 1 MVP • 100% завершено 🎸✨🎉</p>
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
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  color: #fff;

  /* Многослойный градиент для глубины */
  background:
    radial-gradient(ellipse at top, rgba(102, 126, 234, 0.15) 0%, transparent 60%),
    radial-gradient(ellipse at bottom, rgba(240, 147, 251, 0.1) 0%, transparent 60%),
    linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 70%, #190e33 100%);
  background-attachment: fixed;
}

#app {
  min-height: 100vh;
  position: relative;
}

/* Subtle animated glow effect */
#app::before {
  content: '';
  position: fixed;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
    circle at center,
    rgba(102, 126, 234, 0.08) 0%,
    transparent 50%
  );
  animation: glow-pulse 8s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes glow-pulse {
  0%, 100% {
    opacity: 0.5;
    transform: translate(0, 0) scale(1);
  }
  50% {
    opacity: 0.8;
    transform: translate(10px, 10px) scale(1.05);
  }
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 2rem;
  position: relative;
  z-index: 1;
}

.app-header {
  text-align: center;
  margin-bottom: 3rem;
  animation: fade-in-down 0.8s ease-out;
}

@keyframes fade-in-down {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.app-title {
  font-size: 3.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #a855f7 50%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.75rem;
  filter: drop-shadow(0 0 40px rgba(102, 126, 234, 0.6));
  letter-spacing: -0.02em;
}

.app-subtitle {
  font-size: 1.35rem;
  color: #c5b4e3;
  font-weight: 300;
  text-shadow: 0 2px 10px rgba(197, 180, 227, 0.3);
  letter-spacing: 0.02em;
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
  border-top: 1px solid rgba(168, 181, 255, 0.15);
  color: #a8b5ff;
  font-size: 0.875rem;
  opacity: 0.8;
  animation: fade-in-up 0.8s ease-out 0.3s backwards;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 0.8;
    transform: translateY(0);
  }
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

  #app::before {
    animation: none;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .app-container {
    padding: 1rem;
  }

  .app-header {
    margin-bottom: 2rem;
  }

  .app-title {
    font-size: 2.5rem;
  }

  .app-subtitle {
    font-size: 1.1rem;
  }

  .app-footer {
    font-size: 0.75rem;
    margin-top: 2rem;
  }
}
</style>
