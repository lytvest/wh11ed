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
// download button and the card must share a component boundary. The bulk PDF path reuses the
// same capture through `captureFaces`.
import { computed, reactive } from 'vue'
import MissionCardFace from './MissionCardFace.vue'
import { rasterizeCardPng, rasterizeCardJpeg, waitForExportLayout } from '../../composables/missionCardRaster.js'
import { ui } from '../../i18n/ui.js'
import { useLocale } from '../../composables/useLocale.js'

const props = defineProps({
  mission: { type: Object, required: true },
})

const { locale } = useLocale()
const labels = computed(() => ui[locale.value])

const faceRefs = reactive({ front: null, back: null })
const busy = reactive({ front: false, back: false })

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function faceNode(side) {
  return faceRefs[side]?.cardRef
}

async function download(side) {
  const node = faceNode(side)
  if (!node || busy[side]) return
  busy[side] = true
  try {
    await waitForExportLayout()
    const dataUrl = await rasterizeCardPng(node)
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

// JPEG bytes of both faces, for the bulk PDF. Same capture path as the PNG button.
async function captureFaces() {
  const front = faceNode('front')
  const back = faceNode('back')
  if (!front || !back) throw new Error('card faces are not mounted')
  await waitForExportLayout()
  return {
    front: await rasterizeCardJpeg(front),
    back: await rasterizeCardJpeg(back),
  }
}

defineExpose({ captureFaces })
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
  border-radius: 10px;
  background: var(--bg-card);
  color: var(--text-primary);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--motion-fast), border-color var(--motion-fast), color var(--motion-fast);
}
.download-btn:hover { background: var(--bg-row-hover); border-color: var(--accent-text); color: var(--accent-text); }
.download-btn:disabled { opacity: 0.6; cursor: default; }

@media (max-width: 820px) {
  .card-pair { grid-template-columns: 1fr; }
}
</style>
