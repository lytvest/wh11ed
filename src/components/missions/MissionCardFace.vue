<template>
  <article
    ref="cardRef"
    :class="cardClass"
    :style="bgImage ? { '--card-bg-image': `url(${bgImage})` } : undefined"
  >
    <div
      v-if="bgImage"
      class="card-bg"
      aria-hidden="true"
    />
    <div
      v-if="mission.type === 'secondary' && bgImage"
      class="card-scrim"
      aria-hidden="true"
    />

    <div
      v-if="side === 'back'"
      ref="bodyRef"
      class="card-back"
      :class="{ 'card-back--stamp': mission.type === 'secondary' }"
    >
      <template v-if="mission.type === 'secondary'">
        <div class="card-back-stamp">
          <span>{{ stampFirst }}</span>
          <span>{{ stampRest }}</span>
        </div>
      </template>
      <div
        v-else
        class="card-back-content"
      >
        <div class="card-back-matchup">
          <div class="card-back-type">
            {{ dispositionRu(mission.deck) }}
          </div>
          <div class="card-back-vs">
            {{ labels.missionCardsAgainst }}
          </div>
          <div class="card-back-type">
            {{ dispositionRu(mission.opponent) }}
          </div>
        </div>
        <div class="card-back-name">
          <h3>{{ mission.nameRu || mission.name }}</h3>
          <div
            v-if="mission.nameRu"
            class="card-back-name-en"
          >
            {{ mission.name }}
          </div>
        </div>
        <p
          v-if="mission.lore"
          class="card-back-lore"
        >
          {{ mission.lore }}
        </p>
      </div>
    </div>

    <div
      v-else
      ref="bodyRef"
      class="card-body"
    >
      <div class="card-content">
        <header class="card-head">
          <div
            class="header-icon"
            aria-hidden="true"
          />
          <div class="header-text">
            <h3 class="card-name">
              {{ mission.nameRu || mission.name }}
            </h3>
            <div
              v-if="mission.nameRu"
              class="card-name-en"
            >
              {{ mission.name }}
            </div>
          </div>
        </header>

        <div
          v-if="mission.briefing && mission.briefing.length"
          class="briefing"
        >
          <template
            v-for="(part, i) in mission.briefing"
            :key="i"
          >
            <div
              v-if="part.action"
              class="briefing-action"
            >
              <div class="briefing-action-title">
                {{ part.action }}
              </div>
              <ul class="briefing-action-rows">
                <li
                  v-for="(r, ri) in part.rows || []"
                  :key="ri"
                >
                  <span class="briefing-action-label">{{ r.label }}</span>
                  <span>{{ r.text }}</span>
                </li>
              </ul>
            </div>
            <p
              v-else
              class="briefing-part"
            >
              <span
                v-if="part.label"
                class="briefing-label"
              >{{ part.label }}</span>
              <span>{{ part.text }}</span>
            </p>
          </template>
        </div>

        <div class="card-blocks">
          <section
            v-for="(block, i) in mission.blocks"
            :key="i"
            class="block"
          >
            <header class="block-head">
              <span
                v-if="block.kind && !mission.sideDeck"
                class="block-kind"
                :class="`block-kind--${block.kind}`"
              >
                {{ block.kind === 'fixed' ? 'фикс.' : 'такт.' }}
              </span>
              <span class="block-heading">{{ block.heading }}</span>
            </header>
            <div
              v-if="block.when"
              class="block-when"
            >
              {{ block.when }}
            </div>
            <ul class="block-rows">
              <li
                v-for="(row, ri) in block.rows"
                :key="ri"
                class="row"
                :class="row.modifier ? `row--${row.modifier}` : undefined"
              >
                <span class="row-text">{{ row.text }}</span>
                <span
                  v-if="row.vp != null || row.modifier"
                  class="row-vp"
                >
                  <template v-if="row.vp != null">{{ vpLabel(row.vp) }}</template>
                  <span
                    v-if="row.modifier === 'or'"
                    class="row-vp-sub"
                  >{{ labels.missionCardsOr }}</span>
                  <span
                    v-if="row.modifier === 'cumulative'"
                    class="row-vp-sub"
                  >{{ labels.missionCardsCumulative }}</span>
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
// One face of a printable mission card (front or back). The card box is a fixed 2:3 with all
// sizes derived from `--card-scale`, which useFitText writes onto the root element — so the
// refs are exposed to the parent tile, which owns the fit/export logic.
import { computed, toRef } from 'vue'
import { ui } from '../../i18n/ui.js'
import { useLocale } from '../../composables/useLocale.js'
import { useFitText } from '../../composables/useFitText.js'
import {
  PRIMARY_DECK_IMAGES,
  SECONDARY_DECK_IMAGES,
  SIDE_DECK_LABEL,
  dispositionRu,
} from '../../data/missionCards.js'

