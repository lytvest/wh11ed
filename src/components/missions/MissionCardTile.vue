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

// Must match `.card`'s border-radius in MissionCardFace.vue (also listed in check-radii.mjs).
const CARD_RADIUS = 8

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

// modern-screenshot rasterizes the node into an SVG <foreignObject> and does NOT clip the root
// element's border-radius, so an exported card would come out with square corners (and, with a
// background color set, a white line along the edge left by the fractional box). The PNG is
// therefore re-clipped here: draw the raw export onto a canvas through a rounded-rect path, which
// is what the on-screen card actually looks like. Canvas roundRect() is Safari 16.4+, above the
// app's 16.2 floor, so the path is built with arcTo instead.
function clipToRoundedCard(dataUrl, width, height, radius) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      // Scale the CSS-pixel radius up to the exported pixel size.
      const r = radius * (img.width / width)
      ctx.beginPath()
      ctx.moveTo(r, 0)
      ctx.arcTo(img.width, 0, img.width, img.height, r)
      ctx.arcTo(img.width, img.height, 0, img.height, r)
      ctx.arcTo(0, img.height, 0, 0, r)
      ctx.arcTo(0, 0, img.width, 0, r)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

async function download(side) {
  const node = faceRefs[side]?.cardRef
  if (!node || busy[side]) return
  busy[side] = true
  try {
    await waitForExportLayout()
    // Round to whole pixels so the clone and the canvas agree — a fractional box leaves a
    // sub-pixel sliver where the background bleeds through as a white edge line.
    const rect = node.getBoundingClientRect()
    const width = Math.round(rect.width)
    const height = Math.round(rect.height)
    const square = await domToPng(node, {
      width,
      height,
      scale: PNG_WIDTH / width,
      style: {
        width: `${width}px`,
        height: `${height}px`,
      },
    })
    const dataUrl = await clipToRoundedCard(square, width, height, CARD_RADIUS)
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
  border-radius: 10px;
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
