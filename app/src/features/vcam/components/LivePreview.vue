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
  <div class="flex-1 min-h-0 bg-preview-bg flex flex-col" style="container-type: size;">
    <!-- Preview Toolbar -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-card shrink-0 select-none">
      <div class="flex items-center gap-3">
        <!-- Live Status -->
        <div class="flex items-center gap-2">
          <div 
            class="w-2 h-2 rounded-full" 
            :class="assetStore.isVcamActive ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-muted-foreground/30'"
          ></div>
          <span class="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
            {{ assetStore.isVcamActive ? t('preview.live') : t('preview.standby') }}
          </span>
        </div>
      </div>

      <!-- Control Button -->
      <button 
        @click="assetStore.isVcamActive = !assetStore.isVcamActive"
        class="flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 outline-none"
        :class="assetStore.isVcamActive 
          ? 'bg-transparent border border-border/50 text-muted-foreground hover:bg-secondary/50' 
          : 'bg-accent text-white shadow-md shadow-accent/20 hover:bg-accent/90 border border-transparent'"
      >
        <component :is="assetStore.isVcamActive ? VideoOff : Video" class="w-3.5 h-3.5" />
        <span>{{ assetStore.isVcamActive ? t('preview.stop_camera') : t('preview.start_camera') }}</span>
      </button>
    </div>

    <!-- 16:9 Preview Viewport Container -->
    <div class="flex-1 w-full min-h-0 flex items-center justify-center p-4">
      <div 
        class="relative bg-black overflow-hidden select-none ring-1 ring-border/20 shadow-2xl rounded"
        style="aspect-ratio: 16/9; max-width: 100%; max-height: 100%; height: 100%;"
        @mousedown="onMouseDown($event, 'move')"
      >
        <!-- Video Stream Canvas -->
        <canvas ref="canvasRef" width="1920" height="1080" class="absolute inset-0 w-full h-full block" />

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
  </div>
</template>