const props = defineProps({
  mission: { type: Object, required: true },
  side: { type: String, default: 'front' },
})

const { locale } = useLocale()
const labels = computed(() => ui[locale.value])

const role = computed(() => props.mission.role || (props.mission.roles && props.mission.roles[0]))

const { cardRef, bodyRef } = useFitText([
  toRef(props, 'mission'),
  toRef(props, 'side'),
])

defineExpose({ cardRef, bodyRef })

const bgImage = computed(() =>
  props.mission.type === 'primary'
    ? PRIMARY_DECK_IMAGES[props.mission.deck]
    : SECONDARY_DECK_IMAGES[props.mission.sideDeck],
)

const cardClass = computed(() => {
  const m = props.mission
  const isSecondary = m.type === 'secondary'
  const deck = m.sideDeck ? ` card--deck-${m.sideDeck}` : ''
  const roleCls = isSecondary ? ` card--${role.value || 'attacker'}` : ''
  const primaryDeck = !isSecondary && m.deck ? ` card--primary-${m.deck}` : ''
  return `card card--${m.type}${primaryDeck}${roleCls}${deck} card--${props.side}`
})

const stamp = computed(() => {
  const label = SIDE_DECK_LABEL[props.mission.sideDeck] || SIDE_DECK_LABEL.tactical
  const [first, ...rest] = label.split(' ')
  return { first, rest: rest.join(' ') }
})
const stampFirst = computed(() => stamp.value.first)
const stampRest = computed(() => stamp.value.rest)

function vpLabel(vp) {
  if (vp == null) return null
  if (typeof vp === 'string') return vp.replace('+', '') + ' VP'
  return vp + ' VP'
}
</script>

<style scoped>
/* Ported from the standalone card project's styles.css, with the app's square-corner rule
   applied (border-radius removed — see `npm run radii`) and the app's tokens where they
   already match. Everything is sized from --card-scale, which useFitText sets per card. */
.card {
  --card-pad: calc(16px * var(--card-scale));
  --card-gap: calc(10px * var(--card-scale));
  /* The standalone card project's palette, scoped to the card so it never leaks into the app
     (which has no --card-* tokens of its own). */
  --card-blue: #4a90d9;
  --card-navy: #1a3a5c;
  --card-burgundy: #8b2a2a;
  --card-gold: #9e7624;
  --card-accent: var(--card-blue);
  --card-accent-dark: var(--card-navy);
  --card-accent-light: #87ceeb;
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25), 0 5px 15px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  color: #333;
  font-family: 'Roboto Condensed', 'Inter', 'Segoe UI', system-ui, sans-serif;
}

/* The full-bleed layers (art, scrim, the ::after tints) reach the card's outer edge. The card
   has no border — a 1px frame here is magnified to a visible line in the 1024px PNG export, so
   the art is what meets the rounded clip instead. */
.card-bg {
  position: absolute;
  inset: 0;
  background-image: var(--card-bg-image);
  background-size: cover;
  background-position: center;
  pointer-events: none;
  z-index: 0;
}

.card--primary.card--back .card-bg,
.card--secondary.card--back .card-bg,
.card--primary.card--front .card-bg {
  opacity: 1;
}

/* Secondary decks reuse the deck art. The back gets a dark scrim with light text; the front
   gets a near-opaque scrim so the art is only faintly visible. */
.card-scrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.card--secondary.card--back .card-scrim {
  background: linear-gradient(180deg, rgba(10, 18, 28, 0.78), rgba(6, 12, 20, 0.88));
}
.card--secondary.card--front .card-scrim {
  background: rgba(255, 255, 255, 0.82);
}

.card-head,
.card-body,
.card-back {
  position: relative;
  z-index: 1;
}

.card-body {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
  padding: 0;
  min-width: 0;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  min-width: 0;
}

