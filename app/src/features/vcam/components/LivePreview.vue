<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useAppStore } from '@/entities/app/model/store'
import { convertFileSrc } from '@tauri-apps/api/core'
import { invoke } from '@tauri-apps/api/core'
import { Video, VideoOff } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const appStore = useAppStore()

const activeImage = computed(() => {
  if (appStore.liveCodeOverride) return appStore.liveCodeOverride
  const group = appStore.activeGroup
  if (!group || appStore.currentImageIndex === -1) return null
  return group.images[appStore.currentImageIndex]
})

// Standalone Canvas Rendering & Frame Sender
const canvasRef = ref<HTMLCanvasElement | null>(null)
const activeImageElement = new Image()
activeImageElement.crossOrigin = 'anonymous'
let isImageLoaded = false

activeImageElement.onload = () => {
  isImageLoaded = true
  drawAndSendFrame()
}

function drawAndSendFrame() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // Kích hoạt chống mờ/răng cưa cho ảnh trong ứng dụng
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // 1. Draw black background
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, 1280, 720)

  // 2. Draw active image if loaded
  const img = activeImage.value
  if (img && isImageLoaded) {
    if (img.transform) {
      const s = 1280.0 / 1920.0
      const t = img.transform
      const sw = activeImageElement.naturalWidth || 1920
      const sh = activeImageElement.naturalHeight || 1080
      
      let w = t.boundsWidth || 1000
      let h = t.boundsHeight || 600
      let offsetX = 0
      let offsetY = 0

      if (t.boundsType === 'OBS_BOUNDS_NONE') {
        w = sw * (t.scaleX || 1)
        h = sh * (t.scaleY || 1)
      } else if (!t.boundsType || t.boundsType === 'OBS_BOUNDS_SCALE_INNER' || t.boundsType === 'OBS_BOUNDS_STRETCH') {
        const scale = Math.min(w / sw, h / sh)
        const rw = sw * scale
        const rh = sh * scale
        const diffX = w - rw
        const diffY = h - rh
        const align = t.boundsAlignment || 0
        if ((align & 1) !== 0) {
          offsetX = 0
        } else if ((align & 2) !== 0) {
          offsetX = diffX
        } else {
          offsetX = diffX / 2
        }
        if ((align & 4) !== 0) {
          offsetY = 0
        } else if ((align & 8) !== 0) {
          offsetY = diffY
        } else {
          offsetY = diffY / 2
        }
        w = rw
        h = rh
      } else if (t.boundsType === 'OBS_BOUNDS_SCALE_OUTER') {
        const scale = Math.max(w / sw, h / sh)
        const rw = sw * scale
        const rh = sh * scale
        const diffX = w - rw
        const diffY = h - rh
        const align = t.boundsAlignment || 0
        if ((align & 1) !== 0) {
          offsetX = 0
        } else if ((align & 2) !== 0) {
          offsetX = diffX
        } else {
          offsetX = diffX / 2
        }
        if ((align & 4) !== 0) {
          offsetY = 0
        } else if ((align & 8) !== 0) {
          offsetY = diffY
        } else {
          offsetY = diffY / 2
        }
        w = rw
        h = rh
      } else if (t.boundsType === 'OBS_BOUNDS_SCALE_MAX_ONLY') {
        let scale = 1.0
        if (sw > w || sh > h) {
          scale = Math.min(w / sw, h / sh)
        }
        const rw = sw * scale
        const rh = sh * scale
        const diffX = w - rw
        const diffY = h - rh
        const align = t.boundsAlignment || 0
        if ((align & 1) !== 0) {
          offsetX = 0
        } else if ((align & 2) !== 0) {
          offsetX = diffX
        } else {
          offsetX = diffX / 2
        }
        if ((align & 4) !== 0) {
          offsetY = 0
        } else if ((align & 8) !== 0) {
          offsetY = diffY
        } else {
          offsetY = diffY / 2
        }
        w = rw
        h = rh
      }

      ctx.drawImage(activeImageElement, ((t.positionX || 0) + offsetX) * s, ((t.positionY || 0) + offsetY) * s, w * s, h * s)
    }
  } else if (appStore.activeGroup && appStore.currentImageIndex === -1 && !appStore.liveCodeOverride) {
    ctx.fillStyle = '#555'
    ctx.font = '20px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(t('preview.no_image_selected'), 640, 360)
  } else {
    ctx.fillStyle = '#555'
    ctx.font = '20px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(t('preview.no_scene_selected'), 640, 360)
  }

}

