// Printable mission-card gallery (/missions-print) — the deck artwork and the few labels the
// card faces need, ported from the standalone card project. The mission TEXT itself comes from
// src/data/missions.js unchanged (getMissions + dedupeSecondaries); nothing here re-declares it.
//
// The card art is the deck background only: `mission.image` (the transcribed card scan) is not
// used by the printed cards, exactly as in the source project.

// One background per Force Disposition (primary decks) and per secondary deck.
export const PRIMARY_DECK_IMAGES = {
  'take-and-hold': '/images/missions/Take_and_Hold.webp',
  'purge-the-foe': '/images/missions/Purge_the_Foe.webp',
  reconnaissance: '/images/missions/Reconnaissance.webp',
  'priority-assets': '/images/missions/Priority_Assets.webp',
  disruption: '/images/missions/Disruption.webp',
}

export const SECONDARY_DECK_IMAGES = {
  tactical: '/images/missions/tactical.webp',
  fixed: '/images/missions/fixed.webp',
}

// Russian names of the five Force Dispositions, for the primary card's back. Mission and
// disposition names stay English on the page (project convention — see src/data/CLAUDE.md);
// this is the printed card's own translation, as in the source project.
export const DISPOSITION_BY_SLUG = {
  'take-and-hold': 'Захватить и удержать',
  'purge-the-foe': 'Истребить врага',
  reconnaissance: 'Разведка',
  'priority-assets': 'Приоритетные активы',
  disruption: 'Дезорганизация',
}

export const DISPOSITION_BY_NAME = {
  'Take and Hold': 'Захватить и удержать',
  'Purge the Foe': 'Истребить врага',
  Reconnaissance: 'Разведка',
  'Priority Assets': 'Приоритетные активы',
  Disruption: 'Дезорганизация',
}

// Accepts either a deck id ('take-and-hold') or the English disposition name ('Take and Hold').
export function dispositionRu(deckOrName) {
  return DISPOSITION_BY_SLUG[deckOrName] || DISPOSITION_BY_NAME[deckOrName] || deckOrName
}

// The secondary card back is a stamp: the deck's Russian name, split over two lines.
export const SIDE_DECK_LABEL = {
  tactical: 'Тактическая миссия',
  fixed: 'Фиксированная миссия',
}

// A secondary mission's blocks carry a `kind` ('tactical' | 'fixed'); the same mission can
// appear in both decks. Expand one entry into one card per deck it belongs to, each carrying
// only that deck's blocks. A mission with no `kind` at all falls back to the tactical deck.
export function expandSecondaries(list) {
  const out = []
  for (const m of list) {
    const kinds = [...new Set((m.blocks || []).map(b => b.kind).filter(Boolean))]
    const decks = kinds.length ? kinds : ['tactical']
    for (const deck of decks) {
      out.push({
        ...m,
        sideDeck: deck,
        blocks: kinds.length ? m.blocks.filter(b => b.kind === deck) : m.blocks,
      })
    }
  }
  return out
}
