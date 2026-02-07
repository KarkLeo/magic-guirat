<template>
  <button
    class="capture-btn"
    :class="{
      active: isCapturing,
      requesting: isRequestingPermission,
      error: hasError,
    }"
    :disabled="isRequestingPermission"
    :aria-label="isCapturing ? 'Остановить захват' : 'Начать захват звука'"
    :aria-pressed="isCapturing"
    @click="$emit('toggle-capture')"
  >
    <!-- Play icon -->
    <svg v-if="!isCapturing && !isRequestingPermission" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
    <!-- Stop icon -->
    <svg v-else-if="isCapturing" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
    </svg>
    <!-- Spinner -->
    <span v-else class="spinner"></span>
  </button>
</template>

<script setup>
defineProps({
  isCapturing: {
    type: Boolean,
    default: false,
  },
  isRequestingPermission: {
    type: Boolean,
    default: false,
  },
  hasError: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['toggle-capture'])
</script>

<style scoped>
.capture-btn {
  position: fixed;
  top: 1.5rem;
  right: calc(1.5rem + 44px + 0.75rem);
  z-index: 10;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(168, 181, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(168, 181, 255, 0.9);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  padding: 0;
}

.capture-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(168, 181, 255, 0.4);
  color: #e0d6f6;
}

.capture-btn:focus-visible {
  outline: 3px solid #a855f7;
  outline-offset: 2px;
}

.capture-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Active state — pink accent */
.capture-btn.active {
  background: rgba(240, 147, 251, 0.2);
  border-color: rgba(240, 147, 251, 0.5);
  color: #f093fb;
}

.capture-btn.active:hover {
  background: rgba(240, 147, 251, 0.3);
}

/* Requesting state */
.capture-btn.requesting {
  background: rgba(168, 181, 255, 0.15);
  border-color: rgba(168, 181, 255, 0.3);
}

/* Error state */
.capture-btn.error {
  border-color: rgba(255, 107, 107, 0.5);
  color: #ff6b6b;
}

/* Spinner */
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .capture-btn {
    width: 38px;
    height: 38px;
    top: 1rem;
    right: calc(1rem + 38px + 0.5rem);
  }

  .capture-btn svg {
    width: 14px;
    height: 14px;
  }

  .spinner {
    width: 14px;
    height: 14px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .capture-btn {
    transition: none;
  }

  .spinner {
    animation: none;
    border-top-color: rgba(255, 255, 255, 0.5);
  }
}
</style>
