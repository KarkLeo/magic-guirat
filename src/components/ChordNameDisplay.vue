<template>
  <div class="chord-display">
    <transition name="chord-swap" mode="out-in">
      <div :key="chord?.displayName || 'none'" class="chord-content">
        <!-- Основной аккорд -->
        <div class="chord-name">
          <span class="chord-root">{{ chord?.rootName || '' }}</span>
          <span class="chord-suffix">{{ chordSuffix }}</span>
        </div>

        <!-- Confidence bar -->
        <div class="confidence-bar">
          <div class="confidence-fill" :style="{ width: confidencePercent + '%' }"></div>
        </div>

        <!-- Альтернативные аккорды -->
        <div v-if="candidates.length > 0" class="chord-alternatives">
          <span
            v-for="(alt, i) in candidates"
            :key="i"
            class="chord-alt"
          >
            {{ alt.displayName }}
          </span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CHORD_DISPLAY_NAMES } from '@/data/chordDatabase'

const props = defineProps({
  chord: {
    type: Object,
    default: null,
  },
  candidates: {
    type: Array,
    default: () => [],
  },
})

const chordSuffix = computed(() => {
  if (!props.chord) return ''
  return CHORD_DISPLAY_NAMES[props.chord.type] || ''
})

const confidencePercent = computed(() => {
  if (!props.chord) return 0
  return Math.round(Math.max(0, Math.min(1, props.chord.score)) * 100)
})
</script>

<style scoped>
.chord-display {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(15, 12, 41, 0.7);
  border-radius: 16px;
  border: 1px solid rgba(168, 181, 255, 0.2);
  backdrop-filter: blur(12px);
}

.chord-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.chord-name {
  display: flex;
  align-items: baseline;
  gap: 0.15em;
}

.chord-root {
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, #c084fc, #f093fb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.chord-suffix {
  font-size: 1.8rem;
  font-weight: 500;
  background: linear-gradient(135deg, #a855f7, #e879f9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.confidence-bar {
  width: 120px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #c084fc);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.chord-alternatives {
  display: flex;
  gap: 0.75rem;
}

.chord-alt {
  font-size: 0.85rem;
  color: rgba(192, 132, 252, 0.5);
  font-weight: 400;
}

/* Transition для смены аккорда */
.chord-swap-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.chord-swap-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.6, 1);
}

.chord-swap-enter-from {
  opacity: 0;
  transform: scale(0.85) translateY(8px);
}

.chord-swap-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

/* Responsive */
@media (max-width: 768px) {
  .chord-display {
    padding: 1rem;
  }

  .chord-root {
    font-size: 2.5rem;
  }

  .chord-suffix {
    font-size: 1.4rem;
  }
}

@media (max-width: 480px) {
  .chord-display {
    padding: 0.75rem;
  }

  .chord-root {
    font-size: 2rem;
  }

  .chord-suffix {
    font-size: 1.2rem;
  }
}
</style>
