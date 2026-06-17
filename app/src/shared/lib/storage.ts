import { load, Store } from '@tauri-apps/plugin-store';
import type { AppData } from '../types';

let store: Store | null = null;

async function getStore() {
  if (!store) {
    store = await load('store.json');
  }
  return store;
}

const DEFAULT_DATA: AppData = {
  activeGroupId: null,
  groups: [],
  settings: {
    language: 'en',
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
  },
};

export async function loadAppData(): Promise<AppData> {
  const s = await getStore();
  const data = await s.get<AppData>('appData');
  if (data) {
    // Merge with defaults in case of new fields
    return {
      ...DEFAULT_DATA,
      ...data,
      settings: {
        ...DEFAULT_DATA.settings,
        ...(data.settings || {})
      }
    };
  }
  await saveAppData(DEFAULT_DATA);
  return DEFAULT_DATA;
}

export async function saveAppData(data: AppData): Promise<void> {
  const s = await getStore();
  await s.set('appData', data);
  await s.save();
}