import { appDataDir, join } from '@tauri-apps/api/path'
import { writeFile, mkdir } from '@tauri-apps/plugin-fs'

const offlineImagePath = ref<string | null>(null)

async function createOfflineImage() {
  const canvas = document.createElement('canvas')
  canvas.width = 1920
  canvas.height = 1080
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // 1. Simple Black Background
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, 1920, 1080)
  
  const centerX = 1920 / 2
  const centerY = 1080 / 2

  // 2. Load and Draw Logo
  const logo = new Image()
  logo.src = '/logo.png'
  await new Promise(resolve => {
    logo.onload = resolve
    logo.onerror = resolve
  })

  // Draw logo (compact size 180x180 pixels, centered vertically)
  const logoSize = 180
  ctx.drawImage(logo, centerX - logoSize / 2, centerY - 210, logoSize, logoSize)

  // 3. Main Title
  ctx.fillStyle = '#f8fafc'
  ctx.font = '800 56px "Inter", "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ;(ctx as any).letterSpacing = '10px'
  ctx.fillText('VIRTUAL CAMERA', centerX, centerY + 30)
  
  // 4. Standby Badge
  ctx.fillStyle = '#ef4444'
  ctx.font = '700 26px "Inter", "Segoe UI", sans-serif'
  ;(ctx as any).letterSpacing = '20px'
  ctx.fillText('STANDBY', centerX + 10, centerY + 95) 
  
  // 5. Signature (Moved close to center to prevent cropping)
  ctx.fillStyle = '#94a3b8'
  ctx.font = '700 20px "Inter", "Segoe UI", sans-serif'
  ;(ctx as any).letterSpacing = '4px'
  ctx.fillText('C2W DEV • BY NGTUONGHY', centerX, centerY + 160)
  
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return
  
  const buffer = await blob.arrayBuffer()
  const data = new Uint8Array(buffer)
  
  try {
    const dir = await appDataDir()
    await mkdir(dir, { recursive: true }).catch(() => {})
    const filePath = await join(dir, 'offline.png')
    await writeFile(filePath, data)
    offlineImagePath.value = filePath
    
    // Auto-update if camera is off
    if (!appStore.isVcamActive) {
      updateRustVcamScene()
    }
  } catch(e) {
    console.error("Failed to save offline image", e)
  }
}

function updateRustVcamScene() {
  if (!appStore.isVcamActive) {
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
      })
    } else {
      invoke('update_vcam_scene', {
        imagePath: null,
        transform: null,
      })
    }
    return
  }

  const img = activeImage.value
  if (img) {
    invoke('update_vcam_scene', {
      imagePath: img.path,
      transform: img.transform,
    })
    return
  }
  
  invoke('update_vcam_scene', {
    imagePath: null,
    transform: null,
  })
}

// Watch for changes in isVcamActive
watch(() => appStore.isVcamActive, () => {
  updateRustVcamScene()
})

// Watch for changes in active image to reload src
watch(
  () => activeImage.value?.id,
  (newId) => {
    // Không hiện loading ngay lập tức để tránh chớp đen (flicker)
    // Chỉ hiện nếu việc load ảnh thực sự lâu (> 150ms)
    let loadingTimer = setTimeout(() => {
      isImageLoaded = false
    }, 150);
    
    const img = activeImage.value
    
    if (newId && img && img.path) {
      // Báo ngay cho Rust để load ảnh song song với Vue, giảm độ trễ
      updateRustVcamScene()
      
      activeImageElement.onload = () => {
        clearTimeout(loadingTimer)
        isImageLoaded = true
        
        // Auto-adjust bounding box to exactly match image aspect ratio on first load
        const currentImg = activeImage.value
        if (currentImg && currentImg.transform) {
          // Check if it's using the default bounding box and no source width is set
          if (currentImg.transform.boundsType === 'OBS_BOUNDS_SCALE_INNER' && !currentImg.transform.sourceWidth) {
              const nw = activeImageElement.naturalWidth || 1920
              const nh = activeImageElement.naturalHeight || 1080
              
              img.transform.sourceWidth = nw
              img.transform.sourceHeight = nh
              img.transform.boundsType = 'OBS_BOUNDS_NONE'
              
              // Scale to fit within a nice viewing area (e.g., 1000x600 max)
              const maxW = 1000
              const maxH = 600
              const scale = Math.min(maxW / nw, maxH / nh, 1.0)
              
              img.transform.scaleX = scale
              img.transform.scaleY = scale
              
              // Center it on the 1920x1080 canvas
              img.transform.positionX = (1920 - nw * scale) / 2
              img.transform.positionY = (1080 - nh * scale) / 2
              
              appStore.saveData()
              
              // Cập nhật lại cho Rust nếu transform vừa được khởi tạo
              updateRustVcamScene()
            }
          }
        
        drawAndSendFrame()
      }
      activeImageElement.src = convertFileSrc(img.path)
    } else {
      activeImageElement.removeAttribute('src')
      drawAndSendFrame()
      updateRustVcamScene()
    }
  },
  { immediate: true }
);

