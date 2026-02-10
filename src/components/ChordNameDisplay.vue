<template>
  <div class="chord-display">
    <transition name="chord-swap" mode="out-in">
      <!-- Chord mode -->
      <div v-if="detectionMode === 'chord' && chord" :key="chord?.displayName || 'chord'" class="chord-content">
        <div class="chord-name">
          <span class="chord-root">{{ chord?.rootName || '' }}</span>
          <span class="chord-suffix">{{ chordSuffix }}</span>
        </div>

        <div class="confidence-bar">
          <div class="confidence-fill" :style="{ width: confidencePercent + '%' }"></div>
        </div>

        <div v-if="candidates.length > 0" class="chord-alternatives">
          <span v-for="(alt, i) in candidates" :key="i" class="chord-alt">
            {{ alt.displayName }}
          </span>
        </div>
      </div>

      <!-- Single note mode -->
      <div v-else-if="detectionMode === 'single' && detectedNote?.note" :key="detectedNote.note + detectedNote.octave" class="chord-content">
        <div class="chord-name">
          <span class="chord-root">{{ detectedNote.note }}</span>
          <span class="chord-suffix note-octave">{{ detectedNote.octave }}</span>
        </div>

        <div class="confidence-bar">
          <div class="confidence-fill" :style="{ width: Math.round(pitchConfidence * 100) + '%' }"></div>
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
  detectedNote: {
    type: Object,
    default: () => ({ note: '', octave: 0, cents: 0 }),
  },
  pitchConfidence: {
    type: Number,
    default: 0,
  },
  detectionMode: {
    type: String,
    default: 'single',
  },
})

const chordSuffix = computed(() => {
  if (!props.chord) return ''
  return CHORD_DISPLAY_NAMES[props.chord.type] || ''
})

const confidencePercent = computed(() => {
  if (props.detectionMode === 'chord') {
    if (!props.chord) return 0
    return Math.round(Math.max(0, Math.min(1, props.chord.score)) * 100)
  }
  return Math.round(Math.max(0, Math.min(1, props.pitchConfidence)) * 100)
})
</script>

<style scoped>
.chord-display {
  position: fixed;
  top: 5rem;
  left: 1.5rem;
  z-index: 10;
  pointer-events: none;
}

.chord-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.chord-name {
  display: flex;
  align-items: baseline;
  gap: 0.1em;
}

.chord-root {
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, #c084fc, #f093fb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  filter: drop-shadow(0 2px 8px rgba(192, 132, 252, 0.5));
  animation: chordGlow 2s ease-in-out infinite;
}

@keyframes chordGlow {
  0%, 100% { filter: drop-shadow(0 2px 8px rgba(192, 132, 252, 0.5)); }
  50% { filter: drop-shadow(0 2px 16px rgba(192, 132, 252, 0.8)); }
}

.chord-suffix {
  font-size: 1.8rem;
  font-weight: 500;
  background: linear-gradient(135deg, #a855f7, #e879f9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  filter: drop-shadow(0 2px 8px rgba(168, 85, 247, 0.4));
}

.note-octave {
  font-size: 1.6rem;
  opacity: 0.7;
}

.confidence-bar {
  width: 100px;
  height: 3px;
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
  font-size: 0.8rem;
  color: rgba(192, 132, 252, 0.4);
  font-weight: 400;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

/* Transition для смены аккорда — bounce-in с glow */
.chord-swap-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.chord-swap-leave-active {
  transition: all 0.6s cubic-bezier(0.4, 0, 0.6, 1);
}

.chord-swap-enter-from {
  opacity: 0;
  transform: scale(0.7) translateY(12px);
  filter: drop-shadow(0 0 0 rgba(192, 132, 252, 0));
}

.chord-swap-enter-to {
  filter: drop-shadow(0 0 30px rgba(192, 132, 252, 0.8));
}

.chord-swap-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-6px);
  filter: drop-shadow(0 0 0 rgba(192, 132, 252, 0));
}

/* Responsive */
@media (max-width: 768px) {
  .chord-display {
    top: 4rem;
    left: 1rem;
  }

  .chord-root {
    font-size: 2.2rem;
  }

  .chord-suffix {
    font-size: 1.3rem;
  }

  .note-octave {
    font-size: 1.2rem;
  }
}
</style>
