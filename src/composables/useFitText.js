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
  let contentObserver = null
  let cancelled = false
  let measuring = false
  let lastScale = null

  // Resizing something inside a ResizeObserver callback is how you build an infinite loop:
  // measure() writes `--card-scale`, which changes the content's height, which fires the
  // content observer again. Both the lock and the last-scale memo keep it to one pass per
  // actual change.
  const scheduleMeasure = () => {
    if (measuring || cancelled) return
    measure()
  }

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
    if (cancelled || measuring) return
    const card = cardRef.value
    const body = bodyRef.value
    if (!card || !body || !body.firstElementChild) return

    measuring = true
    try {
      if (overflow(MIN_SCALE) > 0) {
        card.style.setProperty('--card-scale', String(MIN_SCALE))
        lastScale = MIN_SCALE
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
      if (chosen !== lastScale) {
        card.style.setProperty('--card-scale', chosen.toFixed(3))
        lastScale = chosen
      }
    } finally {
      measuring = false
    }
  }

  onMounted(() => {
    measure()
    if (typeof ResizeObserver !== 'undefined' && cardRef.value) {
      observer = new ResizeObserver(scheduleMeasure)
      observer.observe(cardRef.value)
      // The card's own box is fixed by `aspect-ratio`, so it never resizes when the TEXT does —
      // a locale swap or a late font makes the content taller without touching the box. Observe
      // the content element itself too, or the fit only ever runs on mount/font-ready and the
      // card can be left with a scale that overflows.
      const content = bodyRef.value?.firstElementChild
      if (content) {
        contentObserver = new ResizeObserver(scheduleMeasure)
        contentObserver.observe(content)
      }
    }
    if (document.fonts?.ready) document.fonts.ready.then(scheduleMeasure)
  })

  onBeforeUnmount(() => {
    cancelled = true
    observer?.disconnect()
    contentObserver?.disconnect()
  })

  // Re-measure when the card's identity changes (a different mission, side or deck) — the
  // component is reused across the list, so onMounted alone would leave a stale scale.
  // `flush: 'post'` is load-bearing: a locale toggle changes the card's TEXT (the display name
  // swaps to the other language's, which is a different length), and a pre-flush watcher would
  // measure the old DOM with the new scale and never correct it — the overflowing title the
  // reader saw. Post-flush measures the updated tree.
  watch(deps, () => {
    // A new identity means new text; force the scale to be written even if it lands on the
    // same number, so an inline style cleared elsewhere can't leave the card unscaled.
    lastScale = null
    measure()
  }, { flush: 'post' })

  return { cardRef, bodyRef }
}