// Drag and Resize State
let isDragging = false
let dragType: 'move' | 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br' | null = null
let startMouseX = 0
let startMouseY = 0
let startPosX = 0
let startPosY = 0
let startWidth = 0
let startHeight = 0
let startScaleX = 1
let startScaleY = 1

function onMouseDown(e: MouseEvent, type: typeof dragType) {
  e.preventDefault()
  e.stopPropagation()
  
  const img = activeImage.value
  if (!img || !img.transform) return
  
  const t = img.transform
  
  isDragging = true
  dragType = type
  startMouseX = e.clientX
  startMouseY = e.clientY
  startPosX = t.positionX || 0
  startPosY = t.positionY || 0
  startWidth = t.boundsWidth || 1000
  startHeight = t.boundsHeight || 600
  startScaleX = t.scaleX || 1
  startScaleY = t.scaleY || 1
  
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging || !dragType) return
  
  const img = activeImage.value
  if (!img || !img.transform) return
  
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const scale = 1920 / rect.width
  
  const deltaX = (e.clientX - startMouseX) * scale
  const deltaY = (e.clientY - startMouseY) * scale
  
  const t = img.transform
  const isBounded = t.boundsType !== 'OBS_BOUNDS_NONE'
  
  if (dragType === 'move') {
    t.positionX = startPosX + deltaX
    t.positionY = startPosY + deltaY
  } else if (dragType === 'br') { // Bottom-Right
      if (isBounded) {
        t.boundsWidth = Math.max(50, startWidth + deltaX)
        t.boundsHeight = Math.max(50, startHeight + deltaY)
      } else {
        const sourceW = t.sourceWidth || 1920
        const sourceH = t.sourceHeight || 1080
        if (!e.shiftKey) { // Lock aspect ratio
          const newW = (startScaleX * sourceW) + deltaX
          const newScale = Math.max(0.05, newW / sourceW)
          t.scaleX = newScale
          t.scaleY = newScale
        } else {
          t.scaleX = startScaleX + deltaX / sourceW
          t.scaleY = startScaleY + deltaY / sourceH
        }
      }
    } else if (dragType === 'mr') { // Middle-Right
      if (isBounded) {
        t.boundsWidth = Math.max(50, startWidth + deltaX)
      } else {
        const sourceW = t.sourceWidth || 1920
        t.scaleX = startScaleX + deltaX / sourceW
      }
    } else if (dragType === 'bc') { // Bottom-Center
      if (isBounded) {
        t.boundsHeight = Math.max(50, startHeight + deltaY)
      } else {
        const sourceH = t.sourceHeight || 1080
        t.scaleY = startScaleY + deltaY / sourceH
      }
    } else if (dragType === 'tl') { // Top-Left
      if (isBounded) {
        const newW = Math.max(50, startWidth - deltaX)
        const newH = Math.max(50, startHeight - deltaY)
        t.positionX = startPosX + (startWidth - newW)
        t.positionY = startPosY + (startHeight - newH)
        t.boundsWidth = newW
        t.boundsHeight = newH
      } else {
        const sourceW = t.sourceWidth || 1920
        const sourceH = t.sourceHeight || 1080
        if (!e.shiftKey) { // Lock aspect ratio
          const newW = (startScaleX * sourceW) - deltaX
          const newScale = Math.max(0.05, newW / sourceW)
          t.positionX = startPosX + (startScaleX - newScale) * sourceW
          t.positionY = startPosY + (startScaleY - newScale) * sourceH
          t.scaleX = newScale
          t.scaleY = newScale
        } else {
          const newScaleX = startScaleX - deltaX / sourceW
          const newScaleY = startScaleY - deltaY / sourceH
          t.positionX = startPosX + (startScaleX - newScaleX) * sourceW
          t.positionY = startPosY + (startScaleY - newScaleY) * sourceH
          t.scaleX = newScaleX
          t.scaleY = newScaleY
        }
      }
    } else if (dragType === 'bl') { // Bottom-Left
      if (isBounded) {
        const newW = Math.max(50, startWidth - deltaX)
        t.positionX = startPosX + (startWidth - newW)
        t.boundsWidth = newW
        t.boundsHeight = Math.max(50, startHeight + deltaY)
      } else {
        const sourceW = t.sourceWidth || 1920
        const sourceH = t.sourceHeight || 1080
        if (!e.shiftKey) { // Lock aspect ratio
          const newW = (startScaleX * sourceW) - deltaX
          const newScale = Math.max(0.05, newW / sourceW)
          t.positionX = startPosX + (startScaleX - newScale) * sourceW
          t.scaleX = newScale
          t.scaleY = newScale
        } else {
          const newScaleX = startScaleX - deltaX / sourceW
          t.positionX = startPosX + (startScaleX - newScaleX) * sourceW
          t.scaleX = newScaleX
          t.scaleY = startScaleY + deltaY / sourceH
        }
      }
    } else if (dragType === 'tr') { // Top-Right
      if (isBounded) {
        const newH = Math.max(50, startHeight - deltaY)
        t.positionY = startPosY + (startHeight - newH)
        t.boundsWidth = Math.max(50, startWidth + deltaX)
        t.boundsHeight = newH
      } else {
        const sourceW = t.sourceWidth || 1920
        const sourceH = t.sourceHeight || 1080
        if (!e.shiftKey) { // Lock aspect ratio
          const newW = (startScaleX * sourceW) + deltaX
          const newScale = Math.max(0.05, newW / sourceW)
          t.positionY = startPosY + (startScaleY - newScale) * sourceH
          t.scaleX = newScale
          t.scaleY = newScale
        } else {
          const newScaleY = startScaleY - deltaY / sourceH
          t.positionY = startPosY + (startScaleY - newScaleY) * sourceH
          t.scaleX = startScaleX + deltaX / sourceW
          t.scaleY = newScaleY
        }
      }
    } else if (dragType === 'tc') { // Top-Center
      if (isBounded) {
        const newH = Math.max(50, startHeight - deltaY)
        t.positionY = startPosY + (startHeight - newH)
        t.boundsHeight = newH
      } else {
        const sourceH = t.sourceHeight || 1080
        const newScaleY = startScaleY - deltaY / sourceH
        t.positionY = startPosY + (startScaleY - newScaleY) * sourceH
        t.scaleY = newScaleY
      }
    } else if (dragType === 'ml') { // Middle-Left
      if (isBounded) {
        const newW = Math.max(50, startWidth - deltaX)
        t.positionX = startPosX + (startWidth - newW)
        t.boundsWidth = newW
      } else {
        const sourceW = t.sourceWidth || 1920
        const newScaleX = startScaleX - deltaX / sourceW
        t.positionX = startPosX + (startScaleX - newScaleX) * sourceW
        t.scaleX = newScaleX
      }
    }
  
  // Reactively trigger redraw and sync to Rust
  drawAndSendFrame()
  updateRustVcamScene()
}

