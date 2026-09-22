// Build a printable PDF of mission-card faces. Two layouts, both A4:
//
//   `full`  — one card per page, fitted as large as the sheet allows (2:3, centred).
//             Front then back, so duplex printing yields one physical card per sheet.
//   `sheet` — 2.5" wide cards, several per page, with margins and crop marks. Fronts of a
//             group occupy a page; their backs occupy the NEXT page, column-mirrored so a
//             long-edge duplex print (the portrait default) lines each back up with its front.
import { PDFDocument, PageSizes, rgb } from 'pdf-lib'

export const PT = 72
export const A4 = { width: PageSizes.A4[0], height: PageSizes.A4[1] }
export const CARD_WIDTH_IN = 2.5
export const CARD_RATIO = 2 / 3
export const CARD_HEIGHT_IN = CARD_WIDTH_IN / CARD_RATIO
export const CARD_PT = { width: CARD_WIDTH_IN * PT, height: CARD_HEIGHT_IN * PT }

const SHEET_MARGIN_MIN = 0.5 * PT
const SHEET_GAP = 0.35 * PT
const FULL_MARGIN = 10
const CROP_MARK = 8
const CROP_GAP = 2.5
const CROP_WEIGHT = 0.4
const CROP_COLOR = rgb(0.25, 0.25, 0.25)

// Centre a 2×N grid of `cardW`×`cardH` on the page, packing as many as will fit inside
// `marginMin` on every side. Slots are PDF-space (origin bottom-left), filled left-to-right,
// top-to-bottom — the order the cards themselves walk.
export function gridLayout({
  pageW = A4.width,
  pageH = A4.height,
  cardW = CARD_PT.width,
  cardH = CARD_PT.height,
  marginMin = SHEET_MARGIN_MIN,
  gap = SHEET_GAP,
} = {}) {
  const innerW = pageW - 2 * marginMin
  const innerH = pageH - 2 * marginMin
  const cols = Math.max(1, Math.floor((innerW + gap) / (cardW + gap)))
  const rows = Math.max(1, Math.floor((innerH + gap) / (cardH + gap)))
  const gridW = cols * cardW + (cols - 1) * gap
  const gridH = rows * cardH + (rows - 1) * gap
  const originX = (pageW - gridW) / 2
  const originY = (pageH - gridH) / 2
  const slots = []
  for (let r = 0; r < rows; r++) {
    const rowFromBottom = rows - 1 - r
    for (let c = 0; c < cols; c++) {
      slots.push({
        x: originX + c * (cardW + gap),
        y: originY + rowFromBottom * (cardH + gap),
        col: c,
        row: r,
      })
    }
  }
  return { cols, rows, perPage: cols * rows, slots, cardW, cardH, pageW, pageH }
}

// Long-edge duplex on a portrait sheet flips left↔right and keeps the top. Mirror each slot
// in x so the back of the card that was on the left lands on the right of the next page —
// after the flip, it sits behind the same physical card.
export function duplexBackSlots(slots, pageW, cardW) {
  return slots.map((s) => ({
    ...s,
    x: pageW - s.x - cardW,
  }))
}

export function sheetPageCount(n, perPage) {
  if (n <= 0) return 0
  return 2 * Math.ceil(n / perPage)
}

export function fittedCardRect(pageW, pageH, ratioW, ratioH, margin) {
  const availW = pageW - 2 * margin
  const availH = pageH - 2 * margin
  const scale = Math.min(availW / ratioW, availH / ratioH)
  const w = ratioW * scale
  const h = ratioH * scale
  return {
    x: (pageW - w) / 2,
    y: (pageH - h) / 2,
    w,
    h,
  }
}

function drawCropMarks(page, x, y, w, h) {
  const mark = CROP_MARK
  const g = CROP_GAP
  const line = (start, end) => {
    page.drawLine({ start, end, thickness: CROP_WEIGHT, color: CROP_COLOR })
  }
  line({ x: x - g - mark, y }, { x: x - g, y })
  line({ x, y: y - g - mark }, { x, y: y - g })
  line({ x: x + w + g, y }, { x: x + w + g + mark, y })
  line({ x: x + w, y: y - g - mark }, { x: x + w, y: y - g })
  line({ x: x - g - mark, y: y + h }, { x: x - g, y: y + h })
  line({ x, y: y + h + g }, { x, y: y + h + g + mark })
  line({ x: x + w + g, y: y + h }, { x: x + w + g + mark, y: y + h })
  line({ x: x + w, y: y + h + g }, { x: x + w, y: y + h + g + mark })
}

async function embedAll(pdf, faces) {
  const out = []
  for (const face of faces) {
    out.push({
      front: face.front ? await pdf.embedJpg(face.front) : null,
      back: face.back ? await pdf.embedJpg(face.back) : null,
    })
  }
  return out
}

function drawFace(page, image, x, y, w, h, marks) {
  if (!image) return
  page.drawImage(image, { x, y, width: w, height: h })
  if (marks) drawCropMarks(page, x, y, w, h)
}

async function buildFull(pdf, images) {
  const [pageW, pageH] = PageSizes.A4
  const rect = fittedCardRect(pageW, pageH, 2, 3, FULL_MARGIN)
  for (const img of images) {
    const frontPage = pdf.addPage(PageSizes.A4)
    drawFace(frontPage, img.front, rect.x, rect.y, rect.w, rect.h, false)
    const backPage = pdf.addPage(PageSizes.A4)
    drawFace(backPage, img.back, rect.x, rect.y, rect.w, rect.h, false)
  }
}

async function buildSheet(pdf, images) {
  const layout = gridLayout()
  const backs = duplexBackSlots(layout.slots, layout.pageW, layout.cardW)
  const { perPage, slots, cardW, cardH } = layout
  for (let i = 0; i < images.length; i += perPage) {
    const group = images.slice(i, i + perPage)
    const frontPage = pdf.addPage(PageSizes.A4)
    group.forEach((img, k) => {
      const s = slots[k]
      drawFace(frontPage, img.front, s.x, s.y, cardW, cardH, true)
    })
    const backPage = pdf.addPage(PageSizes.A4)
    group.forEach((img, k) => {
      const s = backs[k]
      drawFace(backPage, img.back, s.x, s.y, cardW, cardH, true)
    })
  }
}

// `faces` is [{ front: Uint8Array jpeg, back: Uint8Array jpeg }, ...]. `mode` is `full` | `sheet`.
export async function buildMissionCardsPdf(faces, mode = 'full') {
  const pdf = await PDFDocument.create()
  pdf.setTitle(mode === 'sheet' ? 'Mission Cards (print sheet)' : 'Mission Cards')
  pdf.setCreator('WH Rules')
  const images = await embedAll(pdf, faces)
  if (mode === 'sheet') await buildSheet(pdf, images)
  else await buildFull(pdf, images)
  return pdf.save()
}
