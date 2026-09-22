import { afterEach, describe, it, expect } from 'vitest'
import { mount, DOMWrapper } from '@vue/test-utils'
import MissionCardsPdfModal from './MissionCardsPdfModal.vue'

const body = () => new DOMWrapper(document.body)
afterEach(() => { document.body.innerHTML = '' })

describe('MissionCardsPdfModal', () => {
  it('says it is packing the cards and shows the percent', () => {
    mount(MissionCardsPdfModal, { props: { percent: 40, error: false } })
    expect(body().text()).toContain('Packing the cards into a PDF')
    expect(body().text()).toContain('40%')
    const bar = body().find('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('40')
    expect(body().find('.pdf-bar-fill').attributes('style')).toContain('width: 40%')
  })

  it('says so when the PDF could not be built', () => {
    mount(MissionCardsPdfModal, { props: { percent: 12, error: true } })
    expect(body().text()).toContain('Could not build the PDF')
  })
})
