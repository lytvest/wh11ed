// Auto-fit for the printable mission cards: measures a card's content against the fixed
// card box and picks the largest font scale (`--card-scale`) that fits without overflowing.
// Ported from the standalone card project (src/useFitText.js) — the cards are a fixed 2:3 box
// and the text must always fill it, never spill out of it.
//
// A binary search keeps it cheap (~10 measurements) even with 40+ cards on the page.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const MIN_SCALE = 0.5
const MAX_SCALE = 1.35

export function useFitText(deps = []) {
  const cardRef = ref(null)
  const bodyRef = ref(null)
  let observer = null
  let cancelled = false

  // `body` is a fixed-size box (the card's inner area); `content` sizes to its natural
  // height, so comparing the two tells us whether the current scale fits. Reading
  // `content.offsetHeight` forces a sync layout, so the measurement reflects the tree with
  // the just-applied scale rather than a stale one.
  const overflow = (value) => {
    const card = cardRef.value
    const body = bodyRef.value
    const content = body?.firstElementChild
    if (!card || !body || !content) return 0
    card.style.setProperty('--card-scale', String(value))
    void content.offsetHeight
    const style = getComputedStyle(body)
    const availableHeight = body.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
    const availableWidth = body.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    return Math.max(content.scrollHeight - availableHeight, content.scrollWidth - availableWidth)
  }

  const measure = () => {
    if (cancelled) return
    const card = cardRef.value
    const body = bodyRef.value
    if (!card || !body || !body.firstElementChild) return

    if (overflow(MIN_SCALE) > 0) {
      card.style.setProperty('--card-scale', String(MIN_SCALE))
      return
    }
    let lo = MIN_SCALE
    let hi = MAX_SCALE
    for (let i = 0; i < 10; i += 1) {
      const mid = (lo + hi) / 2
      if (overflow(mid) <= 0) lo = mid
      else hi = mid
    }
    // Settle on the exact 3-decimal CSS value. toFixed() rounds, which can push a fitting
    // scale over the overflow line (e.g. 0.7466 → 0.747).
    let chosen = Math.floor(lo * 1000) / 1000
    while (chosen > MIN_SCALE && overflow(chosen) > 0) {
      chosen = Math.floor((chosen - 0.001) * 1000) / 1000
    }
    if (overflow(chosen) > 0) chosen = MIN_SCALE
    card.style.setProperty('--card-scale', chosen.toFixed(3))
  }

  onMounted(() => {
    measure()
    if (typeof ResizeObserver !== 'undefined' && cardRef.value) {
      observer = new ResizeObserver(measure)
      observer.observe(cardRef.value)
    }
    if (document.fonts?.ready) document.fonts.ready.then(measure)
  })

  onBeforeUnmount(() => {
    cancelled = true
    observer?.disconnect()
  })

  // Re-measure when the card's identity changes (a different mission, side or deck) — the
  // component is reused across the list, so onMounted alone would leave a stale scale.
  watch(deps, () => {
    cancelled = false
    measure()
  })

  return { cardRef, bodyRef }
}
