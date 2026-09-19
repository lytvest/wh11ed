<template>
  <div class="missions-print">
    <div class="view-hero">
      <h1>{{ labels.missionCardsHeading }}</h1>
      <p class="view-hero-desc">
        {{ labels.missionCardsDesc }}
      </p>
    </div>

    <div class="toolbar">
      <div class="tabs">
        <button
          v-for="t in TYPE_TABS"
          :key="t.id"
          type="button"
          class="tab"
          :class="{ 'is-active': type === t.id }"
          @click="selectType(t.id)"
        >
          {{ labels[t.label] }}
        </button>
      </div>

      <template v-if="type === 'primary'">
        <select
          v-model="deck"
          class="select"
        >
          <option value="all">
            {{ labels.missionCardsAllDispositions }}
          </option>
          <option
            v-for="d in decks"
            :key="d"
            :value="d"
          >
            {{ dispositionLabel(d, locale) }}
          </option>
        </select>
      </template>

      <template v-else>
        <div class="tabs">
          <button
            v-for="t in SIDE_DECK_TABS"
            :key="t.id"
            type="button"
            class="tab"
            :class="{ 'is-active': sideDeck === t.id }"
            @click="sideDeck = t.id"
          >
            {{ labels[t.label] }}
          </button>
        </div>
        <select
          v-model="role"
          class="select"
        >
          <option value="all">
            {{ labels.missionCardsBothRoles }}
          </option>
          <option value="attacker">
            {{ labels.missionCardsAttacker }}
          </option>
          <option value="defender">
            {{ labels.missionCardsDefender }}
          </option>
        </select>
      </template>

      <input
        v-model="query"
        class="search"
        type="search"
        :placeholder="labels.missionCardsSearch"
      >
    </div>

    <div class="count">
      {{ labels.missionCardsFound.replace('{n}', list.length) }}
    </div>

    <div class="grid">
      <MissionCardTile
        v-for="m in list"
        :key="cardKey(m)"
        :mission="m"
      />
    </div>

    <p
      v-if="list.length === 0"
      class="empty"
    >
      {{ labels.missionCardsEmpty }}
    </p>
  </div>
</template>

<script setup>
// Printable mission-card gallery — the card project's Missions page, ported to Vue. The
// mission text comes from src/data/missions.js (getMissions + dedupeSecondaries); the deck
// art and card labels from src/data/missionCards.js. The detail page of the source project
// is deliberately not ported: the gallery is the whole feature.
import { computed, ref } from 'vue'
import MissionCardTile from '../components/missions/MissionCardTile.vue'
import { getMissions, dedupeSecondaries } from '../data/missions.js'
import { expandSecondaries, dispositionLabel } from '../data/missionCards.js'
import { ui } from '../i18n/ui.js'
import { useLocale } from '../composables/useLocale.js'

const { locale } = useLocale()
const labels = computed(() => ui[locale.value])

const TYPE_TABS = [
  { id: 'primary', label: 'missionCardsPrimary' },
  { id: 'secondary', label: 'missionCardsSecondary' },
]
const SIDE_DECK_TABS = [
  { id: 'tactical', label: 'missionCardsTactical' },
  { id: 'fixed', label: 'missionCardsFixed' },
]

const type = ref('primary')
const deck = ref('all')
const role = ref('all')
const sideDeck = ref('tactical')
const query = ref('')

const data = computed(() => getMissions(locale.value))

const decks = computed(() => [...new Set(data.value.primary.map(m => m.deck))])

const list = computed(() => {
  const source = type.value === 'primary'
    ? data.value.primary
    : expandSecondaries(dedupeSecondaries(data.value.secondary))
  return source.filter((m) => {
    if (type.value === 'primary' && deck.value !== 'all' && m.deck !== deck.value) return false
    if (type.value === 'secondary' && role.value !== 'all' && !(m.roles || [m.role]).includes(role.value)) return false
    if (type.value === 'secondary' && m.sideDeck !== sideDeck.value) return false
    if (query.value) {
      const q = query.value.toLowerCase()
      const hay = `${m.name} ${m.nameRu || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
})

function selectType(id) {
  type.value = id
  deck.value = 'all'
  role.value = 'all'
  sideDeck.value = 'tactical'
}

function cardKey(m) {
  const r = (m.roles && m.roles[0]) || m.role
  return type.value === 'secondary' ? `${m.slug}|${r}|${m.sideDeck}` : m.slug
}
</script>

<style scoped>
/* --card-w drives the two-column card pair (MissionCardTile). On a phone the pair stacks
   (its own media query), so the variable is only meaningful above 820px. */
.missions-print {
  --card-w: 360px;
}

.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 16px;
}

.tabs {
  display: inline-flex;
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 3px;
}

.tab {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  padding: 8px 16px;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}
.tab.is-active { background: var(--bg-row-hover); color: var(--accent); }

.select,
.search {
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 9px 12px;
  font: inherit;
  min-width: 200px;
}
.select:focus,
.search:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.search { flex: 1; }

.count { color: var(--text-dim); font-size: 13px; margin-bottom: 14px; }

.grid {
  display: flex;
  flex-direction: column;
  gap: 32px;
  align-items: stretch;
}

.empty { color: var(--text-dim); padding: 40px 0; text-align: center; }
</style>