.card-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: calc(12px * var(--card-scale));
  padding: calc(16px * var(--card-scale)) calc(16px * var(--card-scale)) calc(16px * var(--card-scale)) calc(20px * var(--card-scale));
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 248, 255, 0.7) 100%);
  border-bottom: calc(3px * var(--card-scale)) solid var(--card-accent);
  position: relative;
  min-width: 0;
}
.card-head::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: calc(6px * var(--card-scale));
  background: linear-gradient(180deg, var(--card-accent-light), var(--card-accent-dark));
}
.header-icon {
  width: calc(36px * var(--card-scale));
  height: calc(36px * var(--card-scale));
  flex-shrink: 0;
  background-color: var(--card-accent);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z'/%3E%3C/svg%3E") center / contain no-repeat;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.15));
}
.header-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.card--primary.card--front {
  background: #ffffff;
}
.card--primary.card--front::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.95) 100%);
  z-index: 0;
  pointer-events: none;
}
.card--secondary.card--front {
  background: linear-gradient(180deg, #f7fbff 0%, #ffffff 100%);
}
.card--deck-tactical.card--front {
  --card-accent: #1f6d85;
  --card-accent-dark: #0f3d4c;
  --card-accent-light: #7ec4d6;
}
.card--deck-fixed.card--front {
  --card-accent: #6b3fb8;
  --card-accent-dark: #3d2470;
  --card-accent-light: #c4a6f0;
}
.card--secondary.card--attacker {
  --card-accent: #b23a30;
  --card-accent-dark: #7a1f1a;
  --card-accent-light: #e08a84;
}
.card--secondary.card--defender {
  --card-accent: #3f7d4a;
  --card-accent-dark: #2a5a32;
  --card-accent-light: #8ec496;
}

.card-name {
  margin: 0 0 calc(2px * var(--card-scale));
  font-size: calc(22px * var(--card-scale));
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #1a1a1a;
  display: block;
  overflow-wrap: anywhere;
}
.card-name-en {
  color: #777;
  font-size: calc(13px * var(--card-scale));
  font-weight: 400;
  font-style: italic;
  letter-spacing: 0.5px;
  line-height: 1.2;
  text-transform: uppercase;
  display: block;
  overflow-wrap: anywhere;
}

.card--back {
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(255, 255, 255, 0.7) 0%, transparent 55%),
    #f3f5f8;
}
.card--primary.card--back::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(15, 20, 29, 0.72);
  z-index: 0;
  pointer-events: none;
}
.card--primary.card--back .card-back-content {
  background: transparent;
  padding: 0;
  border: none;
  box-shadow: none;
}
.card--primary.card--back .card-back-type {
  color: #79b8f2;
}
.card--primary.card--back .card-back-vs {
  color: #9ba7b9;
}
.card--primary.card--back .card-back-name h3 {
  color: #ffffff;
}
.card--primary.card--back .card-back-name-en {
  color: #c0cad7;
}
.card--primary.card--back .card-back-lore {
  color: #d2dbe5;
}

