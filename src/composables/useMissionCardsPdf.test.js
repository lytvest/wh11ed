import { afterEach, describe, it, expect, vi } from 'vitest'

vi.mock('../utils/missionCardPdf.js', () => ({
  buildMissionCardsPdf: vi.fn(async (faces) => new Uint8Array([1, 2, 3, faces.length])),
}))

import { useMissionCardsPdf } from './useMissionCardsPdf.js'
import { buildMissionCardsPdf } from '../utils/missionCardPdf.js'

afterEach(() => {
  document.body.innerHTML = ''
})

function tiles(n) {
  return Array.from({ length: n }, (_, i) => ({
    captureFaces: vi.fn(async () => ({ front: new Uint8Array([i]), back: new Uint8Array([i]) })),
  }))
}

describe('useMissionCardsPdf', () => {
  it('opens the modal, reports progress, and downloads the PDF', async () => {
    const clicks = []
    URL.createObjectURL = vi.fn(() => 'blob:pdf')
    URL.revokeObjectURL = vi.fn()
    const origCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag !== 'a') return origCreate(tag)
      const a = { click: () => clicks.push(a), download: '', href: '' }
      return a
    })

    const pdf = useMissionCardsPdf()
    const job = pdf.exportPdf(tiles(3), 'full', 'mission-cards.pdf')
    expect(pdf.open.value).toBe(true)
    expect(pdf.packing.value).toBe(true)
    await job

    expect(pdf.percent.value).toBe(100)
    expect(pdf.open.value).toBe(false)
    expect(pdf.packing.value).toBe(false)
    expect(buildMissionCardsPdf).toHaveBeenCalledOnce()
    expect(buildMissionCardsPdf.mock.calls[0][1]).toBe('full')
    expect(clicks).toHaveLength(1)
    expect(clicks[0].download).toBe('mission-cards.pdf')
  })

  it('stops before packing if the modal is closed', async () => {
    let release
    const first = {
      captureFaces: vi.fn(() => new Promise((resolve) => { release = resolve })),
    }
    const rest = tiles(2)
    const pdf = useMissionCardsPdf()
    const job = pdf.exportPdf([first, ...rest], 'sheet', 'x.pdf')
    await vi.waitFor(() => expect(first.captureFaces).toHaveBeenCalled())
    pdf.cancel()
    release({ front: new Uint8Array([0]), back: new Uint8Array([0]) })
    await job
    expect(pdf.open.value).toBe(false)
    expect(buildMissionCardsPdf).not.toHaveBeenCalled()
    expect(rest[0].captureFaces).not.toHaveBeenCalled()
  })

  it('keeps the modal open and flags an error when a card fails', async () => {
    const pdf = useMissionCardsPdf()
    await pdf.exportPdf([{ captureFaces: async () => { throw new Error('no node') } }], 'full', 'x.pdf')
    expect(pdf.error.value).toBe(true)
    expect(pdf.open.value).toBe(true)
    expect(pdf.packing.value).toBe(false)
    expect(buildMissionCardsPdf).not.toHaveBeenCalled()
  })
})
