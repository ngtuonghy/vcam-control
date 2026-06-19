import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { AppData, GroupItem, ImageItem } from '@/types';
import { loadAppData, saveAppData } from '@/utils/storage';
import { shortcutManager } from '@/utils/shortcuts';
import { deleteLocalImage } from '@/utils/fs';
import { useUiStore } from './ui';
import { useSettingsStore } from './settings';
import { registerVcamAdmin } from '@/utils/ipc';

export const useAssetStore = defineStore('assets', () => {
  const uiStore = useUiStore();
  const settingsStore = useSettingsStore();

  const activeGroupId = ref<string | null>(null);
  const groups = ref<GroupItem[]>([]);
  const generatorHistory = ref<ImageItem[]>([]);
  
  const activeGroup = computed(() => groups.value.find(g => g.id === activeGroupId.value));
  const currentImageIndex = ref<number>(-1);
  const liveCodeOverride = ref<ImageItem | null>(null);

  const isVcamActive = ref(true);

  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  async function loadData() {
    const data = await loadAppData();
    activeGroupId.value = data.activeGroupId;
    groups.value = data.groups || [];

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

    if (data.isGeneratorOpen !== undefined) uiStore.isGeneratorOpen = data.isGeneratorOpen;
    if (data.generatorMode !== undefined) uiStore.generatorMode = data.generatorMode;

    if (data.settings) {
      Object.assign(settingsStore.settings, data.settings);
      if (data.settings.language) {
        settingsStore.applyLanguage(data.settings.language);
      }
    }

    if (!settingsStore.settings.isDriverRegistered) {
      const registeredAdmin = await registerVcamAdmin();
      if (registeredAdmin) {
        settingsStore.updateSettings({ isDriverRegistered: true });
        settingsStore.isDriverRegistered = true;
      } else {
        settingsStore.isDriverRegistered = false;
      }
    } else {
      settingsStore.isDriverRegistered = true;
    }

    await settingsStore.applyQualitySettings();
    await syncShortcuts();
  }

  async function saveData() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      const data: AppData = {
        activeGroupId: activeGroupId.value,
        groups: groups.value,
        settings: settingsStore.settings,
        generatorHistory: generatorHistory.value,
        liveCodeOverrideId: liveCodeOverride.value?.id || null,
        isGeneratorOpen: uiStore.isGeneratorOpen,
        generatorMode: uiStore.generatorMode
      };
      try {
        await saveAppData(data);
      } catch (e) {
        console.error('Failed to save data', e);
      }
    }, 300);
  }

  window.addEventListener('save-app-data', saveData);

  // Auto-save watchers
  watch(
    () => [
      activeGroupId.value, 
      groups.value, 
      generatorHistory.value, 
      liveCodeOverride.value, 
      uiStore.isGeneratorOpen, 
      uiStore.generatorMode
    ],
    () => {
      saveData();
    },
    { deep: true }
  );

  async function triggerImage(_imagePath: string, index: number) {
    const group = activeGroup.value;
    if (!group) return;
    try {
      currentImageIndex.value = index;
      group.lastImageIndex = index;
      await saveData();
    } catch (e: any) {
      alert("Error switching image: " + e.toString());
    }
  }

  async function addGroup(name: string) {
    const id = uuidv4();
    groups.value.push({ id, name, images: [] });
    await setActiveGroup(id);
  }

  async function setActiveGroup(id: string) {
    if (activeGroupId.value === id) return;

    const oldGroup = groups.value.find(g => g.id === activeGroupId.value);
    if (oldGroup) {
      oldGroup.lastImageIndex = currentImageIndex.value;
    }

    activeGroupId.value = id;

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
          boundsHeight: 0,
          boundsType: "OBS_BOUNDS_NONE",
          boundsWidth: 0,
          cropBottom: 0,
          cropLeft: 0,
          cropRight: 0,
          cropTop: 0,
          positionX: 0,
          positionY: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1
        }
      });
      await saveData();
    }
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
          boundsHeight: 0,
          boundsType: "OBS_BOUNDS_NONE",
          boundsWidth: 0,
          cropBottom: 0,
          cropLeft: 0,
          cropRight: 0,
          cropTop: 0,
          positionX: 0,
          positionY: 0,
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

  async function adjustCurrentTransform(action: 'up' | 'down' | 'left' | 'right' | 'zoom_in' | 'zoom_out') {
    const group = activeGroup.value;
    const img = liveCodeOverride.value || (group && currentImageIndex.value !== -1 ? group.images[currentImageIndex.value] : null);

    if (!img) {
      console.warn("No image selected for transform");
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
      console.error("Transform error:", e);
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
    const inGenerator = uiStore.isGeneratorOpen && uiStore.generatorMode === 'quick';
    let currentIdx = inGenerator ? groups.value.length : groups.value.findIndex(g => g.id === activeGroupId.value);
    
    let nextIdx = currentIdx + 1;
    if (nextIdx > groups.value.length) nextIdx = 0;
    
    if (nextIdx === groups.value.length) {
      uiStore.isGeneratorOpen = true;
      uiStore.generatorMode = 'quick';
      if (generatorHistory.value && generatorHistory.value.length > 0) {
        setLiveCodeOverride(generatorHistory.value[0]);
      }
    } else {
      if (inGenerator || liveCodeOverride.value) {
        clearLiveCodeOverride();
        uiStore.isGeneratorOpen = false;
      }
      if (groups.value.length > 0) {
        setActiveGroup(groups.value[nextIdx].id);
      }
    }
  }

  function handlePrevScene() {
    const inGenerator = uiStore.isGeneratorOpen && uiStore.generatorMode === 'quick';
    let currentIdx = inGenerator ? groups.value.length : groups.value.findIndex(g => g.id === activeGroupId.value);
    
    let prevIdx = currentIdx - 1;
    if (prevIdx < 0) prevIdx = groups.value.length;
    
    if (prevIdx === groups.value.length) {
      uiStore.isGeneratorOpen = true;
      uiStore.generatorMode = 'quick';
      if (generatorHistory.value && generatorHistory.value.length > 0) {
        setLiveCodeOverride(generatorHistory.value[0]);
      }
    } else {
      if (inGenerator || liveCodeOverride.value) {
        clearLiveCodeOverride();
        uiStore.isGeneratorOpen = false;
      }
      if (groups.value.length > 0) {
        setActiveGroup(groups.value[prevIdx].id);
      }
    }
  }

  function toggleVcam() {
    isVcamActive.value = !isVcamActive.value;
  }

  function setLiveCodeOverride(item: ImageItem) {
    liveCodeOverride.value = item;
  }

  function clearLiveCodeOverride() {
    liveCodeOverride.value = null;
  }

  async function syncShortcuts() {
    await shortcutManager.syncShortcuts([
      { shortcut: settingsStore.settings.nextImageShortcut, callback: () => handleNextImage() },
      { shortcut: settingsStore.settings.prevImageShortcut, callback: () => handlePrevImage() },
      { shortcut: settingsStore.settings.nextSceneShortcut, callback: () => handleNextScene() },
      { shortcut: settingsStore.settings.prevSceneShortcut, callback: () => handlePrevScene() },
      { shortcut: settingsStore.settings.moveUpShortcut, callback: () => adjustCurrentTransform('up') },
      { shortcut: settingsStore.settings.moveDownShortcut, callback: () => adjustCurrentTransform('down') },
      { shortcut: settingsStore.settings.moveLeftShortcut, callback: () => adjustCurrentTransform('left') },
      { shortcut: settingsStore.settings.moveRightShortcut, callback: () => adjustCurrentTransform('right') },
      { shortcut: settingsStore.settings.zoomInShortcut, callback: () => adjustCurrentTransform('zoom_in') },
      { shortcut: settingsStore.settings.zoomOutShortcut, callback: () => adjustCurrentTransform('zoom_out') },
      { shortcut: settingsStore.settings.toggleVcamShortcut, callback: () => toggleVcam() },
      { shortcut: settingsStore.settings.generateQrShortcut, callback: () => window.dispatchEvent(new CustomEvent('trigger-generate-qr')) },
      { shortcut: settingsStore.settings.addImageShortcut, callback: () => window.dispatchEvent(new CustomEvent('trigger-add-image')) },
    ]);
  }

  return {
    activeGroupId,
    groups,
    generatorHistory,
    activeGroup,
    currentImageIndex,
    liveCodeOverride,
    isVcamActive,
    loadData,
    saveData,
    triggerImage,
    addGroup,
    setActiveGroup,
    deleteGroup,
    renameGroup,
    addImage,
    adjustCurrentTransform,
    toggleVcam,
    setLiveCodeOverride,
    clearLiveCodeOverride,
    addOrUpdateLiveTemporaryAsset,
    syncShortcuts
  };
});



