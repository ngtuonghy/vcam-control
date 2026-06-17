<script setup lang="ts">
import { useAppStore } from '@/entities/app/model/store'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ShortcutDialog } from '@/components/ui/shortcut-recorder'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { check } from '@tauri-apps/plugin-updater'
import { RefreshCw } from 'lucide-vue-next'

const { t } = useI18n()

const appStore = useAppStore()

const isCheckingUpdate = ref(false)

async function checkForUpdate() {
  try {
    isCheckingUpdate.value = true
    const update = await check()
    if (update) {
      if (confirm(t('settings.update_available').replace('{version}', update.version))) {
        await update.downloadAndInstall()
        alert(t('settings.update_installed'))
      }
    } else {
      alert(t('settings.update_not_available'))
    }
  } catch (err) {
    console.error(err)
    alert(t('settings.update_error').replace('{error}', String(err)))
  } finally {
    isCheckingUpdate.value = false
  }
}

const isOpen = computed({
  get: () => appStore.isSettingsOpen,
  set: (val: boolean) => { appStore.isSettingsOpen = val }
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
    const val = (appStore.settings as any)[sc.key]
    if (val) {
      map[val] = sc.label
    }
  }
  return map
}

function resetShortcuts() {
  appStore.settings.moveUpShortcut = 'Alt+Shift+ArrowUp'
  appStore.settings.moveDownShortcut = 'Alt+Shift+ArrowDown'
  appStore.settings.moveLeftShortcut = 'Alt+Shift+ArrowLeft'
  appStore.settings.moveRightShortcut = 'Alt+Shift+ArrowRight'
  appStore.settings.zoomInShortcut = 'Alt+Shift+='
  appStore.settings.zoomOutShortcut = 'Alt+Shift+-'
  appStore.settings.nextImageShortcut = 'Alt+Shift+.'
  appStore.settings.prevImageShortcut = 'Alt+Shift+,'
  appStore.settings.nextSceneShortcut = 'Alt+Shift+]'
  appStore.settings.prevSceneShortcut = 'Alt+Shift+['
  appStore.settings.toggleVcamShortcut = 'Alt+Shift+V'
  appStore.settings.generateQrShortcut = 'Alt+Shift+Q'
  appStore.settings.addImageShortcut = 'Alt+Shift+I'
  appStore.saveSettings()
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-[480px] bg-card border-border text-card-foreground p-0 gap-0">
      <DialogHeader class="px-5 pt-5 pb-3 border-b border-border/50">
        <DialogTitle class="text-sm font-semibold flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-accent"></span>
          {{ t('settings.title') }}
        </DialogTitle>
      </DialogHeader>
      
      <div class="px-5 py-4 space-y-6 max-h-[500px] overflow-y-auto">
        
        <!-- Language Settings -->
        <div class="space-y-4">
          <div class="flex items-center justify-between gap-4">
            <Label class="text-xs text-foreground/80 font-medium">{{ t('settings.language') }}</Label>
            <div class="flex bg-[hsl(var(--surface))] rounded-md border border-border/50 p-0.5">
              <button 
                v-for="lang in languages" 
                :key="lang.value"
                @click="appStore.updateSettings({ language: lang.value as any })"
                class="px-3 py-1 text-[10px] rounded transition-smooth font-medium"
                :class="appStore.settings.language === lang.value ? 'bg-[hsl(var(--accent))] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'"
              >
                {{ lang.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="h-px bg-border/50"></div>

        <!-- App Updates -->
        <div class="space-y-4">
          <div class="flex items-center justify-between gap-4">
            <Label class="text-xs text-foreground/80 font-medium">{{ t('settings.app_update') }}</Label>
            <Button 
              size="sm" 
              variant="outline" 
              class="h-7 text-[10px] bg-secondary/30 border-border hover:border-accent/50 hover:bg-accent/10 hover:text-accent transition-colors px-3"
              @click="checkForUpdate"
              :disabled="isCheckingUpdate"
            >
              <RefreshCw v-if="isCheckingUpdate" class="w-3 h-3 mr-1.5 animate-spin" />
              <RefreshCw v-else class="w-3 h-3 mr-1.5" />
              {{ isCheckingUpdate ? t('settings.checking_update') : t('settings.check_update') }}
            </Button>
          </div>
        </div>

        <div class="h-px bg-border/50"></div>

        <!-- Quality Settings -->
        <div class="space-y-4">
          <h3 class="text-[10px] uppercase tracking-wider text-[hsl(var(--accent))] font-bold">{{ t('settings.quality') }}</h3>
          
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-4">
              <Label class="text-xs text-foreground/80 font-medium">{{ t('settings.resolution') }}</Label>
              <div class="flex bg-[hsl(var(--surface))] rounded-md border border-border/50 p-0.5">
                <button 
                  v-for="res in resolutions" 
                  :key="res.value"
                  @click="appStore.settings.renderResolution = res.value as any; appStore.saveSettings()"
                  class="px-2.5 py-1 text-[10px] rounded transition-smooth font-medium"
                  :class="appStore.settings.renderResolution === res.value ? 'bg-[hsl(var(--accent))] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                >
                  {{ res.label }}
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between gap-4">
              <Label class="text-xs text-foreground/80 font-medium">{{ t('settings.filter_algorithm') }}</Label>
              <div class="flex bg-[hsl(var(--surface))] rounded-md border border-border/50 p-0.5">
                <button 
                  v-for="f in filters" 
                  :key="f.value"
                  @click="appStore.settings.filterType = f.value as any; appStore.saveSettings()"
                  class="px-2.5 py-1 text-[10px] rounded transition-smooth font-medium"
                  :class="appStore.settings.filterType === f.value ? 'bg-[hsl(var(--accent))] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                >
                  {{ f.label }}
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between gap-4">
              <Label class="text-xs text-foreground/80 font-medium">{{ t('settings.fps') }}</Label>
              <div class="flex bg-[hsl(var(--surface))] rounded-md border border-border/50 p-0.5">
                <button 
                  v-for="fps in fpsOptions" 
                  :key="fps.value"
                  @click="appStore.settings.fps = fps.value as any; appStore.saveSettings()"
                  class="px-4 py-1 text-[10px] rounded transition-smooth font-medium"
                  :class="appStore.settings.fps === fps.value ? 'bg-[hsl(var(--accent))] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                >
                  {{ fps.label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="h-px bg-border/50"></div>

        <!-- Shortcuts -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-[10px] uppercase tracking-wider text-accent font-bold">{{ t('settings.shortcuts') }}</h3>
            <Button variant="ghost" size="sm" class="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground hover:bg-surface" @click="resetShortcuts">
              {{ t('settings.reset_default') }}
            </Button>
          </div>
          <div class="space-y-1">
            <div 
              v-for="sc in shortcuts" 
              :key="sc.key"
              class="flex items-center justify-between gap-4 py-1.5 px-2 -mx-2 rounded-md hover:bg-[hsl(var(--surface-hover))] transition-smooth"
            >
              <Label class="text-xs text-foreground/80 font-medium">{{ sc.label }}</Label>
              <div class="w-[180px] flex-shrink-0">
                <ShortcutDialog 
                  v-model="(appStore.settings as any)[sc.key]" 
                  :title="sc.title" 
                  :assigned-shortcuts="getAssignedShortcuts(sc.key)"
                  @save="appStore.saveSettings()" 
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </DialogContent>
  </Dialog>
</template>
