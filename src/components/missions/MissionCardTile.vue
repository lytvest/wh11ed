<template>
  <div class="grid-item">
    <div class="card-pair">
      <div
        v-for="side in ['front', 'back']"
        :key="side"
        class="grid-face"
      >
        <div class="card-face-label">
          {{ side === 'front' ? labels.missionCardsFace : labels.missionCardsBack }}
        </div>
        <MissionCardFace
          :ref="(el) => (faceRefs[side] = el)"
          :mission="mission"
          :side="side"
        />
        <button
          type="button"
          class="download-btn"
          :disabled="busy[side]"
          @click="download(side)"
        >
          {{ busy[side] ? labels.missionCardsDownloading : labels.missionCardsDownload }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// A mission card pair (front + back) with a PNG download per face. The card faces are rendered
// by MissionCardFace and their refs are read here — the export needs the live DOM node, so the
// download button and the card must share a component boundary.
import { computed, reactive } from 'vue'
import { domToPng } from 'modern-screenshot'
import MissionCardFace from './MissionCardFace.vue'
import { ui } from '../../i18n/ui.js'
import { useLocale } from '../../composables/useLocale.js'

const props = defineProps({
  mission: { type: Object, required: true },
})

const { locale } = useLocale()
const labels = computed(() => ui[locale.value])

const faceRefs = reactive({ front: null, back: null })
const busy = reactive({ front: false, back: false })

// 1024px wide is the source project's export size — enough for a crisp printed card.
const PNG_WIDTH = 1024

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

async function waitForExportLayout() {
  if (document.fonts?.ready) await document.fonts.ready
  await nextFrame()
  await nextFrame()
}

async function download(side) {
  const node = faceRefs[side]?.cardRef
  if (!node || busy[side]) return
  busy[side] = true
  try {
    await waitForExportLayout()
    const { width, height } = node.getBoundingClientRect()
    const dataUrl = await domToPng(node, {
      width,
      height,
      scale: PNG_WIDTH / width,
      backgroundColor: '#ffffff',
      style: {
        width: `${width}px`,
        height: `${height}px`,
      },
    })
    const role = props.mission.role || (props.mission.roles && props.mission.roles[0])
    const rolePart = role ? `-${role}` : ''
    const deck = props.mission.sideDeck ? `-${props.mission.sideDeck}` : ''
    const a = document.createElement('a')
    a.download = `${slugify(props.mission.name)}${rolePart}${deck}-${side}.png`
    a.href = dataUrl
    a.click()
  } finally {
    busy[side] = false
  }
}
</script>

<style scoped>
.grid-item { display: flex; flex-direction: column; gap: 10px; }

.card-pair {
  display: grid;
  grid-template-columns: minmax(0, var(--card-w)) minmax(0, var(--card-w));
  gap: 24px;
  justify-content: start;
}

.grid-face { display: flex; flex-direction: column; gap: 8px; }

.card-face-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--text-dim);
}

.download-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--motion-fast), border-color var(--motion-fast), color var(--motion-fast);
}
.download-btn:hover { background: var(--bg-row-hover); border-color: var(--accent); color: var(--accent); }
.download-btn:disabled { opacity: 0.6; cursor: default; }

@media (max-width: 820px) {
  .card-pair { grid-template-columns: 1fr; }
}
</style>
