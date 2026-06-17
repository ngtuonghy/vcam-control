<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSortable } from '@vueuse/integrations/useSortable'
import { useAppStore } from '@/entities/app/model/store'
import { convertFileSrc } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Check, Edit2, Eye, X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { deleteLocalImage } from '@/shared/lib/fs'

const props = defineProps<{
  searchQuery: string
}>()

const appStore = useAppStore()

const filteredImages = computed(() => {
  const group = appStore.activeGroup
  if (!group) return []
  if (!props.searchQuery.trim()) return group.images
  const query = props.searchQuery.toLowerCase().trim()
  return group.images.filter(img => img.name.toLowerCase().includes(query))
})

async function deleteImage(imgId: string) {
  if (confirm("Bạn có chắc muốn xóa ảnh này khỏi danh sách?")) {
    const group = appStore.activeGroup
    if (!group) return
    const imgToDelete = group.images.find(i => i.id === imgId)
    if (imgToDelete) {
      await deleteLocalImage(imgToDelete.path)
    }
    group.images = group.images.filter(i => i.id !== imgId)
    if (appStore.currentImageIndex >= group.images.length) {
      appStore.currentImageIndex = -1
    }
    await appStore.saveData()
  }
}

const renamingImageId = ref('')
const renamingImageName = ref('')

function openRenameDialog(imgId: string, currentName: string) {
  renamingImageId.value = imgId
  renamingImageName.value = currentName
}

async function saveRenameImage() {
  if (renamingImageName.value.trim() && renamingImageId.value) {
    const group = appStore.activeGroup
    if (group) {
      const img = group.images.find(i => i.id === renamingImageId.value)
      if (img) {
        img.name = renamingImageName.value.trim()
        await appStore.saveData()
      }
    }
  }
  renamingImageId.value = ''
}

// --- Drag & Drop (SortableJS via VueUse) ---
const gridRef = ref<HTMLElement | null>(null)

const displayImages = computed(() => {
  const group = appStore.activeGroup
  if (!group) return []
  return props.searchQuery.trim() ? filteredImages.value : group.images
})

const sortableOptions = {
  animation: 200,
  delay: 0,
  delayOnTouchOnly: false,
  fallbackTolerance: 3,
  forceFallback: true,
  fallbackOnBody: true,
  ghostClass: 'opacity-40',
  dragClass: 'scale-95',
  fallbackClass: 'sortable-fallback-custom',
  disabled: !!props.searchQuery.trim(),
  onUpdate: (e: any) => {
    // VueUse automatically mutates the displayImages array (which modifies the store array directly).
    // We only need to update the active index.
    const { oldIndex, newIndex } = e
    if (oldIndex === undefined || newIndex === undefined) return
    
    // Update current image index
    if (appStore.currentImageIndex === oldIndex) {
      appStore.currentImageIndex = newIndex
    } else if (appStore.currentImageIndex > oldIndex && appStore.currentImageIndex <= newIndex) {
      appStore.currentImageIndex--
    } else if (appStore.currentImageIndex < oldIndex && appStore.currentImageIndex >= newIndex) {
      appStore.currentImageIndex++
    }
    
    appStore.saveData()
  }
}

const sortable = useSortable(gridRef, displayImages, sortableOptions as any)

watch(() => props.searchQuery, (newVal) => {
  if (gridRef.value) {
    try {
      sortable.option('disabled', !!newVal.trim())
    } catch(e) {}
  }
})

// --- Image Preview Logic ---
const previewImageIndex = ref<number | null>(null)

const previewImageUrl = computed(() => {
  if (previewImageIndex.value === null) return null
  const img = filteredImages.value[previewImageIndex.value]
  return img ? convertFileSrc(img.path) : null
})

const zoomLevel = ref(1)
const panX = ref(0)
const panY = ref(0)
const isDraggingImage = ref(false)
let dragStartX = 0
let dragStartY = 0

function openPreview(index: number) {
  previewImageIndex.value = index
}