function onMouseUp() {
  isDragging = false
  dragType = null
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  
  // Auto save coordinates to disk
  appStore.saveData()
}

// Watch for coordinate / transform changes to redraw
watch(
  () => {
    const img = activeImage.value
    if (!img) return null
    return {
      id: img.id,
      transform: JSON.stringify(img.transform)
    }
  },
  (newVal, oldVal) => {
    // Chỉ cập nhật transform nếu đang ở cùng một ảnh (không phải vừa chuyển ảnh)
    if (!newVal || !oldVal || newVal.id !== oldVal.id) return;
    
    drawAndSendFrame()
    updateRustVcamScene()
  }
)

onMounted(() => {
  createOfflineImage()
  
  // Trigger initial frame once on mount
  drawAndSendFrame()
  updateRustVcamScene()
})

onUnmounted(() => {
  // Reset virtual camera state on unmount
  invoke('update_vcam_scene', {
    imagePath: null,
    transform: null,
  })
})

// Reactive bounding box calculations for the UI outline guides
const boundingBoxStyle = computed(() => {
  const img = activeImage.value
  if (!img || !img.transform) return null

  const t = img.transform
  const canvasW = 1920
  const canvasH = 1080

  let w = 0
  let h = 0

  if (t.boundsType === 'OBS_BOUNDS_NONE') {
    w = (t.sourceWidth || 0) * (t.scaleX || 1)
    h = (t.sourceHeight || 0) * (t.scaleY || 1)
  } else {
    w = t.boundsWidth || 0
    h = t.boundsHeight || 0
  }

  const left = (t.positionX / canvasW) * 100
  const top = (t.positionY / canvasH) * 100
  const width = (w / canvasW) * 100
  const height = (h / canvasH) * 100

  const distTop = Math.round(t.positionY || 0)
  const distLeft = Math.round(t.positionX || 0)
  const distBottom = Math.round(canvasH - ((t.positionY || 0) + h))
  const distRight = Math.round(canvasW - ((t.positionX || 0) + w))

  return {
    box: {
      left: `${left}%`,
      top: `${top}%`,
      width: `${width}%`,
      height: `${height}%`,
    },
    lines: {
      top: {
        left: `${left + width / 2}%`,
        top: `0%`,
        height: `${top}%`,
      },
      bottom: {
        left: `${left + width / 2}%`,
        top: `${top + height}%`,
        height: `${100 - (top + height)}%`,
      },
      left: {
        top: `${top + height / 2}%`,
        left: `0%`,
        width: `${left}%`,
      },
      right: {
        top: `${top + height / 2}%`,
        left: `${left + width}%`,
        width: `${100 - (left + width)}%`,
      },
    },
    distances: {
      top: distTop,
      left: distLeft,
      bottom: distBottom,
      right: distRight,
    }
  }
})
</script>

