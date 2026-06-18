import { getAssetUrl } from '@/utils/fs';
import { ref, watch, onMounted, type Ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { writeFile, mkdir } from '@tauri-apps/plugin-fs';
import { useAssetStore } from '@/stores/assets';
import type { ImageItem } from '@/types';
import { useI18n } from 'vue-i18n';

export function useVcamRendering(activeImage: Ref<ImageItem | null>) {
  const { t } = useI18n();
  const assetStore = useAssetStore();
  
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const activeImageElement = new Image();
  // activeImageElement.crossOrigin = 'anonymous';
  const isImageLoaded = ref(false);
  const offlineImagePath = ref<string | null>(null);

  activeImageElement.onload = () => {
    isImageLoaded.value = true;
    drawAndSendFrame();
  };

  function drawAndSendFrame() {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = activeImage.value;
    // Draw whatever is in activeImageElement. It might be the old image for a split second while loading, which is fine and feels smoother than freezing.
    // if (img && !isImageLoaded.value) return;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1280, 720);
    if (img) {
      if (img.transform) {
        const s = 1280.0 / 1920.0;
        const t = img.transform;
        const sw = activeImageElement.naturalWidth || 1920;
        const sh = activeImageElement.naturalHeight || 1080;
        
        let w = t.boundsWidth || 1000;
        let h = t.boundsHeight || 600;
        let offsetX = 0;
        let offsetY = 0;

        if (t.boundsType === 'OBS_BOUNDS_NONE') {
          w = sw * (t.scaleX || 1);
          h = sh * (t.scaleY || 1);
        } else if (!t.boundsType || t.boundsType === 'OBS_BOUNDS_SCALE_INNER' || t.boundsType === 'OBS_BOUNDS_STRETCH') {
          const scale = Math.min(w / sw, h / sh);
          const rw = sw * scale;
          const rh = sh * scale;
          const diffX = w - rw;
          const diffY = h - rh;
          const align = t.boundsAlignment || 0;
          if ((align & 1) !== 0) offsetX = 0;
          else if ((align & 2) !== 0) offsetX = diffX;
          else offsetX = diffX / 2;
          if ((align & 4) !== 0) offsetY = 0;
          else if ((align & 8) !== 0) offsetY = diffY;
          else offsetY = diffY / 2;
          w = rw;
          h = rh;
        } else if (t.boundsType === 'OBS_BOUNDS_SCALE_OUTER') {
          const scale = Math.max(w / sw, h / sh);
          const rw = sw * scale;
          const rh = sh * scale;
          const diffX = w - rw;
          const diffY = h - rh;
          const align = t.boundsAlignment || 0;
          if ((align & 1) !== 0) offsetX = 0;
          else if ((align & 2) !== 0) offsetX = diffX;
          else offsetX = diffX / 2;
          if ((align & 4) !== 0) offsetY = 0;
          else if ((align & 8) !== 0) offsetY = diffY;
          else offsetY = diffY / 2;
          w = rw;
          h = rh;
        } else if (t.boundsType === 'OBS_BOUNDS_SCALE_MAX_ONLY') {
          let scale = 1.0;
          if (sw > w || sh > h) scale = Math.min(w / sw, h / sh);
          const rw = sw * scale;
          const rh = sh * scale;
          const diffX = w - rw;
          const diffY = h - rh;
          const align = t.boundsAlignment || 0;
          if ((align & 1) !== 0) offsetX = 0;
          else if ((align & 2) !== 0) offsetX = diffX;
          else offsetX = diffX / 2;
          if ((align & 4) !== 0) offsetY = 0;
          else if ((align & 8) !== 0) offsetY = diffY;
          else offsetY = diffY / 2;
          w = rw;
          h = rh;
        }

        ctx.drawImage(activeImageElement, ((t.positionX || 0) + offsetX) * s, ((t.positionY || 0) + offsetY) * s, w * s, h * s);
      }
    } else if (assetStore.activeGroup && assetStore.currentImageIndex === -1 && !assetStore.liveCodeOverride) {
      ctx.fillStyle = '#555';
      ctx.font = '20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('preview.no_image_selected'), 640, 360);
    } else {
      ctx.fillStyle = '#555';
      ctx.font = '20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('preview.no_scene_selected'), 640, 360);
    }
  }

  async function createOfflineImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1920, 1080);
    
    const centerX = 1920 / 2;
    const centerY = 1080 / 2;

    const logo = new Image();
    logo.src = '/logo.png';
    await new Promise(resolve => {
      logo.onload = resolve;
      logo.onerror = resolve;
    });

    const logoSize = 180;
    ctx.drawImage(logo, centerX - logoSize / 2, centerY - 210, logoSize, logoSize);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 56px "Inter", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    (ctx as any).letterSpacing = '10px';
    ctx.fillText('VIRTUAL CAMERA', centerX, centerY + 30);
    
    ctx.fillStyle = '#ef4444';
    ctx.font = '700 26px "Inter", "Segoe UI", sans-serif';
    (ctx as any).letterSpacing = '20px';
    ctx.fillText('STANDBY', centerX + 10, centerY + 95); 
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 20px "Inter", "Segoe UI", sans-serif';
    (ctx as any).letterSpacing = '4px';
    ctx.fillText('C2W DEV • BY NGTUONGHY', centerX, centerY + 160);
    
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;
    
    const buffer = await blob.arrayBuffer();
    const data = new Uint8Array(buffer);
    
    try {
      const dir = await appDataDir();
      await mkdir(dir, { recursive: true }).catch(() => {});
      const filePath = await join(dir, 'offline.png');
      await writeFile(filePath, data);
      offlineImagePath.value = filePath;
      
      if (!assetStore.isVcamActive) {
        updateRustVcamScene();
      }
    } catch(e) {
      console.error("Failed to save offline image", e);
    }
  }

  function updateRustVcamScene() {
    if (!assetStore.isVcamActive) {
      if (offlineImagePath.value) {
        invoke('update_vcam_scene', {
          imagePath: offlineImagePath.value,
          transform: {
            boundsType: 'OBS_BOUNDS_SCALE_INNER',
            boundsAlignment: 0,
            boundsWidth: 1920,
            boundsHeight: 1080,
            positionX: 0,
            positionY: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0
          },
        });
      } else {
        invoke('update_vcam_scene', { imagePath: null, transform: null });
      }
      return;
    }

    const img = activeImage.value;
    if (img) {
      invoke('update_vcam_scene', { imagePath: img.path, transform: img.transform });
      return;
    }
    
    invoke('update_vcam_scene', { imagePath: null, transform: null });
  }

  let currentImagePath = '';
  watch(activeImage, (newImg) => {
    if (newImg && newImg.path) {
      if (currentImagePath !== newImg.path) {
        currentImagePath = newImg.path;
        isImageLoaded.value = false;
        activeImageElement.src = getAssetUrl(newImg.path);
        if (activeImageElement.complete) {
          isImageLoaded.value = true;
          drawAndSendFrame();
        }
      }
    } else {
      currentImagePath = '';
      activeImageElement.src = '';
      isImageLoaded.value = false;
      drawAndSendFrame();
    }
    updateRustVcamScene();
    drawAndSendFrame();
  }, { deep: true });

  watch(() => assetStore.isVcamActive, () => {
    updateRustVcamScene();
  });

  
  
  function startRenderLoop() {
    drawAndSendFrame();
    requestAnimationFrame(startRenderLoop);
  }

  onMounted(() => {
    createOfflineImage();
    startRenderLoop();
  });

  return {
    canvasRef,
    drawAndSendFrame,
    updateRustVcamScene
  };
}





















