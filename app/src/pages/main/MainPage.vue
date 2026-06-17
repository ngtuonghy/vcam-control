<script setup lang="ts">
import { ref, computed } from 'vue'
import HeaderWidget from '@/widgets/Header.vue'
import SidebarWidget from '@/features/vcam/components/Sidebar.vue'
import LivePreviewWidget from '@/features/vcam/components/LivePreview.vue'
import AssetLibraryWidget from '@/features/vcam/components/AssetLibrary.vue'
import SettingsPanelWidget from '@/widgets/SettingsPanel.vue'
import { useAppStore } from '@/entities/app/model/store'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const appStore = useAppStore()
const activeTool = ref('vcam')

const currentResolutionLabel = computed(() => {
  const res = appStore.settings.renderResolution;
  if (res === '720p') return '1280×720';
  if (res === '1080p') return '1920×1080';
  if (res === '1440p') return '2560×1440';
  return res || '1920×1080';
})
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-background text-foreground font-sans">
    <!-- Header with built-in tool switcher -->
    <HeaderWidget 
      :activeTool="activeTool" 
      @update:activeTool="activeTool = $event"
      :scenesOpen="appStore.isScenesSidebarOpen"
      @update:scenesOpen="appStore.isScenesSidebarOpen = $event"
      :assetsOpen="appStore.isAssetSidebarOpen"
      @update:assetsOpen="appStore.isAssetSidebarOpen = $event"
    />
    
    <!-- Main Content -->
    <div class="flex flex-1 overflow-hidden min-h-0">
      <!-- TOOL WORKSPACE -->
      <div v-if="activeTool === 'vcam'" class="flex flex-1 overflow-hidden min-h-0">
        <!-- LEFT: Scenes Sidebar -->
        <SidebarWidget 
          v-show="appStore.isScenesSidebarOpen" 
          class="w-[180px] xl:w-[240px] flex-shrink-0 border-r border-border" 
        />

        <!-- CENTER: Preview Canvas -->
        <main class="flex-1 flex flex-col min-w-0 min-h-0 bg-[hsl(var(--surface))]">
          <LivePreviewWidget class="flex-1" />
        </main>

        <!-- RIGHT: Asset Library Sidebar -->
        <div 
          v-show="appStore.isAssetSidebarOpen" 
          class="w-[220px] xl:w-[300px] flex-shrink-0 border-l border-border bg-card"
        >
          <AssetLibraryWidget />
        </div>
      </div>
      
      <!-- Placeholder for other tools -->
      <div v-else class="flex-1 flex flex-col items-center justify-center gap-4 select-none">
        <span class="text-5xl">🚧</span>
        <p class="text-sm font-medium">{{ t('main.wip') }}</p>
        <p class="text-xs opacity-60">{{ t('main.come_back_later') }}</p>
      </div>
    </div>

    <!-- Status Bar -->
    <footer class="h-8 flex items-center justify-between px-4 bg-card border-t border-border text-xs text-muted-foreground shrink-0 select-none">
      <!-- Left: Scenes info -->
      <div class="flex gap-4">
        <span>{{ t('main.scene') }}: <strong class="text-foreground/80">{{ appStore.activeGroup?.name || '—' }}</strong></span>
        <span v-if="appStore.activeGroup" class="opacity-50">({{ appStore.activeGroup.images.length }} {{ t('main.assets') }})</span>
      </div>
      


      <!-- Right: resolution info -->
      <div class="flex items-center gap-2">
        <span class="opacity-40 font-mono">{{ currentResolutionLabel }}</span>
      </div>
    </footer>

    <!-- Settings Modal -->
    <SettingsPanelWidget />
  </div>
</template>