<template>
  <div class="flex-1 min-h-0 bg-preview-bg p-4 flex flex-col gap-4 items-center justify-between" style="container-type: size;">
    <!-- 16:9 Preview Viewport Container -->
    <div class="flex-1 w-full min-h-0 flex items-center justify-center">
      <div 
        class="relative rounded-lg border border-border/50 bg-black overflow-hidden select-none shadow-[0_0_40px_rgba(0,0,0,0.5)]"
        style="aspect-ratio: 16/9; width: 100%; max-width: calc((100cqh - 64px) * 16 / 9); max-height: 100%;"
      >
        
        <!-- Video Stream Canvas -->
        <canvas ref="canvasRef" width="1280" height="720" class="w-full h-full object-contain" />

        <!-- Floating VCAM Status (Top-Right) -->
        <div class="absolute top-4 right-4 z-30 select-none pointer-events-none">
          <div 
            v-if="appStore.isVcamActive" 
            class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-600/90 text-white text-[10px] font-black tracking-widest uppercase shadow-lg border border-red-500/30 animate-pulse"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
            {{ t('preview.live') }}
          </div>
          <div 
            v-else 
            class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/50 text-white/40 text-[10px] font-black tracking-widest uppercase border border-white/5"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-white/20"></span>
            {{ t('preview.standby') }}
          </div>
        </div>

        <!-- Bounding Box Overlay -->
        <template v-if="activeImage && boundingBoxStyle">
          <!-- Distance Guide Lines -->
          <!-- Top Line -->
          <div 
            class="absolute bg-accent w-[1px] z-10 flex items-center justify-center opacity-60" 
            :style="{ left: boundingBoxStyle.lines.top.left, top: boundingBoxStyle.lines.top.top, height: boundingBoxStyle.lines.top.height }"
          >
            <span class="absolute bg-background/90 text-[10px] text-accent font-mono font-medium px-1.5 py-0.5 rounded whitespace-nowrap z-20 border border-border/30">
              {{ boundingBoxStyle.distances.top }}
            </span>
          </div>

          <!-- Bottom Line -->
          <div 
            class="absolute bg-accent w-[1px] z-10 flex items-center justify-center opacity-60" 
            :style="{ left: boundingBoxStyle.lines.bottom.left, top: boundingBoxStyle.lines.bottom.top, height: boundingBoxStyle.lines.bottom.height }"
          >
            <span class="absolute bg-background/90 text-[10px] text-accent font-mono font-medium px-1.5 py-0.5 rounded whitespace-nowrap z-20 border border-border/30">
              {{ boundingBoxStyle.distances.bottom }}
            </span>
          </div>

          <!-- Left Line -->
          <div 
            class="absolute bg-accent h-[1px] z-10 flex items-center justify-center opacity-60" 
            :style="{ top: boundingBoxStyle.lines.left.top, left: boundingBoxStyle.lines.left.left, width: boundingBoxStyle.lines.left.width }"
          >
            <span class="absolute bg-background/90 text-[10px] text-accent font-mono font-medium px-1.5 py-0.5 rounded whitespace-nowrap z-20 border border-border/30">
              {{ boundingBoxStyle.distances.left }}
            </span>
          </div>

          <!-- Right Line -->
          <div 
            class="absolute bg-accent h-[1px] z-10 flex items-center justify-center opacity-60" 
            :style="{ top: boundingBoxStyle.lines.right.top, left: boundingBoxStyle.lines.right.left, width: boundingBoxStyle.lines.right.width }"
          >
            <span class="absolute bg-background/90 text-[10px] text-accent font-mono font-medium px-1.5 py-0.5 rounded whitespace-nowrap z-20 border border-border/30">
              {{ boundingBoxStyle.distances.right }}
            </span>
          </div>

          <!-- Selection Bounding Box -->
          <div 
            class="absolute border border-accent z-10 cursor-move"
            :style="boundingBoxStyle.box"
            @mousedown="onMouseDown($event, 'move')"
          >
            <!-- Corner & Edge Handles (8 total) -->
            <div class="absolute -top-1 -left-1 w-2.5 h-2.5 bg-accent border border-white/80 cursor-nwse-resize z-20 rounded-[1px]" @mousedown="onMouseDown($event, 'tl')"></div>
            <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-accent border border-white/80 cursor-ns-resize z-20 rounded-[1px]" @mousedown="onMouseDown($event, 'tc')"></div>
            <div class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent border border-white/80 cursor-nesw-resize z-20 rounded-[1px]" @mousedown="onMouseDown($event, 'tr')"></div>
            <div class="absolute top-1/2 -translate-y-1/2 -left-1 w-2.5 h-2.5 bg-accent border border-white/80 cursor-ew-resize z-20 rounded-[1px]" @mousedown="onMouseDown($event, 'ml')"></div>
            <div class="absolute top-1/2 -translate-y-1/2 -right-1 w-2.5 h-2.5 bg-accent border border-white/80 cursor-ew-resize z-20 rounded-[1px]" @mousedown="onMouseDown($event, 'mr')"></div>
            <div class="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-accent border border-white/80 cursor-nesw-resize z-20 rounded-[1px]" @mousedown="onMouseDown($event, 'bl')"></div>
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-accent border border-white/80 cursor-ns-resize z-20 rounded-[1px]" @mousedown="onMouseDown($event, 'bc')"></div>
            <div class="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-accent border border-white/80 cursor-nwse-resize z-20 rounded-[1px]" @mousedown="onMouseDown($event, 'br')"></div>
          </div>
        </template>
      </div>
    </div>

    <!-- Control Bar (Outside, centered at bottom of container) -->
    <div class="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card shadow-lg select-none shrink-0 z-20">
      <!-- Toggle VCAM Button -->
      <button 
        @click="appStore.isVcamActive = !appStore.isVcamActive"
        class="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold transition-all duration-200"
        :class="appStore.isVcamActive 
          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25' 
          : 'bg-secondary hover:bg-secondary/80 text-foreground'"
      >
        <component :is="appStore.isVcamActive ? Video : VideoOff" class="w-3.5 h-3.5" />
        <span>{{ appStore.isVcamActive ? t('preview.stop_camera') : t('preview.start_camera') }}</span>
      </button>

    </div>
  </div>
</template>
