import { nextTick, ref } from 'vue'
import { nextFrame } from './missionCardRaster.js'

// Orchestrates the bulk PDF export: rasterize every on-screen card pair, then pack the
// bitmaps. The modal's percent is this composable's `percent`; closing the modal bumps
// `gen` so a job that is still running stops before it downloads anything.

export function useMissionCardsPdf() {
  const open = ref(false)
  const percent = ref(0)
  const packing = ref(false)
  const error = ref(false)
  let gen = 0

  function cancel() {
    gen += 1
    packing.value = false
    open.value = false
    error.value = false
  }

  function savePdf(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportPdf(tiles, mode, filename) {
    const my = ++gen
    open.value = true
    packing.value = true
    percent.value = 0
    error.value = false
    try {
      await nextTick()
      await nextFrame()
      if (my !== gen) return
      const faces = []
      const n = tiles.length
      for (let i = 0; i < n; i++) {
        if (my !== gen) return
        faces.push(await tiles[i].captureFaces())
        percent.value = n ? Math.round(((i + 1) / n) * 90) : 90
        await nextFrame()
      }
      if (my !== gen) return
      const { buildMissionCardsPdf } = await import('../utils/missionCardPdf.js')
      percent.value = 94
      const bytes = await buildMissionCardsPdf(faces, mode)
      if (my !== gen) return
      percent.value = 100
      savePdf(bytes, filename)
      await new Promise((r) => setTimeout(r, 250))
      if (my !== gen) return
      open.value = false
    } catch {
      if (my !== gen) return
      error.value = true
    } finally {
      if (my === gen) packing.value = false
    }
  }

  return { open, percent, packing, error, cancel, exportPdf }
}
