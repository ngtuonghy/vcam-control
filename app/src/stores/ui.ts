import { defineStore } from 'pinia';
import { ref, watch, shallowRef } from 'vue';
import { relaunch } from '@tauri-apps/plugin-process';

export const useUiStore = defineStore('ui', () => {
  // Generator panel state
  const isGeneratorOpen = ref<boolean>(false);
  const generatorMode = ref<'quick' | 'asset'>('quick');
  
  // Modals
  const isShortcutsOpen = ref(false);
  const isSettingsOpen = ref(false);

  // Sidebars
  const getStoredSidebarState = (key: string, defaultVal = true) => {
    const val = localStorage.getItem(key);
    return val === null ? defaultVal : val === 'true';
  };

  const isAssetSidebarOpen = ref(getStoredSidebarState('isAssetSidebarOpen', true));
  const isScenesSidebarOpen = ref(getStoredSidebarState('isScenesSidebarOpen', true));
  const isActivityBarOpen = ref(true);

  watch(isAssetSidebarOpen, (val) => {
    localStorage.setItem('isAssetSidebarOpen', String(val));
  });
  
  watch(isScenesSidebarOpen, (val) => {
    localStorage.setItem('isScenesSidebarOpen', String(val));
  });

  // Preview State
  const isPreviewActive = ref(true);
  const previewImage = ref<string | null>(null);

  // Updater State
  const updateState = ref<'idle' | 'checking' | 'downloading' | 'ready'>('idle');
  const updateDownloadProgress = ref(0);
  const readyUpdate = shallowRef<any>(null);

  async function checkAppUpdate(silent = true) {
    if (updateState.value !== 'idle') return null;

    try {
      updateState.value = 'checking';
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      
      if (update) {
        updateState.value = 'downloading';
        updateDownloadProgress.value = 0;
        
        let contentLength = 0;
        let downloaded = 0;
        
        await update.download((event: any) => {
          if (event.event === 'Started') {
            contentLength = event.data.contentLength || 0;
          } else if (event.event === 'Progress') {
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              updateDownloadProgress.value = Math.round((downloaded / contentLength) * 100);
            }
          }
        });
        
        readyUpdate.value = update;
        updateState.value = 'ready';
        return update;
      } else {
        updateState.value = 'idle';
        return null;
      }
    } catch (err) {
      console.error('Auto update error:', err);
      updateState.value = 'idle';
      if (!silent) throw err;
      return null;
    }
  }

  async function installAppUpdate() {
    if (updateState.value === 'ready' && readyUpdate.value) {
      await readyUpdate.value.install();
      await relaunch();
    }
  }

  return {
    isGeneratorOpen,
    generatorMode,
    isShortcutsOpen,
    isSettingsOpen,
    isAssetSidebarOpen,
    isScenesSidebarOpen,
    isActivityBarOpen,
    isPreviewActive,
    previewImage,
    
    updateState,
    updateDownloadProgress,
    readyUpdate,
    checkAppUpdate,
    installAppUpdate
  };
});