function closePreview() {
  previewImageIndex.value = null
}

function previewNext() {
  if (previewImageIndex.value === null) return
  if (previewImageIndex.value < filteredImages.value.length - 1) {
    previewImageIndex.value++
  }
}

function previewPrev() {
  if (previewImageIndex.value === null) return
  if (previewImageIndex.value > 0) {
    previewImageIndex.value--
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (previewImageIndex.value === null) return
  if (e.key === 'ArrowRight') previewNext()
  if (e.key === 'ArrowLeft') previewPrev()
  if (e.key === 'Escape') closePreview()
}

onMounted(() => window.addEventListener('keydown', handleKeyDown))
onUnmounted(() => window.removeEventListener('keydown', handleKeyDown))

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newZoom = zoomLevel.value + delta * zoomLevel.value
  zoomLevel.value = Math.max(0.1, Math.min(20, newZoom))
}

function startPan(e: MouseEvent) {
  if (e.button !== 0) return
  e.preventDefault()
  isDraggingImage.value = true
  dragStartX = e.clientX - panX.value
  dragStartY = e.clientY - panY.value
}

function onPan(e: MouseEvent) {
  if (!isDraggingImage.value) return
  panX.value = e.clientX - dragStartX
  panY.value = e.clientY - dragStartY
}

function endPan() {
  isDraggingImage.value = false
}

function resetPreview() {
  zoomLevel.value = 1
  panX.value = 0
  panY.value = 0
}
</script>

