<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <footer class="py-8 sm:py-10 text-center text-sm text-muted-foreground border-t border-border px-4">
    <p>&copy; VCam Control. {{ t('openSourceSoftware') }}</p>
  </footer>
</template>