.card-back {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 5px;
  min-width: 0;
  text-align: center;
}
.card-back-matchup {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}
.card-back-content { display: flex; flex-direction: column; gap: calc(12px * var(--card-scale)); width: 100%; margin: auto 0; }
.card-back-type {
  font-size: calc(15px * var(--card-scale));
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1.2;
  color: #2f6da8;
  overflow-wrap: anywhere;
}
.card-back-vs {
  font-size: calc(11px * var(--card-scale));
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #5c6779;
}
.card-back-name {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: calc(8px * var(--card-scale)) 0;
}
.card-back-name h3 {
  margin: 0;
  font-size: calc(26px * var(--card-scale));
  font-weight: 800;
  line-height: 1.15;
  overflow-wrap: anywhere;
}
.card-back-name-en {
  color: #5c6779;
  font-size: calc(13px * var(--card-scale));
  font-weight: 600;
}
.card-back-lore {
  margin: 0;
  color: #5c6779;
  font-style: italic;
  font-size: calc(13px * var(--card-scale));
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.card-back--stamp {
  justify-content: center;
  align-items: center;
  padding: 24px;
  overflow: hidden;
}
.card-back-stamp {
  display: flex;
  flex-direction: column;
  gap: calc(4px * var(--card-scale));
  font-size: calc(42px * var(--card-scale));
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  text-align: center;
}
.card-back-stamp span {
  display: block;
  white-space: nowrap;
  overflow-wrap: normal;
  word-break: keep-all;
  hyphens: none;
}
.card--deck-tactical.card--back .card-back-stamp { color: #bfe9f5; }
.card--deck-fixed.card--back .card-back-stamp { color: #d9c9f5; }
.card--deck-tactical.card--front .card-back-stamp { color: #1f6d85; }
.card--deck-fixed.card--front .card-back-stamp { color: #6b3fb8; }

.briefing,
.block {
  border: 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(2px);
  padding: calc(12px * var(--card-scale)) calc(16px * var(--card-scale));
  min-width: 0;
}
.briefing {
  display: flex;
  flex-direction: column;
  gap: calc(10px * var(--card-scale));
  flex-shrink: 0;
}
.briefing:last-child {
  border-bottom: none;
}
.briefing-part {
  margin: 0;
  font-size: calc(15px * var(--card-scale));
  line-height: 1.5;
  color: #2c2c2c;
  display: flex;
  flex-direction: column;
  gap: calc(6px * var(--card-scale));
}
.briefing-label {
  font-size: calc(18px * var(--card-scale));
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--card-navy);
  font-weight: 700;
}
.briefing-action { border-top: 1px dashed rgba(0, 0, 0, 0.1); padding-top: calc(10px * var(--card-scale)); }
.briefing-action:first-child { border-top: 0; padding-top: 0; }
.briefing-action-title {
  font-weight: 700;
  color: var(--card-navy);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: calc(18px * var(--card-scale));
  margin-bottom: calc(8px * var(--card-scale));
}
.briefing-action-rows { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: calc(6px * var(--card-scale)); }
.briefing-action-rows li { display: flex; gap: calc(8px * var(--card-scale)); min-width: 0; font-size: calc(15px * var(--card-scale)); line-height: 1.5; color: #2c2c2c; }
.briefing-action-rows li > span:last-child { min-width: 0; overflow-wrap: anywhere; }
.briefing-action-label { color: var(--card-burgundy); font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; width: 34%; min-width: 0; flex-shrink: 0; overflow-wrap: anywhere; font-size: calc(13px * var(--card-scale)); }

.card-blocks { display: flex; flex-direction: column; gap: 0; min-width: 0; }

.block:last-child { border-bottom: none; }
.block-head { display: flex; align-items: center; gap: calc(6px * var(--card-scale)); flex-wrap: wrap; min-width: 0; margin-bottom: calc(6px * var(--card-scale)); }
.block-heading { min-width: 0; font-weight: 700; font-size: calc(18px * var(--card-scale)); color: var(--card-navy); text-transform: uppercase; letter-spacing: 0.5px; overflow-wrap: anywhere; }
.block-kind {
  font-size: calc(10px * var(--card-scale));
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: calc(2px * var(--card-scale)) calc(6px * var(--card-scale));
  border-radius: 4px;
  font-weight: 700;
  white-space: nowrap;
}
.block-kind--fixed { background: #ece1fb; color: #6b3fb8; }
.block-kind--tactical { background: #dcf0f7; color: #1f6d85; }
.block-when {
  color: var(--card-burgundy);
  font-size: calc(13px * var(--card-scale));
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin: 0 0 calc(8px * var(--card-scale));
}

.block-rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: calc(10px * var(--card-scale));
  min-width: 0;
  margin-bottom: calc(10px * var(--card-scale));
  padding-bottom: calc(8px * var(--card-scale));
  border-bottom: 1px dashed rgba(0, 0, 0, 0.1);
}
.row:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}
.row-text { flex: 1; min-width: 0; font-size: calc(15px * var(--card-scale)); line-height: 1.5; color: #2c2c2c; overflow-wrap: anywhere; }
.row-vp {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-weight: 700;
  color: var(--card-gold);
  font-variant-numeric: tabular-nums;
  font-size: calc(16px * var(--card-scale));
  white-space: nowrap;
  margin-left: calc(10px * var(--card-scale));
  line-height: 1.2;
}
.row-vp-sub {
  display: block;
  font-size: calc(10px * var(--card-scale));
  color: #777;
  font-weight: 400;
  text-align: right;
  margin-top: calc(-2px * var(--card-scale));
}
</style>
