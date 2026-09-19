// Printable mission-card gallery (/missions-print) — the deck artwork and the few labels the
// card faces need, ported from the standalone card project. The mission TEXT itself comes from
// src/data/missions.js unchanged (getMissions + dedupeSecondaries); nothing here re-declares it.
//
// The card art is the deck background only: `mission.image` (the transcribed card scan) is not
// used by the printed cards, exactly as in the source project.

import { withBase } from '../config.js'

// One background per Force Disposition (primary decks) and per secondary deck. `withBase` keeps
// the URL inside the deployment's subpath (see src/config.js) — these are handed straight to a
// CSS `background-image`, which Vite never rewrites.
export const PRIMARY_DECK_IMAGES = {
  'take-and-hold': withBase('/images/missions/Take_and_Hold.webp'),
  'purge-the-foe': withBase('/images/missions/Purge_the_Foe.webp'),
  reconnaissance: withBase('/images/missions/Reconnaissance.webp'),
  'priority-assets': withBase('/images/missions/Priority_Assets.webp'),
  disruption: withBase('/images/missions/Disruption.webp'),
}

export const SECONDARY_DECK_IMAGES = {
  tactical: withBase('/images/missions/tactical.webp'),
  fixed: withBase('/images/missions/fixed.webp'),
}

// Russian names of the five Force Dispositions, for the printed card's own translation (RU only).
// Mission and disposition names stay English on the reference page (project convention — see
// src/data/CLAUDE.md); dispositionLabel() picks the right map for the active locale.
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

// The English display name of a Force Disposition. The deck id is already the English name in
// slug form ('take-and-hold'), but the card must print the title-case spelling ('Take and Hold'),
// so keep a map rather than re-slugging on the fly.
export const DISPOSITION_EN = {
  'take-and-hold': 'Take and Hold',
  'purge-the-foe': 'Purge the Foe',
  reconnaissance: 'Reconnaissance',
  'priority-assets': 'Priority Assets',
  disruption: 'Disruption',
}

// Locale-aware disposition label for the printed card faces. RU gets the source project's own
// translation; EN prints the English name — the gallery page is bilingual, and an English reader
// must not get Russian stamped on their cards. Callers pass either a deck slug ('disruption') or
// the English name ('Disruption'); both resolve to the English name unchanged in EN, while in RU
// DISPOSITION_BY_NAME is the name→Russian bridge.
export function dispositionLabel(deckOrName, locale) {
  if (locale === 'ru') return dispositionRu(deckOrName)
  return DISPOSITION_EN[deckOrName] || deckOrName
}

// The secondary card back is a stamp: the deck's name, split over two lines.
export const SIDE_DECK_LABEL = {
  tactical: 'Тактическая миссия',
  fixed: 'Фиксированная миссия',
}

export const SIDE_DECK_LABEL_EN = {
  tactical: 'Tactical Mission',
  fixed: 'Fixed Mission',
}

// Short deck tag printed beside a secondary block's heading ('такт.' / 'фикс.' in RU).
export const SIDE_DECK_TAG = {
  tactical: 'такт.',
  fixed: 'фикс.',
}

export const SIDE_DECK_TAG_EN = {
  tactical: 'tact.',
  fixed: 'fix.',
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
