// Rasterize a live mission-card DOM node the same way the per-face PNG download does.
// Shared so the gallery's "Download PNG" and the bulk PDF exporter cannot drift apart:
// same 1024px width, same rounded-corner clip (modern-screenshot does not honour
// border-radius on the root — see MissionCardTile).
import { domToPng } from 'modern-screenshot'

export const PNG_WIDTH = 1024
export const CARD_RADIUS = 8

export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

export async function waitForExportLayout() {
  if (document.fonts?.ready) await document.fonts.ready
  await nextFrame()
  await nextFrame()
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// modern-screenshot rasterizes into an SVG <foreignObject> and does NOT clip the root
// element's border-radius, so an exported card would come out with square corners (and, with a
// background color set, a white line along the edge left by the fractional box). The bitmap is
// therefore re-clipped here: draw the raw export onto a canvas through a rounded-rect path.
// Canvas roundRect() is Safari 16.4+, above the app's 16.2 floor, so the path is built with arcTo.
async function roundedCanvas(dataUrl, cssWidth, radius, { fill } = {}) {
  const img = await loadImage(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (fill) {
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  const r = radius * (img.width / cssWidth)
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.arcTo(img.width, 0, img.width, img.height, r)
  ctx.arcTo(img.width, img.height, 0, img.height, r)
  ctx.arcTo(0, img.height, 0, 0, r)
  ctx.arcTo(0, 0, img.width, 0, r)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(img, 0, 0)
  return canvas
}

async function captureRaw(node) {
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
  return { square, width, height }
}

export async function rasterizeCardPng(node) {
  const { square, width } = await captureRaw(node)
  const canvas = await roundedCanvas(square, width, CARD_RADIUS)
  return canvas.toDataURL('image/png')
}

function dataUrlToBytes(dataUrl) {
  const comma = dataUrl.indexOf(',')
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// JPEG for the PDF: rounded corners sit on white (the paper), and JPEG is a fraction of the PNG
// size — 90-odd faces as PNG would make a download nobody on a phone can keep.
export async function rasterizeCardJpeg(node, quality = 0.88) {
  const { square, width } = await captureRaw(node)
  const canvas = await roundedCanvas(square, width, CARD_RADIUS, { fill: '#ffffff' })
  return dataUrlToBytes(canvas.toDataURL('image/jpeg', quality))
}
