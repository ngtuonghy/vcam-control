<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ShortcutDialog } from '@/components/ui/shortcut-recorder'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { RefreshCw, Settings2, Loader2 } from 'lucide-vue-next'

const { t } = useI18n()

const settingsStore = useSettingsStore()
const uiStore = useUiStore()

async function checkForUpdate() {
  if (uiStore.updateState === 'ready') {
    await uiStore.installAppUpdate()
    return
  }
  
  if (uiStore.updateState === 'idle') {
    const update = await uiStore.checkAppUpdate(false)
    if (!update) {
      alert(t('settings.update_not_available'))
    }
  }
}

const isOpen = computed({
  get: () => uiStore.isSettingsOpen,
  set: (val: boolean) => { uiStore.isSettingsOpen = val }
})

const shortcuts = computed(() => [
  { key: 'moveUpShortcut', label: t('settings.shortcut_keys.moveUp'), title: t('settings.shortcut_keys.moveUp') },
  { key: 'moveDownShortcut', label: t('settings.shortcut_keys.moveDown'), title: t('settings.shortcut_keys.moveDown') },
  { key: 'moveLeftShortcut', label: t('settings.shortcut_keys.moveLeft'), title: t('settings.shortcut_keys.moveLeft') },
  { key: 'moveRightShortcut', label: t('settings.shortcut_keys.moveRight'), title: t('settings.shortcut_keys.moveRight') },
  { key: 'zoomInShortcut', label: t('settings.shortcut_keys.zoomIn'), title: t('settings.shortcut_keys.zoomIn') },
  { key: 'zoomOutShortcut', label: t('settings.shortcut_keys.zoomOut'), title: t('settings.shortcut_keys.zoomOut') },
  { key: 'nextImageShortcut', label: t('settings.shortcut_keys.nextImage'), title: t('settings.shortcut_keys.nextImage') },
  { key: 'prevImageShortcut', label: t('settings.shortcut_keys.prevImage'), title: t('settings.shortcut_keys.prevImage') },
  { key: 'nextSceneShortcut', label: t('settings.shortcut_keys.nextScene'), title: t('settings.shortcut_keys.nextScene') },
  { key: 'prevSceneShortcut', label: t('settings.shortcut_keys.prevScene'), title: t('settings.shortcut_keys.prevScene') },
  { key: 'toggleVcamShortcut', label: t('settings.shortcut_keys.toggleVcam'), title: t('settings.shortcut_keys.toggleVcam') },
  { key: 'generateQrShortcut', label: t('settings.shortcut_keys.generateQr'), title: t('settings.shortcut_keys.generateQr') },
  { key: 'addImageShortcut', label: t('settings.shortcut_keys.addImage'), title: t('settings.shortcut_keys.addImage') },
] as const)

const resolutions = [
  { value: '720p', label: '1280×720' },
  { value: '1080p', label: '1920×1080' },
  { value: '1440p', label: '2560×1440' },
]

const filters = computed(() => [
  { value: 'Nearest', label: t('settings.filters.nearest') },
  { value: 'Triangle', label: t('settings.filters.bilinear') },
  { value: 'Lanczos3', label: t('settings.filters.lanczos') },
])

const fpsOptions = [
  { value: 30, label: '30 FPS' },
  { value: 60, label: '60 FPS' },
]

const languages = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
]

function getAssignedShortcuts(currentKey: string) {
  const map: Record<string, string> = {}
  for (const sc of shortcuts.value) {
    if (sc.key === currentKey) continue
    const val = (settingsStore.settings as any)[sc.key]
    if (val) {
      map[val] = sc.label
    }
  }
  return map
}

