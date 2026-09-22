import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MissionsPrintView from './MissionsPrintView.vue'

const stubs = {
  MissionCardTile: { props: ['mission'], template: '<div class="tile" />' },
  MissionCardsPdfModal: true,
}

describe('MissionsPrintView', () => {
  it('offers a full-page PDF and a marked sheet PDF', () => {
    const w = mount(MissionsPrintView, { global: { stubs } })
    const buttons = w.findAll('.pdf-actions button')
    expect(buttons.map((b) => b.text())).toEqual([
      'Download PDF',
      'Download PDF with marks',
    ])
    expect(buttons.every((b) => !b.attributes('disabled'))).toBe(true)
  })
})
