import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import type { AppSettings } from '@/types';
import { i18n } from '@/utils/i18n';
import { syncQualitySettings } from '@/utils/ipc';

export const useSettingsStore = defineStore('settings', () => {
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

  const isDriverRegistered = ref(false);

  function saveSettings() {
    window.dispatchEvent(new CustomEvent('save-app-data'));
  }

  function applyLanguage(lang: string) {
    localStorage.setItem('language', lang);
    i18n.global.locale.value = lang as 'vi' | 'en';
  }

  async function updateSettings(newSettings: Partial<AppSettings>) {
    Object.assign(settings, newSettings);
    if (newSettings.language) {
      applyLanguage(newSettings.language);
    }
    await syncQualitySettings(settings.renderResolution || '1080p', settings.filterType || 'Lanczos3', settings.fps || 30);
    saveSettings();
  }

  async function applyQualitySettings() {
    await syncQualitySettings(settings.renderResolution || '1080p', settings.filterType || 'Lanczos3', settings.fps || 30);
  }

  return {
    settings,
    isDriverRegistered,
    applyLanguage,
    updateSettings,
    applyQualitySettings,
    saveSettings
  };
});