function resetShortcuts() {
  settingsStore.settings.moveUpShortcut = 'Alt+Shift+ArrowUp'
  settingsStore.settings.moveDownShortcut = 'Alt+Shift+ArrowDown'
  settingsStore.settings.moveLeftShortcut = 'Alt+Shift+ArrowLeft'
  settingsStore.settings.moveRightShortcut = 'Alt+Shift+ArrowRight'
  settingsStore.settings.zoomInShortcut = 'Alt+Shift+='
  settingsStore.settings.zoomOutShortcut = 'Alt+Shift+-'
  settingsStore.settings.nextImageShortcut = 'Alt+Shift+.'
  settingsStore.settings.prevImageShortcut = 'Alt+Shift+,'
  settingsStore.settings.nextSceneShortcut = 'Alt+Shift+]'
  settingsStore.settings.prevSceneShortcut = 'Alt+Shift+['
  settingsStore.settings.toggleVcamShortcut = 'Alt+Shift+V'
  settingsStore.settings.generateQrShortcut = 'Alt+Shift+Q'
  settingsStore.settings.addImageShortcut = 'Alt+Shift+I'
  settingsStore.saveSettings()
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-[540px] bg-card border-border shadow-2xl text-card-foreground p-0 gap-0 overflow-hidden rounded-xl">
      <DialogHeader class="px-6 pt-6 pb-4">
        <DialogTitle class="text-xl font-semibold text-foreground flex items-center gap-2.5 tracking-tight">
          <Settings2 class="w-5 h-5 text-accent" />
          {{ t('settings.title') }}
        </DialogTitle>
      </DialogHeader>
      
      <div class="overflow-y-auto max-h-[65vh] custom-scrollbar">
        <div class="px-6 pb-6 divide-y divide-border/40">
          
          <!-- General Section -->
          <div class="py-5 space-y-5 first:pt-0">
            <div class="flex items-center justify-between gap-4">
              <Label class="text-sm font-medium text-foreground">{{ t('settings.language') }}</Label>
              <div class="flex bg-secondary/60 rounded-lg p-1 border border-border/30">
                <button 
                  v-for="lang in languages" 
                  :key="lang.value"
                  @click="settingsStore.updateSettings({ language: lang.value as any })"
                  class="px-3.5 py-1.5 text-xs rounded-md transition-all font-medium duration-200"
                  :class="settingsStore.settings.language === lang.value ? 'bg-accent text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                >
                  {{ lang.label }}
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between gap-4">
              <Label class="text-sm font-medium text-foreground">{{ t('settings.app_update') }}</Label>
              <Button 
                size="sm" 
                variant="outline" 
                class="h-8 text-xs bg-background border-border hover:border-accent/40 hover:bg-accent/5 hover:text-accent transition-colors px-4 rounded-lg shadow-sm"
                :class="uiStore.updateState === 'ready' ? 'bg-accent/10 border-accent text-accent hover:bg-accent/20' : ''"
                @click="checkForUpdate"
                :disabled="uiStore.updateState === 'checking' || uiStore.updateState === 'downloading'"
              >
                <Loader2 v-if="uiStore.updateState === 'checking' || uiStore.updateState === 'downloading'" class="w-3.5 h-3.5 mr-2 animate-spin" />
                <RefreshCw v-else class="w-3.5 h-3.5 mr-2" />
                
                <span v-if="uiStore.updateState === 'idle'">{{ t('settings.check_update') }}</span>
                <span v-else-if="uiStore.updateState === 'checking'">{{ t('settings.checking_update') }}</span>
                <span v-else-if="uiStore.updateState === 'downloading'">{{ t('settings.downloading_update') }} ({{ uiStore.updateDownloadProgress }}%)</span>
                <span v-else-if="uiStore.updateState === 'ready'">{{ t('settings.restart_to_update') }}</span>
              </Button>
            </div>
          </div>

          <!-- Quality Settings -->
          <div class="py-6 space-y-5">
            <h3 class="text-base font-semibold text-foreground tracking-tight">{{ t('settings.quality') }}</h3>
            
            <div class="flex items-center justify-between gap-4">
              <Label class="text-sm font-medium text-foreground/80">{{ t('settings.resolution') }}</Label>
              <div class="flex bg-secondary/60 rounded-lg p-1 border border-border/30">
                <button 
                  v-for="res in resolutions" 
                  :key="res.value"
                  @click="settingsStore.settings.renderResolution = res.value as any; settingsStore.saveSettings()"
                  class="px-3 py-1.5 text-xs rounded-md transition-all font-medium duration-200"
                  :class="settingsStore.settings.renderResolution === res.value ? 'bg-accent text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                >
                  {{ res.label }}
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between gap-4">
              <Label class="text-sm font-medium text-foreground/80">{{ t('settings.filter_algorithm') }}</Label>
              <div class="flex bg-secondary/60 rounded-lg p-1 border border-border/30">
                <button 
                  v-for="f in filters" 
                  :key="f.value"
                  @click="settingsStore.settings.filterType = f.value as any; settingsStore.saveSettings()"
                  class="px-3 py-1.5 text-xs rounded-md transition-all font-medium duration-200"
                  :class="settingsStore.settings.filterType === f.value ? 'bg-accent text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                >
                  {{ f.label }}
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between gap-4">
              <Label class="text-sm font-medium text-foreground/80">{{ t('settings.fps') }}</Label>
              <div class="flex bg-secondary/60 rounded-lg p-1 border border-border/30">
                <button 
                  v-for="fps in fpsOptions" 
                  :key="fps.value"
                  @click="settingsStore.settings.fps = fps.value as any; settingsStore.saveSettings()"
                  class="px-4 py-1.5 text-xs rounded-md transition-all font-medium duration-200"
                  :class="settingsStore.settings.fps === fps.value ? 'bg-accent text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                >
                  {{ fps.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Shortcuts -->
          <div class="py-6 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold text-foreground tracking-tight">{{ t('settings.shortcuts') }}</h3>
              <Button variant="ghost" size="sm" class="h-7 text-xs px-3 text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg" @click="resetShortcuts">
                {{ t('settings.reset_default') }}
              </Button>
            </div>
            
            <div class="rounded-xl border border-border/50 overflow-hidden bg-card divide-y divide-border/40 shadow-sm">
              <div 
                v-for="sc in shortcuts" 
                :key="sc.key"
                class="flex items-center justify-between gap-4 py-2.5 px-4 transition-colors"
              >
                <Label class="text-sm font-medium text-foreground/80 cursor-pointer">{{ sc.label }}</Label>
                <div class="w-[180px] flex-shrink-0">
                  <ShortcutDialog 
                    v-model="(settingsStore.settings as any)[sc.key]" 
                    :title="sc.title" 
                    :assigned-shortcuts="getAssignedShortcuts(sc.key)"
                    @save="settingsStore.saveSettings()" 
                  />
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>