<template>
  <div class="flex-1 overflow-y-auto overflow-x-hidden p-3 hide-scrollbar">
    <div v-show="appStore.activeGroup" class="content-start">
      <div 
        ref="gridRef"
        class="grid grid-cols-2 gap-2"
      >
        <div 
          v-for="(img, idx) in displayImages" 
          :key="img.id"
          @click="appStore.triggerImage(img.path, idx)"
          class="group relative flex flex-col gap-1.5 select-none cursor-pointer"
        >
          <!-- Image Box -->
          <div 
            class="relative w-full aspect-video rounded-md overflow-hidden border-2 transition-smooth bg-thumbnail-bg"
            :class="[
              appStore.currentImageIndex === idx 
                ? 'border-accent glow-accent-sm' 
                : 'border-border/40 hover:border-border'
            ]"
          >
            <!-- Thumbnail -->
            <img :src="convertFileSrc(img.path)" draggable="false" class="w-full h-full object-contain" />
            
            <!-- Active checkmark -->
            <div v-if="appStore.currentImageIndex === idx" class="absolute top-1.5 right-1.5 w-5 h-5 bg-accent rounded-full flex items-center justify-center shadow-md">
              <Check class="w-3 h-3 text-white" />
            </div>
          </div>

          <!-- Info Row (Below Image) -->
          <div class="flex items-center justify-between px-0.5 h-5">
            <div v-if="renamingImageId === img.id" class="flex items-center gap-1 w-full" @click.stop>
              <Input
                v-model="renamingImageName"
                class="h-5 text-[10px] bg-background border-border/60 py-0 px-1.5 flex-grow min-w-0"
                @blur="saveRenameImage"
                @keyup.enter="saveRenameImage"
                autofocus
              />
              <button @mousedown.prevent="saveRenameImage" class="h-5 w-5 flex items-center justify-center text-accent flex-shrink-0">
                <Check class="w-3 h-3" />
              </button>
            </div>
            <template v-else>
              <span class="text-[10px] text-muted-foreground truncate flex-1 pr-1 font-medium select-none" :title="img.name">{{ img.name }}</span>
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button @click.stop="openPreview(idx)" class="text-muted-foreground hover:text-accent transition-smooth" title="Xem chi tiết">
                  <Eye class="w-3 h-3" />
                </button>
                <button @click.stop="openRenameDialog(img.id, img.name)" class="text-muted-foreground hover:text-foreground transition-smooth" title="Đổi tên">
                  <Edit2 class="w-3 h-3" />
                </button>
                <button @click.stop="deleteImage(img.id)" class="text-muted-foreground hover:text-destructive transition-smooth" title="Xóa">
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!appStore.activeGroup" class="h-full flex items-center justify-center text-xs text-muted-foreground italic">
      Chưa có Scene nào được chọn
    </div>

    <!-- Fullscreen Image Viewer -->
    <Teleport to="body">
      <div 
        v-if="previewImageUrl" 
        class="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center overflow-hidden touch-none"
        @wheel.passive="false"
        @wheel="handleWheel"
        @mousedown="startPan"
        @mousemove="onPan"
        @mouseup="endPan"
        @mouseleave="endPan"
      >
        <!-- Top Toolbar -->
        <div class="absolute top-4 right-4 z-10 flex items-center gap-2 bg-card/80 p-1.5 rounded-lg border border-border shadow-lg" @mousedown.stop>
          <Button variant="ghost" size="icon" class="h-8 w-8 rounded-md" @click="zoomLevel *= 1.2" title="Phóng to">
            <ZoomIn class="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" class="h-8 w-8 rounded-md" @click="zoomLevel /= 1.2" title="Thu nhỏ">
            <ZoomOut class="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" class="h-8 w-8 rounded-md" @click="resetPreview" title="Đặt lại">
            <RotateCcw class="w-4 h-4" />
          </Button>
          <div class="w-px h-5 bg-border mx-1"></div>
          <Button variant="ghost" size="icon" class="h-8 w-8 rounded-md hover:bg-destructive/20 hover:text-destructive" @click="closePreview" title="Đóng (Esc)">
            <X class="w-4 h-4" />
          </Button>
        </div>

        <!-- Navigation Buttons -->
        <Button 
          v-if="previewImageIndex !== null && previewImageIndex > 0"
          variant="ghost" 
          size="icon" 
          class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 text-white hover:bg-black/60 z-20 hover:scale-110 transition-transform"
          @click.stop="previewPrev"
        >
          <ChevronLeft class="w-8 h-8" />
        </Button>
        
        <Button 
          v-if="previewImageIndex !== null && previewImageIndex < filteredImages.length - 1"
          variant="ghost" 
          size="icon" 
          class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 text-white hover:bg-black/60 z-20 hover:scale-110 transition-transform"
          @click.stop="previewNext"
        >
          <ChevronRight class="w-8 h-8" />
        </Button>

        <div class="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
          Lăn chuột để Zoom • Kéo thả để Di chuyển • Phím ⬅ ➡ để Đổi ảnh • Tỷ lệ: {{ Math.round(zoomLevel * 100) }}%
        </div>

        <!-- Thumbnail Strip at bottom -->
        <div 
          class="absolute bottom-0 left-0 right-0 h-24 bg-background/80 backdrop-blur-md border-t border-border/50 flex items-center px-4 gap-2 overflow-x-auto hide-scrollbar z-20"
          @wheel.stop
          @mousedown.stop
        >
          <div 
            v-for="(img, idx) in filteredImages" 
            :key="'thumb-' + img.id"
            @click.stop="openPreview(idx)"
            class="h-16 aspect-video shrink-0 rounded border-2 cursor-pointer transition-all overflow-hidden bg-black/50"
            :class="previewImageIndex === idx ? 'border-accent shadow-md scale-105' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'"
          >
            <img :src="convertFileSrc(img.path)" draggable="false" class="w-full h-full object-contain" :title="img.name" />
          </div>
        </div>

        <!-- Image -->
        <div class="relative w-full h-full flex items-center justify-center">
          <img 
            :src="previewImageUrl" 
            draggable="false"
            class="max-w-none max-h-none select-none"
            :class="{ 'cursor-grab': !isDraggingImage, 'cursor-grabbing': isDraggingImage }"
            :style="{ 
              transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: isDraggingImage ? 'none' : 'transform 0.1s ease-out'
            }" 
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.sortable-fallback-custom {
  @apply opacity-80 shadow-lg;
}
</style>
