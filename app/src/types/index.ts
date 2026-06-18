export interface ImageItem {
  id: string;
  name: string;
  path: string;
  shortcut: string | null;
  transform?: any; // Lưu trữ cấu hình vị trí/kích thước
  generatorType?: string; // Loại mã đã tạo (url, text, wifi, v.v.)
}

export interface GroupItem {
  id: string;
  name: string;
  images: ImageItem[];
  lastImageIndex?: number;
}

export interface AppSettings {
  isDriverRegistered?: boolean;
  language?: 'vi' | 'en';
  renderResolution?: '720p' | '1080p' | '1440p';
  filterType?: 'Nearest' | 'Triangle' | 'Lanczos3';
  fps?: number;
  nextImageShortcut?: string;
  prevImageShortcut?: string;
  moveUpShortcut?: string;
  moveDownShortcut?: string;
  moveLeftShortcut?: string;
  moveRightShortcut?: string;
  zoomInShortcut?: string;
  zoomOutShortcut?: string;
  nextSceneShortcut?: string;
  prevSceneShortcut?: string;
  toggleVcamShortcut?: string;
  generateQrShortcut?: string;
  addImageShortcut?: string;
}

export interface AppData {
  activeGroupId: string | null;
  groups: GroupItem[];
  settings: AppSettings;
  generatorHistory?: ImageItem[];
  liveCodeOverrideId?: string | null;
  isGeneratorOpen?: boolean;
  generatorMode?: 'quick' | 'asset';
}

