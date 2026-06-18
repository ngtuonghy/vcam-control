import { defineStore } from 'pinia';
import { ref, computed, watch, reactive } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { AppData, AppSettings, GroupItem, ImageItem } from '@/shared/types';
import { i18n } from '@/shared/lib/i18n';
import { loadAppData, saveAppData } from '@/shared/lib/storage';
import { shortcutManager } from '@/shared/lib/shortcuts';
import { deleteLocalImage } from '@/shared/lib/fs';

export const useAppStore = defineStore('app', () => {
  const activeGroupId = ref<string | null>(null);
  const groups = ref<GroupItem[]>([]);
  const settings = reactive<AppSettings>({
    language: (localStorage.getItem('language') as 'vi' | 'en') || 'en',
    renderResolution: '1080p',
    filterType: 'Lanczos3',
    fps: 30,
    moveUpShortcut: 'Alt+Shift+ArrowUp',
    moveDownShortcut: 'Alt+Shift+ArrowDown',
    moveLeftShortcut: 'Alt+Shift+ArrowLeft',
    moveRightShortcut: 'Alt+Shift+ArrowRight',
    zoomInShortcut: 'Alt+Shift+=',
    zoomOutShortcut: 'Alt+Shift+-',
    nextImageShortcut: 'Alt+Shift+.',
    prevImageShortcut: 'Alt+Shift+,',
    nextSceneShortcut: 'Alt+Shift+]',
    prevSceneShortcut: 'Alt+Shift+[',
    toggleVcamShortcut: 'Alt+Shift+V',
    generateQrShortcut: 'Alt+Shift+Q',
    addImageShortcut: 'Alt+Shift+I',
  });
  const generatorHistory = ref<ImageItem[]>([]);

  const activeGroup = computed(() => groups.value.find(g => g.id === activeGroupId.value));

  // Current active image index for Next/Prev
  const currentImageIndex = ref<number>(-1);

  // Thêm override cho mã QR
  const liveCodeOverride = ref<ImageItem | null>(null);

  // Live Preview state
  const isPreviewActive = ref(true);

  const isGeneratorOpen = ref<boolean>(false);
  const generatorMode = ref<'quick' | 'asset'>('quick');
  const previewImage = ref<string | null>(null);
  const isShortcutsOpen = ref(false);
  const isSettingsOpen = ref(false);

  // Load sidebar states from localStorage, default to true
  const getStoredSidebarState = (key: string, defaultVal = true) => {
    const val = localStorage.getItem(key)
    return val === null ? defaultVal : val === 'true'
  }

  const isAssetSidebarOpen = ref(getStoredSidebarState('isAssetSidebarOpen', true));
  const isActivityBarOpen = ref(true);
  const isScenesSidebarOpen = ref(getStoredSidebarState('isScenesSidebarOpen', true));

  watch(isAssetSidebarOpen, (val) => {
    localStorage.setItem('isAssetSidebarOpen', String(val))
  })
  watch(isScenesSidebarOpen, (val) => {
    localStorage.setItem('isScenesSidebarOpen', String(val))
  })

  const isDriverRegistered = ref(false);

  async function loadData() {
    const data = await loadAppData();
    activeGroupId.value = data.activeGroupId;
    groups.value = data.groups || [];

    // Khôi phục lại ảnh đang chọn của group hiện tại khi khởi động app
    const currentGroup = groups.value.find(g => g.id === activeGroupId.value);
    if (currentGroup && currentGroup.lastImageIndex !== undefined) {
      currentImageIndex.value = currentGroup.lastImageIndex;
    }

    if (data.generatorHistory) {
      generatorHistory.value = data.generatorHistory;
      if (data.liveCodeOverrideId) {
        const overrideItem = data.generatorHistory.find(item => item.id === data.liveCodeOverrideId);
        if (overrideItem) {
          liveCodeOverride.value = overrideItem;
        }
      }
    }

    if (data.isGeneratorOpen !== undefined) {
      isGeneratorOpen.value = data.isGeneratorOpen;
    }
    if (data.generatorMode !== undefined) {
      generatorMode.value = data.generatorMode;
    }

    if (data.settings) {
      Object.assign(settings, data.settings);
      if (data.settings.language) {
        localStorage.setItem('language', data.settings.language);
        i18n.global.locale.value = data.settings.language;
      }
    }

    // Tự động đăng ký Driver Camera ảo độc lập (softcam.dll) khi khởi chạy
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const res = await invoke('register_standalone_vcam');
      console.log(res);
      isDriverRegistered.value = true;
    } catch (e) {
      console.warn("Đăng ký Camera ảo độc lập ngầm thất bại:", e);
      isDriverRegistered.value = false;
    }

    await syncQualitySettings();
    await syncShortcuts();
  }

  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  async function saveData() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      const data: AppData = {
        activeGroupId: activeGroupId.value,
        groups: groups.value,
        settings: settings,
        generatorHistory: generatorHistory.value,
        liveCodeOverrideId: liveCodeOverride.value?.id || null,
        isGeneratorOpen: isGeneratorOpen.value,
        generatorMode: generatorMode.value
      };
      try {
        await saveAppData(data);
      } catch (e) {
        console.error('Failed to save data', e);
      }
    }, 300); // 300ms debounce để chống lag/khựng khi spam
  }

  async function saveSettings() {
    await saveData();
    await syncQualitySettings();
    await syncShortcuts();
  }

  async function triggerImage(_imagePath: string, index: number) {
    const group = activeGroup.value;
    if (!group) return;

    try {
      currentImageIndex.value = index;
      group.lastImageIndex = index;
      await saveData();
    } catch (e: any) {
      alert("Lỗi khi chuyển ảnh: " + e.toString());
    }
  }

  async function adjustCurrentTransform(action: 'up' | 'down' | 'left' | 'right' | 'zoom_in' | 'zoom_out') {
    const group = activeGroup.value;
    const img = liveCodeOverride.value || (group && currentImageIndex.value !== -1 ? group.images[currentImageIndex.value] : null);

    if (!img) {
      alert("Vui lòng CHỌN 1 ẢNH TRÊN GIAO DIỆN trước khi dùng phím tắt di chuyển/zoom!");
      return;
    }

    try {
      if (!img.transform) return;

      const t = img.transform as any;
      const isBounded = t.boundsType !== 'OBS_BOUNDS_NONE';
      const step = 10;

      if (action === 'up') {
        t.positionY = Number(t.positionY || 0) - step;
      } else if (action === 'down') {
        t.positionY = Number(t.positionY || 0) + step;
      } else if (action === 'left') {
        t.positionX = Number(t.positionX || 0) - step;
      } else if (action === 'right') {
        t.positionX = Number(t.positionX || 0) + step;
      } else if (action === 'zoom_in' || action === 'zoom_out') {
        const zoomStep = 0.05;
        const zoomFactor = action === 'zoom_in' ? (1 + zoomStep) : (1 - zoomStep);

        if (isBounded) {
          const oldW = Number(t.boundsWidth || 1000);
          const oldH = Number(t.boundsHeight || 600);
          const newW = oldW * zoomFactor;
          const newH = oldH * zoomFactor;

          t.boundsWidth = newW;
          t.boundsHeight = newH;
          t.positionX = Number(t.positionX || 0) - (newW - oldW) / 2;
          t.positionY = Number(t.positionY || 0) - (newH - oldH) / 2;
        } else {
          const currentScaleX = Number(t.scaleX ?? 1);
          const currentScaleY = Number(t.scaleY ?? 1);
          const signX = Math.sign(currentScaleX) || 1;
          const signY = Math.sign(currentScaleY) || 1;
          const zoomAmountX = signX * zoomStep * (action === 'zoom_in' ? 1 : -1);
          const zoomAmountY = signY * zoomStep * (action === 'zoom_in' ? 1 : -1);

          t.scaleX = currentScaleX + zoomAmountX;
          t.scaleY = currentScaleY + zoomAmountY;

          const sourceW = Number(t.sourceWidth || 1920);
          const sourceH = Number(t.sourceHeight || 1080);

          t.positionX = Number(t.positionX || 0) - (zoomAmountX * sourceW) / 2;
          t.positionY = Number(t.positionY || 0) - (zoomAmountY * sourceH) / 2;
        }
      }

      await saveData();
    } catch (e) {
      console.error("Lỗi khi điều chỉnh ảnh:", e);
    }
  }

  function handleNextImage() {
    if (liveCodeOverride.value && generatorHistory.value.length > 0) {
      let idx = generatorHistory.value.findIndex(item => item.id === liveCodeOverride.value!.id);
      let nextIdx = idx + 1;
      if (nextIdx >= generatorHistory.value.length) nextIdx = 0;
      setLiveCodeOverride(generatorHistory.value[nextIdx]);
      return;
    }

    const group = activeGroup.value;
    if (!group || group.images.length === 0) return;

    let idx = currentImageIndex.value;
    idx = idx + 1;
    if (idx >= group.images.length) idx = 0;
    currentImageIndex.value = idx;
  }

  function handlePrevImage() {
    if (liveCodeOverride.value && generatorHistory.value.length > 0) {
      let idx = generatorHistory.value.findIndex(item => item.id === liveCodeOverride.value!.id);
      let prevIdx = idx - 1;
      if (prevIdx < 0) prevIdx = generatorHistory.value.length - 1;
      setLiveCodeOverride(generatorHistory.value[prevIdx]);
      return;
    }

    const group = activeGroup.value;
    if (!group || group.images.length === 0) return;

    let idx = currentImageIndex.value;
    idx = idx - 1;
    if (idx < 0) idx = group.images.length - 1;
    currentImageIndex.value = idx;
  }

  function handleNextScene() {
    const inGenerator = isGeneratorOpen.value && generatorMode.value === 'quick';
    let currentIdx = inGenerator ? groups.value.length : groups.value.findIndex(g => g.id === activeGroupId.value);
    
    let nextIdx = currentIdx + 1;
    if (nextIdx > groups.value.length) nextIdx = 0;
    
    if (nextIdx === groups.value.length) {
      isGeneratorOpen.value = true;
      generatorMode.value = 'quick';
      if (generatorHistory.value && generatorHistory.value.length > 0) {
        setLiveCodeOverride(generatorHistory.value[0]);
      }
    } else {
      if (inGenerator || liveCodeOverride.value) {
        clearLiveCodeOverride();
        isGeneratorOpen.value = false;
      }
      if (groups.value.length > 0) {
        setActiveGroup(groups.value[nextIdx].id);
      }
    }
  }

  function handlePrevScene() {
    const inGenerator = isGeneratorOpen.value && generatorMode.value === 'quick';
    let currentIdx = inGenerator ? groups.value.length : groups.value.findIndex(g => g.id === activeGroupId.value);
    
    let prevIdx = currentIdx - 1;
    if (prevIdx < 0) prevIdx = groups.value.length;
    
    if (prevIdx === groups.value.length) {
      isGeneratorOpen.value = true;
      generatorMode.value = 'quick';
      if (generatorHistory.value && generatorHistory.value.length > 0) {
        setLiveCodeOverride(generatorHistory.value[0]);
      }
    } else {
      if (inGenerator || liveCodeOverride.value) {
        clearLiveCodeOverride();
        isGeneratorOpen.value = false;
      }
      if (groups.value.length > 0) {
        setActiveGroup(groups.value[prevIdx].id);
      }
    }
  }

  function togglePreview() {
    // Disabled, user wants it always on
  }

  async function syncShortcuts() {
    await shortcutManager.syncShortcuts([
      { shortcut: settings.nextImageShortcut, callback: () => handleNextImage() },
      { shortcut: settings.prevImageShortcut, callback: () => handlePrevImage() },
      { shortcut: settings.nextSceneShortcut, callback: () => handleNextScene() },
      { shortcut: settings.prevSceneShortcut, callback: () => handlePrevScene() },
      { shortcut: settings.moveUpShortcut, callback: () => adjustCurrentTransform('up') },
      { shortcut: settings.moveDownShortcut, callback: () => adjustCurrentTransform('down') },
      { shortcut: settings.moveLeftShortcut, callback: () => adjustCurrentTransform('left') },
      { shortcut: settings.moveRightShortcut, callback: () => adjustCurrentTransform('right') },
      { shortcut: settings.zoomInShortcut, callback: () => adjustCurrentTransform('zoom_in') },
      { shortcut: settings.zoomOutShortcut, callback: () => adjustCurrentTransform('zoom_out') },
      { shortcut: settings.toggleVcamShortcut, callback: () => toggleVcam() },
      { shortcut: settings.generateQrShortcut, callback: () => window.dispatchEvent(new CustomEvent('trigger-generate-qr')) },
      { shortcut: settings.addImageShortcut, callback: () => window.dispatchEvent(new CustomEvent('trigger-add-image')) },
    ]);
  }

  async function syncQualitySettings() {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('update_quality_settings', {
        resolution: settings.renderResolution || '1080p',
        filterType: settings.filterType || 'Lanczos3',
        fps: settings.fps || 30
      });
    } catch (e) {
      console.error("Lỗi khi đồng bộ chất lượng hình ảnh:", e);
    }
  }

  // Basic mutations
  async function addGroup(name: string) {
    const id = uuidv4();
    groups.value.push({ id, name, images: [] });
    await setActiveGroup(id);
  }

  async function setActiveGroup(id: string) {
    if (activeGroupId.value === id) return;

    // Save current active image to the old group before switching
    const oldGroup = groups.value.find(g => g.id === activeGroupId.value);
    if (oldGroup) {
      oldGroup.lastImageIndex = currentImageIndex.value;
    }

    activeGroupId.value = id;

    // Restore the last active image from the newly selected group
    const newGroup = groups.value.find(g => g.id === id);
    if (newGroup) {
      const lastIdx = newGroup.lastImageIndex !== undefined ? newGroup.lastImageIndex : -1;
      if (lastIdx >= 0 && lastIdx < newGroup.images.length) {
        currentImageIndex.value = lastIdx;
      } else {
        currentImageIndex.value = -1;
        newGroup.lastImageIndex = -1;
      }
    } else {
      currentImageIndex.value = -1;
    }

    await saveData();
  }

  async function deleteGroup(id: string) {
    const groupToDelete = groups.value.find(g => g.id === id);
    if (groupToDelete) {
      for (const img of groupToDelete.images) {
        await deleteLocalImage(img.path);
      }
    }

    groups.value = groups.value.filter(g => g.id !== id);
    if (activeGroupId.value === id) {
      activeGroupId.value = '';
      currentImageIndex.value = -1;
    }
    await saveData();
  }

  watch(
    () => [activeGroupId.value, groups.value, generatorHistory.value, liveCodeOverride.value, isGeneratorOpen.value, generatorMode.value],
    () => {
      saveData();
    },
    { deep: true }
  );

  async function renameGroup(id: string, newName: string) {
    const group = groups.value.find(g => g.id === id);
    if (group) {
      group.name = newName;
      await saveData();
    }
  }

  async function addImage(groupId: string, image: Omit<ImageItem, 'id'>) {
    const group = groups.value.find(g => g.id === groupId);
    if (group) {
      group.images.push({
        ...image,
        id: uuidv4(),
        transform: {
          alignment: 0,
          boundsAlignment: 0,
          boundsHeight: 600,
          boundsType: "OBS_BOUNDS_SCALE_INNER",
          boundsWidth: 1000,
          cropBottom: 0,
          cropLeft: 0,
          cropRight: 0,
          cropTop: 0,
          positionX: 460, // (1920 - 1000) / 2
          positionY: 240, // (1080 - 600) / 2
          rotation: 0,
          scaleX: 1,
          scaleY: 1
        }
      });
      await saveData();
    }
  }

  async function updateSettings(newSettings: Partial<AppSettings>) {
    Object.assign(settings, newSettings);
    if (newSettings.language) {
      localStorage.setItem('language', newSettings.language);
      i18n.global.locale.value = newSettings.language;
    }
    await saveData();
  }

  async function addOrUpdateLiveTemporaryAsset(groupId: string, filePath: string, codeType: string) {
    const group = groups.value.find(g => g.id === groupId);
    if (!group) return;

    const tempName = `[Live] ${codeType}`;
    const existingIndex = group.images.findIndex(img => img.name === tempName);

    if (existingIndex !== -1) {
      group.images[existingIndex].path = filePath;
      currentImageIndex.value = existingIndex;
      group.lastImageIndex = existingIndex;
      await saveData();
    } else {
      const newId = uuidv4();
      group.images.push({
        id: newId,
        name: tempName,
        path: filePath,
        shortcut: '',
        transform: {
          alignment: 0,
          boundsAlignment: 0,
          boundsHeight: 600,
          boundsType: "OBS_BOUNDS_SCALE_INNER",
          boundsWidth: 1000,
          cropBottom: 0,
          cropLeft: 0,
          cropRight: 0,
          cropTop: 0,
          positionX: 460,
          positionY: 240,
          rotation: 0,
          scaleX: 1,
          scaleY: 1
        }
      });
      const newIndex = group.images.length - 1;
      currentImageIndex.value = newIndex;
      group.lastImageIndex = newIndex;
      await saveData();
    }
  }

  const isVcamActive = ref(true);

  function toggleVcam() {
    isVcamActive.value = !isVcamActive.value;
  }

  function setLiveCodeOverride(item: ImageItem) {
    liveCodeOverride.value = item;
  }

  function clearLiveCodeOverride() {
    liveCodeOverride.value = null;
  }

  // Updater State
  const updateState = ref<'idle' | 'checking' | 'downloading' | 'ready'>('idle');
  const updateDownloadProgress = ref(0);
  const readyUpdate = ref<any>(null);

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
    }
  }

  return {
    activeGroupId,
    groups,
    settings,
    generatorHistory,
    activeGroup,
    currentImageIndex,
    liveCodeOverride,
    isDriverRegistered,
    loadData,
    saveData,
    saveSettings,
    addGroup,
    setActiveGroup,
    addImage,
    addOrUpdateLiveTemporaryAsset,
    updateSettings,
    triggerImage,
    adjustCurrentTransform,
    isPreviewActive,
    previewImage,
    isShortcutsOpen,
    isSettingsOpen,
    isGeneratorOpen,
    generatorMode,
    isAssetSidebarOpen,
    isActivityBarOpen,
    isScenesSidebarOpen,
    togglePreview,
    deleteGroup,
    renameGroup,
    isVcamActive,
    toggleVcam,
    setLiveCodeOverride,
    clearLiveCodeOverride,
    
    updateState,
    updateDownloadProgress,
    readyUpdate,
    checkAppUpdate,
    installAppUpdate
  };
});
