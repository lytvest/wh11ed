<template>
  <BaseModal
    :title="labels.missionCardsPdfTitle"
    max-width="380px"
    @close="$emit('close')"
  >
    <div class="modal-body">
      <p class="pdf-msg">
        {{ error ? labels.missionCardsPdfError : labels.missionCardsPdfPacking }}
      </p>
      <div
        class="pdf-bar"
        role="progressbar"
        :aria-valuenow="percent"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="labels.missionCardsPdfPacking"
      >
        <div
          class="pdf-bar-fill"
          :style="fillStyle"
        />
      </div>
      <div class="pdf-pct">
        {{ pctLabel }}
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed } from 'vue'
import BaseModal from '../BaseModal.vue'
import { ui } from '../../i18n/ui.js'
import { useLocale } from '../../composables/useLocale.js'

const props = defineProps({
  percent: { type: Number, required: true },
  error: { type: Boolean, default: false },
})
defineEmits(['close'])

const { locale } = useLocale()
const labels = computed(() => ui[locale.value])
const clamped = computed(() => Math.max(0, Math.min(100, props.percent)))
const fillStyle = computed(() => ({ width: `${clamped.value}%` }))
const pctLabel = computed(() => `${Math.round(clamped.value)}%`)
</script>

<style scoped>
.pdf-msg {
  margin: 0 0 0.8rem;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text-primary);
}
.pdf-bar {
  height: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
}
.pdf-bar-fill {
  height: 100%;
  background: var(--accent);
  transition: width var(--motion-fast) linear;
}
.pdf-pct {
  margin-top: 0.45rem;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  text-align: right;
}
</style>
