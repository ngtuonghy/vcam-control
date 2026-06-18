<script setup lang="ts">
import { computed } from 'vue'
import { useAssetStore } from '@/stores/assets'
import { Video, VideoOff } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useVcamRendering } from '../composables/useVcamRendering'
import { useBoundingBox } from '../composables/useBoundingBox'

const { t } = useI18n()
const assetStore = useAssetStore()

const activeImage = computed(() => {
  if (assetStore.liveCodeOverride) return assetStore.liveCodeOverride
  const group = assetStore.activeGroup
  if (!group || assetStore.currentImageIndex === -1) return null
  return group.images[assetStore.currentImageIndex]
})

const { canvasRef } = useVcamRendering(activeImage)

const { onMouseDown, boundingBoxStyle } = useBoundingBox(
  activeImage,
  canvasRef
)
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
            v-if="assetStore.isVcamActive" 
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
        @click="assetStore.isVcamActive = !assetStore.isVcamActive"
        class="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold transition-all duration-200"
        :class="assetStore.isVcamActive 
          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25' 
          : 'bg-secondary hover:bg-secondary/80 text-foreground'"
      >
        <component :is="assetStore.isVcamActive ? Video : VideoOff" class="w-3.5 h-3.5" />
        <span>{{ assetStore.isVcamActive ? t('preview.stop_camera') : t('preview.start_camera') }}</span>
      </button>

    </div>
  </div>
</template>


