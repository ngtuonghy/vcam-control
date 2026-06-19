import { computed, type Ref } from 'vue';
import type { ImageItem } from '@/types';
import { useAssetStore } from '@/stores/assets';

export function useBoundingBox(
  activeImage: Ref<ImageItem | null>,
  canvasRef: Ref<HTMLCanvasElement | null>,
  onUpdateFrame?: () => void
) {
  const assetStore = useAssetStore();

  let isDragging = false;
  let dragType: 'move' | 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br' | null = null;
  let startMouseX = 0;
  let startMouseY = 0;
  let startPosX = 0;
  let startPosY = 0;
  let startWidth = 0;
  let startHeight = 0;
  let startScaleX = 1;
  let startScaleY = 1;

  function onMouseDown(e: MouseEvent, type: typeof dragType) {
    e.preventDefault();
    e.stopPropagation();
    
    const img = activeImage.value;
    if (!img || !img.transform) return;
    
    const t = img.transform;
    
    isDragging = true;
    dragType = type;
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    startPosX = t.positionX || 0;
    startPosY = t.positionY || 0;
    startWidth = t.boundsWidth || 1000;
    startHeight = t.boundsHeight || 600;
    startScaleX = t.scaleX || 1;
    startScaleY = t.scaleY || 1;
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging || !dragType) return;
    
    const img = activeImage.value;
    if (!img || !img.transform) return;
    
    const canvas = canvasRef.value;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = 1920 / rect.width;
    
    const deltaX = (e.clientX - startMouseX) * scale;
    const deltaY = (e.clientY - startMouseY) * scale;
    
    const t = img.transform as any;
    const isBounded = t.boundsType !== 'OBS_BOUNDS_NONE';
    
    if (dragType === 'move') {
      t.positionX = startPosX + deltaX;
      t.positionY = startPosY + deltaY;
    } else if (dragType === 'br') {
        if (isBounded) {
          t.boundsWidth = Math.max(50, startWidth + deltaX);
          t.boundsHeight = Math.max(50, startHeight + deltaY);
        } else {
          const sourceW = t.sourceWidth || 1920;
          const sourceH = t.sourceHeight || 1080;
          if (!e.shiftKey) {
            const scaleXCandidate = startScaleX + deltaX / sourceW;
            const scaleYCandidate = startScaleY + deltaY / sourceH;
            const newScale = Math.max(0.05, Math.abs(deltaX) > Math.abs(deltaY) ? scaleXCandidate : scaleYCandidate);
            t.scaleX = newScale;
            t.scaleY = newScale;
          } else {
            t.scaleX = startScaleX + deltaX / sourceW;
            t.scaleY = startScaleY + deltaY / sourceH;
          }
        }
      } else if (dragType === 'mr') {
        if (isBounded) {
          t.boundsWidth = Math.max(50, startWidth + deltaX);
        } else {
          const sourceW = t.sourceWidth || 1920;
          t.scaleX = startScaleX + deltaX / sourceW;
        }
      } else if (dragType === 'bc') {
        if (isBounded) {
          t.boundsHeight = Math.max(50, startHeight + deltaY);
        } else {
          const sourceH = t.sourceHeight || 1080;
          t.scaleY = startScaleY + deltaY / sourceH;
        }
      } else if (dragType === 'tl') {
        if (isBounded) {
          const newW = Math.max(50, startWidth - deltaX);
          const newH = Math.max(50, startHeight - deltaY);
          t.positionX = startPosX + (startWidth - newW);
          t.positionY = startPosY + (startHeight - newH);
          t.boundsWidth = newW;
          t.boundsHeight = newH;
        } else {
          const sourceW = t.sourceWidth || 1920;
          const sourceH = t.sourceHeight || 1080;
          if (!e.shiftKey) {
            const scaleXCandidate = startScaleX - deltaX / sourceW;
            const scaleYCandidate = startScaleY - deltaY / sourceH;
            const newScale = Math.max(0.05, Math.abs(deltaX) > Math.abs(deltaY) ? scaleXCandidate : scaleYCandidate);
            t.positionX = startPosX + (startScaleX - newScale) * sourceW;
            t.positionY = startPosY + (startScaleY - newScale) * sourceH;
            t.scaleX = newScale;
            t.scaleY = newScale;
          } else {
            const newScaleX = startScaleX - deltaX / sourceW;
            const newScaleY = startScaleY - deltaY / sourceH;
            t.positionX = startPosX + (startScaleX - newScaleX) * sourceW;
            t.positionY = startPosY + (startScaleY - newScaleY) * sourceH;
            t.scaleX = newScaleX;
            t.scaleY = newScaleY;
          }
        }
      } else if (dragType === 'bl') {
        if (isBounded) {
          const newW = Math.max(50, startWidth - deltaX);
          t.positionX = startPosX + (startWidth - newW);
          t.boundsWidth = newW;
          t.boundsHeight = Math.max(50, startHeight + deltaY);
        } else {
          const sourceW = t.sourceWidth || 1920;
          const sourceH = t.sourceHeight || 1080;
          if (!e.shiftKey) {
            const scaleXCandidate = startScaleX - deltaX / sourceW;
            const scaleYCandidate = startScaleY + deltaY / sourceH;
            const newScale = Math.max(0.05, Math.abs(deltaX) > Math.abs(deltaY) ? scaleXCandidate : scaleYCandidate);
            t.positionX = startPosX + (startScaleX - newScale) * sourceW;
            t.scaleX = newScale;
            t.scaleY = newScale;
          } else {
            const newScaleX = startScaleX - deltaX / sourceW;
            t.positionX = startPosX + (startScaleX - newScaleX) * sourceW;
            t.scaleX = newScaleX;
            t.scaleY = startScaleY + deltaY / sourceH;
          }
        }
      } else if (dragType === 'tr') {
        if (isBounded) {
          const newH = Math.max(50, startHeight - deltaY);
          t.positionY = startPosY + (startHeight - newH);
          t.boundsWidth = Math.max(50, startWidth + deltaX);
          t.boundsHeight = newH;
        } else {
          const sourceW = t.sourceWidth || 1920;
          const sourceH = t.sourceHeight || 1080;
          if (!e.shiftKey) {
            const scaleXCandidate = startScaleX + deltaX / sourceW;
            const scaleYCandidate = startScaleY - deltaY / sourceH;
            const newScale = Math.max(0.05, Math.abs(deltaX) > Math.abs(deltaY) ? scaleXCandidate : scaleYCandidate);
            t.positionY = startPosY + (startScaleY - newScale) * sourceH;
            t.scaleX = newScale;
            t.scaleY = newScale;
          } else {
            const newScaleY = startScaleY - deltaY / sourceH;
            t.positionY = startPosY + (startScaleY - newScaleY) * sourceH;
            t.scaleX = startScaleX + deltaX / sourceW;
            t.scaleY = newScaleY;
          }
        }
      } else if (dragType === 'tc') {
        if (isBounded) {
          const newH = Math.max(50, startHeight - deltaY);
          t.positionY = startPosY + (startHeight - newH);
          t.boundsHeight = newH;
        } else {
          const sourceH = t.sourceHeight || 1080;
          const newScaleY = startScaleY - deltaY / sourceH;
          t.positionY = startPosY + (startScaleY - newScaleY) * sourceH;
          t.scaleY = newScaleY;
        }
      } else if (dragType === 'ml') {
        if (isBounded) {
          const newW = Math.max(50, startWidth - deltaX);
          t.positionX = startPosX + (startWidth - newW);
          t.boundsWidth = newW;
        } else {
          const sourceW = t.sourceWidth || 1920;
          const newScaleX = startScaleX - deltaX / sourceW;
          t.positionX = startPosX + (startScaleX - newScaleX) * sourceW;
          t.scaleX = newScaleX;
        }
      }
    
    onUpdateFrame?.();
  }

  function onMouseUp() {
    isDragging = false;
    dragType = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    assetStore.saveData();
  }

  const boundingBoxStyle = computed(() => {
    const img = activeImage.value;
    if (!img || !img.transform) return null;

    const t = img.transform as any;
    const canvasW = 1920;
    const canvasH = 1080;

    let w = 0;
    let h = 0;

    if (t.boundsType === 'OBS_BOUNDS_NONE') {
      w = (t.sourceWidth || 0) * (t.scaleX || 1);
      h = (t.sourceHeight || 0) * (t.scaleY || 1);
    } else {
      w = t.boundsWidth || 0;
      h = t.boundsHeight || 0;
    }

    const left = (t.positionX / canvasW) * 100;
    const top = (t.positionY / canvasH) * 100;
    const width = (w / canvasW) * 100;
    const height = (h / canvasH) * 100;

    const distTop = Math.round(t.positionY || 0);
    const distLeft = Math.round(t.positionX || 0);
    const distBottom = Math.round(canvasH - ((t.positionY || 0) + h));
    const distRight = Math.round(canvasW - ((t.positionX || 0) + w));

    return {
      box: {
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
      },
      lines: {
        top: { top: 0, left: `${left + width / 2}%`, height: `${top}%` },
        bottom: { top: `${top + height}%`, left: `${left + width / 2}%`, height: `${100 - (top + height)}%` },
        left: { top: `${top + height / 2}%`, left: 0, width: `${left}%` },
        right: { top: `${top + height / 2}%`, left: `${left + width}%`, width: `${100 - (left + width)}%` },
      },
      distances: {
        top: distTop,
        bottom: distBottom,
        left: distLeft,
        right: distRight,
      }
    };
  });

  return {
    onMouseDown,
    boundingBoxStyle
  };
}


