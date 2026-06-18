<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUiStore } from '@/stores/ui'
import { Button } from '@/components/ui/button'
import { Moon, Sun, Settings, PanelLeft, PanelRight, RefreshCw, Loader2 } from 'lucide-vue-next'

const uiStore = useUiStore()
import pkg from '../../../package.json'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  activeTool: string
  scenesOpen: boolean
  assetsOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'update:activeTool', tool: string): void
  (e: 'update:scenesOpen', val: boolean): void
  (e: 'update:assetsOpen', val: boolean): void
}>()

const isDark = ref(document.documentElement.classList.contains('dark'))
function toggleTheme() {
  const root = document.documentElement
  isDark.value = !isDark.value
  if (isDark.value) {
    root.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    root.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

onMounted(() => {
  // Silent auto check on startup
  setTimeout(() => {
    uiStore.checkAppUpdate(true)
  }, 2000) // Delay slightly to not block initial render
})

</script>

<template>
  <header class="flex items-center justify-between px-5 h-12 border-b border-border bg-card select-none shrink-0 z-30">
    <!-- Left: Brand / Title -->
    <div class="flex items-center gap-2 shrink-0">
      <div class="flex items-center gap-2">
        <img src="/logo.png" class="w-7 h-7 object-contain rounded-md drop-shadow-sm" alt="Logo" />
        <div class="flex flex-col justify-center">
          <h1 class="text-sm font-bold tracking-tight text-foreground leading-none mb-0.5 whitespace-nowrap">{{ t('app.title') }}</h1>
          <span class="text-[9px] text-muted-foreground leading-none whitespace-nowrap">{{ t('app.by') }}</span>
        </div>
      </div>
      <span class="text-[10px] px-1.5 py-0.5 rounded-md bg-accent/10 text-accent font-semibold tracking-wide border border-accent/20 ml-1 whitespace-nowrap">v{{ pkg.version }}</span>
    </div>



    <!-- Right: Global Actions -->
    <div class="flex items-center justify-end gap-2.5 flex-1">
      <!-- Update Indicator -->
      <div v-if="uiStore.updateState === 'ready' || uiStore.updateState === 'downloading'" class="flex items-center mr-1">
        <Button 
          v-if="uiStore.updateState === 'ready'"
          size="sm" 
          variant="outline"
          class="h-7 text-[10px] px-2.5 bg-accent/10 border-accent text-accent hover:bg-accent/20 rounded-full"
          @click="uiStore.installAppUpdate()"
        >
          <RefreshCw class="w-3 h-3 mr-1.5" />
          {{ t('settings.restart_to_update') }}
        </Button>
        <div 
          v-else-if="uiStore.updateState === 'downloading'"
          class="flex items-center h-7 text-[10px] px-2.5 text-muted-foreground rounded-full border border-border bg-secondary/30"
        >
          <Loader2 class="w-3 h-3 mr-1.5 animate-spin" />
          {{ t('settings.downloading_update') }} {{ uiStore.updateDownloadProgress }}%
        </div>
      </div>

      <!-- VS Code Style Sidebar Layout Controls -->
      <div class="flex items-center gap-0.5 mr-1">
        <button
          @click="emit('update:scenesOpen', !props.scenesOpen)"
          class="p-1.5 rounded-md hover:bg-secondary transition-all duration-150 shrink-0"
          :class="props.scenesOpen ? 'text-accent' : 'text-muted-foreground hover:text-foreground'"
          :title="t('header.sidebar_scenes')"
        >
          <PanelLeft class="w-4 h-4" />
        </button>
        <button
          v-if="activeTool === 'vcam'"
          @click="emit('update:assetsOpen', !props.assetsOpen)"
          class="p-1.5 rounded-md hover:bg-secondary transition-all duration-150 shrink-0"
          :class="props.assetsOpen ? 'text-accent' : 'text-muted-foreground hover:text-foreground'"
          :title="t('header.sidebar_assets')"
        >
          <PanelRight class="w-4 h-4" />
        </button>
      </div>

      <div class="h-4 w-px bg-border"></div>

      <!-- Theme Toggle -->
      <Button variant="ghost" size="icon" class="h-8 w-8 rounded-full border border-border" @click="toggleTheme" :title="t('header.theme_toggle')">
        <Sun v-if="!isDark" class="w-4 h-4" />
        <Moon v-else class="w-4 h-4" />
      </Button>
      <!-- App Settings Gear -->
      <Button variant="ghost" size="icon" class="h-8 w-8 rounded-full border border-border" @click="uiStore.isSettingsOpen = true" :title="t('header.settings_tooltip')">
        <Settings class="w-4 h-4" />
      </Button>
    </div>
  </header>
</template>

